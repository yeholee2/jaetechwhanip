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

type PortfolioRow = { id: string; user_id: string; name: string; is_public: boolean };
type HoldingRow = { id: string; portfolio_id: string; symbol: string; display_symbol: string | null; name: string | null; quantity: number; avg_cost: number; target_weight: number | null };

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
  const [portfolio, setPortfolio] = useState<PortfolioRow | null>(null);
  const [holdings, setHoldings] = useState<HoldingRow[]>([]);
  const [portfolioPending, setPortfolioPending] = useState(false);

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

    // 포트폴리오 (본인 또는 공개) — RLS 가 자동 필터
    supabase.from('portfolios')
      .select('id, user_id, name, is_public')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPortfolio(data as PortfolioRow);
          supabase.from('portfolio_holdings')
            .select('id, portfolio_id, symbol, display_symbol, name, quantity, avg_cost, target_weight')
            .eq('portfolio_id', (data as any).id)
            .then(({ data: hs }) => setHoldings((hs || []) as HoldingRow[]));
        }
      });
  }, [userId]);

  async function togglePortfolioPublic() {
    if (!isMe || !portfolio || portfolioPending) return;
    setPortfolioPending(true);
    const supabase = createClient();
    const next = !portfolio.is_public;
    const { error } = await supabase
      .from('portfolios')
      .update({ is_public: next })
      .eq('id', portfolio.id);
    if (!error) setPortfolio({ ...portfolio, is_public: next });
    setPortfolioPending(false);
  }

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

        {/* 본문(좌) + 포트폴리오 카드(우) 그리드 */}
        <div className={styles.bodyGrid}>
          <div className={styles.bodyLeft}>
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
                        {q.is_answered && <Badge tone="success">채택됨</Badge>}
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
                        {a.is_adopted && <p className={styles.adoptedHint}>채택된 답변</p>}
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
          </div>

          {/* 우측 sticky 포트폴리오 카드 */}
          <aside className={styles.sidePanel}>
            <PortfolioCard
              portfolio={portfolio}
              holdings={holdings}
              isMe={isMe}
              pending={portfolioPending}
              onToggle={togglePortfolioPublic}
            />
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyIcon} aria-hidden />
      <p className={styles.emptyMsg}>{msg}</p>
    </div>
  );
}

// 색 팔레트 — 비중 시각화용
const PALETTE = ['#3182f6', '#00a86b', '#fe9800', '#f66570', '#7e57c2', '#4593fc', '#ffa927', '#1b64da'];

function PortfolioCard({
  portfolio,
  holdings,
  isMe,
  pending,
  onToggle,
}: {
  portfolio: PortfolioRow | null;
  holdings: HoldingRow[];
  isMe: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  // 비공개 + 본인 아닌 경우 → 잠긴 카드만
  if (!portfolio) {
    return (
      <div className={styles.portfolioCard}>
        <div className={styles.portfolioHead}>
          <strong>포트폴리오</strong>
        </div>
        <p className={styles.portfolioEmptyMsg}>
          {isMe ? '아직 포트폴리오가 없어요. 마이페이지에서 종목을 추가하세요.' : '공개된 포트폴리오가 없어요.'}
        </p>
      </div>
    );
  }

  if (!portfolio.is_public && !isMe) {
    return (
      <div className={styles.portfolioCard}>
        <div className={styles.portfolioHead}>
          <strong>포트폴리오</strong>
          <span className={styles.portfolioLockChip}>비공개</span>
        </div>
        <p className={styles.portfolioEmptyMsg}>크리에이터가 포트폴리오를 비공개로 설정했어요.</p>
      </div>
    );
  }

  // cost basis 기반 비중 — 시세 fetch 없이 빠른 표시
  const enriched = holdings.map(h => ({
    ...h,
    cost: (h.quantity || 0) * (h.avg_cost || 0),
  }));
  const totalCost = enriched.reduce((s, h) => s + h.cost, 0);
  const sorted = enriched
    .filter(h => h.cost > 0)
    .sort((a, b) => b.cost - a.cost);
  const withPct = sorted.map((h, i) => ({
    ...h,
    pct: totalCost > 0 ? (h.cost / totalCost) * 100 : 0,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div className={styles.portfolioCard}>
      <div className={styles.portfolioHead}>
        <strong>포트폴리오</strong>
        {isMe ? (
          <button
            type="button"
            onClick={onToggle}
            disabled={pending}
            className={`${styles.portfolioToggle} ${portfolio.is_public ? styles.portfolioToggleOn : ''}`}
            title={portfolio.is_public ? '클릭하면 비공개로 전환' : '클릭하면 공개로 전환'}
          >
            {portfolio.is_public ? '공개 중' : '비공개'}
          </button>
        ) : (
          portfolio.is_public ? <span className={styles.portfolioPubChip}>공개</span> : <span className={styles.portfolioLockChip}>비공개</span>
        )}
      </div>

      {withPct.length === 0 ? (
        <p className={styles.portfolioEmptyMsg}>
          {isMe ? '추가된 종목이 없어요.' : '종목 정보가 없어요.'}
        </p>
      ) : (
        <>
          {/* 비중 bar (가로 누적) */}
          <div className={styles.portfolioBar} aria-hidden>
            {withPct.slice(0, 8).map(h => (
              <span key={h.id} style={{ width: `${h.pct}%`, background: h.color }} />
            ))}
          </div>

          {/* 종목 리스트 */}
          <ul className={styles.portfolioList}>
            {withPct.slice(0, 6).map(h => (
              <li key={h.id} className={styles.portfolioItem}>
                <span className={styles.portfolioDot} style={{ background: h.color }} aria-hidden />
                <span className={styles.portfolioSymbol}>{h.display_symbol || h.symbol}</span>
                <span className={styles.portfolioName}>{h.name || ''}</span>
                <span className={styles.portfolioPct}>{h.pct.toFixed(1)}%</span>
              </li>
            ))}
          </ul>

          {withPct.length > 6 && (
            <p className={styles.portfolioMore}>외 {withPct.length - 6}종</p>
          )}
        </>
      )}
    </div>
  );
}
