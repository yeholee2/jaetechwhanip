'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui';
import styles from './ProfileClient.module.css';

const AVATAR_EMOJIS = [
  '🐯','🐰','🦊','🐻','🦋','🐸','🐼','🦁','🐨','🐮','🐷','🐙',
  '🦄','🐧','🐥','🦉','🐺','🦝','🐹','🐭','🐱','🐶','🐴','🦊',
  '🌊','🔥','⭐','🌙','☀️','🌈','🍀','🎯',
];

function ft(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function providerLabel(p: string): string {
  const m: Record<string, string> = { google: 'Google', kakao: 'Kakao', naver: 'Naver', apple: 'Apple' };
  return m[p] || p;
}

export default function ProfileClient({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [tab, setTab] = useState<'questions' | 'answers'>('questions');
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);
  const [totalLikesReceived, setTotalLikesReceived] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [savingEmoji, setSavingEmoji] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id === userId) setIsMe(true);
    });

    supabase.from('users').select('*').eq('id', userId).single()
      .then(({ data }) => { if (data) setProfile(data); });

    supabase.from('questions')
      .select('id, title, slug, category, answer_count, is_answered, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setQuestions(data || []); setLoading(false); });

    supabase.from('answers')
      .select('id, body, is_adopted, like_count, cheer_count, created_at, question_id, questions:question_id(id, title, slug)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const list = data || [];
        setAnswers(list);
        const total = list.reduce((sum: number, a: any) => sum + (a.like_count || 0), 0);
        setTotalLikesReceived(total);
      });
  }, [userId]);

  async function saveEmoji(emoji: string) {
    if (!hasSupabase()) return;
    setSavingEmoji(true);
    const supabase = createClient();
    await supabase.from('users').update({ avatar_url: emoji }).eq('id', userId);
    setProfile((p: any) => ({ ...p, avatar_url: emoji }));
    setShowEmojiPicker(false);
    setSavingEmoji(false);
  }

  if (loading) {
    return (
      <AppShell active="my">
        <div className={styles.loading}>
          <span className={styles.spinner} aria-label="로딩 중" />
        </div>
      </AppShell>
    );
  }

  const name = profile?.name || '익명';
  const initial = name[0]?.toUpperCase() || 'U';
  const adoptedCount = answers.filter(a => a.is_adopted).length;
  const avatarEmoji = profile?.avatar_url && profile.avatar_url.length <= 4 ? profile.avatar_url : null;

  const isAvatarUrl = profile?.avatar_url && /^https?:\/\//.test(profile.avatar_url);
  const totalAnswers = profile?.answer_count || answers.length;
  const totalAdopted = profile?.accepted_count || adoptedCount;

  return (
    <AppShell active="my" hideSlogan>
      <main className={styles.page}>
        {/* 프로필 헤더 — a-ha 톤: 좌(인용카드 + bio) + 우(큰 아바타 + 이름) */}
        <header className={styles.heroGrid}>
          {/* 좌: 자기소개 인용카드 */}
          <div className={styles.quoteCard}>
            <span className={styles.quoteMark} aria-hidden>“</span>
            <h2 className={styles.quoteTitle}>
              {profile?.bio ? profile.bio : `${name}님의 프로필`}
            </h2>
            <div className={styles.verifyRow}>
              <span className={styles.verifyChip}>실명 인증</span>
              {profile?.provider && profile.provider !== 'email' && (
                <span className={styles.verifyChip}>{providerLabel(profile.provider)} 연동</span>
              )}
            </div>
          </div>

          {/* 우: 큰 아바타 카드 */}
          <div className={styles.avatarCard}>
            <div className={styles.avatarWrap}>
              {isAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={name} className={styles.bigPhoto} />
              ) : (
                <div className={`${styles.bigAvatar} tf`} aria-label={name}>
                  {avatarEmoji || initial}
                </div>
              )}
              {isMe && (
                <button
                  className={styles.avatarEditBtn}
                  onClick={() => setShowEmojiPicker(v => !v)}
                  title="아바타 변경"
                  type="button"
                >편집</button>
              )}
            </div>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{name}</h1>
            </div>
            {profile?.email && (
              <p className={styles.emailLine}>{profile.email}</p>
            )}
          </div>
        </header>

        {/* 통계 카드 4종 */}
        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>작성한 답변</span>
            <span className={styles.statNum}>{totalAnswers.toLocaleString()}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>채택된 답변</span>
            <span className={styles.statNum}>{totalAdopted.toLocaleString()}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>작성한 질문</span>
            <span className={styles.statNum}>{questions.length.toLocaleString()}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>받은 추천</span>
            <span className={styles.statNum}>{totalLikesReceived.toLocaleString()}</span>
          </div>
        </section>

        {isMe && showEmojiPicker && (
          <div className={styles.emojiPicker}>
            <p className={styles.emojiPickerLabel}>아바타 선택</p>
            <div className={styles.emojiGrid}>
              {AVATAR_EMOJIS.map(em => (
                <button
                  key={em}
                  className={`${styles.emojiBtn} tf ${avatarEmoji === em ? styles.emojiBtnActive : ''}`}
                  onClick={() => saveEmoji(em)}
                  disabled={savingEmoji}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className={styles.tabs} role="tablist">
          {(['questions', 'answers'] as const).map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
              type="button"
            >
              {t === 'questions' ? `질문 ${questions.length}` : `답변 ${answers.length}`}
            </button>
          ))}
        </div>

        {/* 목록 */}
        <div className={styles.list}>
          {tab === 'questions' ? (
            questions.length === 0
              ? <Empty msg="아직 질문이 없어요" />
              : questions.map(q => (
                <Link key={q.id} href={`/q/${q.slug || q.id}`} className={styles.itemCard}>
                  <div className={styles.itemBadges}>
                    <Badge tone="neutral">{q.category}</Badge>
                    {q.is_answered && <Badge tone="success">✅ 채택됨</Badge>}
                  </div>
                  <p className={styles.itemTitle}>{q.title}</p>
                  <div className={styles.itemMeta}>
                    <span><MessageCircle size={12} />{q.answer_count || 0}개 답변</span>
                    <span>·</span>
                    <span>{ft(q.created_at)}</span>
                  </div>
                </Link>
              ))
          ) : (
            answers.length === 0
              ? <Empty msg="아직 답변이 없어요" />
              : answers.map(a => {
                const questionPath = a.questions?.slug || a.questions?.id || a.question_id;
                return (
                  <Link key={a.id} href={`/q/${questionPath}`} className={styles.itemCard}>
                    {a.is_adopted && <p className={styles.adoptedHint}>✅ 채택된 답변</p>}
                    <p className={styles.itemAnswerCue}>→ {a.questions?.title || '질문'}</p>
                    <p className={styles.itemAnswerBody}>{a.body}</p>
                    <div className={styles.itemMeta}>
                      <span><ThumbsUp size={12} />{a.like_count || 0}</span>
                      <span>·</span>
                      <span>{ft(a.created_at)}</span>
                    </div>
                  </Link>
                );
              })
          )}
        </div>
      </main>
    </AppShell>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className={styles.empty}>
      <div className={`${styles.emptyEmoji} tf`}>📭</div>
      <p className={styles.emptyMsg}>{msg}</p>
    </div>
  );
}
