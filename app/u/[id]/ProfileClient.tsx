'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui';
import styles from './ProfileClient.module.css';

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

export default function ProfileClient({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [tab, setTab] = useState<'questions' | 'answers'>('questions');
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);

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
      .select('id, body, is_adopted, like_count, created_at, question_id, questions:question_id(id, title, slug)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setAnswers(data || []); });
  }, [userId]);

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

  return (
    <AppShell active="my" hideSlogan>
      <main className={styles.page}>
        {/* 프로필 헤더 */}
        <header className={styles.header}>
          <div className={styles.bigAvatar} aria-label={name}>
            {profile?.avatar_url
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" />
              : initial}
          </div>
          <div className={styles.headerBody}>
            <h1 className={styles.name}>{name}</h1>
            <div className={styles.statRow}>
              <span><b>{questions.length}</b> 질문</span>
              <span><b>{answers.length}</b> 답변</span>
              <span><b>{adoptedCount}</b> 채택</span>
            </div>
          </div>
        </header>

        {isMe && (
          <p className={styles.meCard}>
            내 프로필이에요. 앞으로 프로필 편집 기능이 생길 거예요!
          </p>
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
