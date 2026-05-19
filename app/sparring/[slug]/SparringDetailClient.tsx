'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import Countdown from '@/components/sparring/Countdown';
import { FaIcon } from '@/components/FaIcon';
import { createComment, getCurrentUserVote, getSideLabel, getSidePolarity, sparringPath, vote, type Sparring, type SparringComment, type SparringSide } from '@/lib/sparring';
import { RelatedContent } from '@/components/RelatedContent';
import { EtfCompareCard } from '@/components/sparring/EtfCompareCard';
import { ShareButtons } from '@/components/sparring/ShareButtons';
import { SITE_URL } from '@/lib/seo';
import { getEtfByCode, type EtfInfo } from '@/lib/etfs';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './SparringDetail.module.css';

type SortMode = 'latest' | 'side';

function formatNumber(value: number) {
  return value.toLocaleString('ko-KR');
}

function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

function displayName(userId: string) {
  if (userId === 'local-preview-user') return '나';
  const tail = userId.replace(/-/g, '').slice(-4).toUpperCase();
  return `한입회원 ${tail || '0000'}`;
}

export default function SparringDetailClient({
  sparring,
  initialComments,
  otherActive,
  usingFallback,
  mentionedEtfs = [],
}: {
  sparring: Sparring;
  initialComments: SparringComment[];
  otherActive: Sparring[];
  usingFallback: boolean;
  mentionedEtfs?: EtfInfo[];
}) {
  const router = useRouter();
  const supabaseReady = hasSupabase();
  const localPreview = usingFallback && !supabaseReady;
  const [userId, setUserId] = useState<string | null>(localPreview ? 'local-preview-user' : null);
  const [selectedVote, setSelectedVote] = useState<SparringSide | null>(null);
  const [comments, setComments] = useState(initialComments);
  const [stats, setStats] = useState(sparring.stats);
  const [memoOpen, setMemoOpen] = useState(Boolean(sparring.body));
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [mineOnly, setMineOnly] = useState(false);
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const detailPath = sparringPath(sparring.slug);

  useEffect(() => {
    if (!supabaseReady) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });

    getCurrentUserVote(sparring.id).then(side => {
      if (side) setSelectedVote(side);
    });
  }, [sparring.id, supabaseReady]);

  const resultVisible = selectedVote || sparring.status !== 'active';
  const total = stats.votes_total || stats.votes_a + stats.votes_b;
  const percentA = percent(stats.votes_a, total);
  const percentB = Math.max(0, 100 - percentA);

  const renderedComments = useMemo(() => {
    const base = mineOnly && userId
      ? comments.filter(comment => comment.user_id === userId)
      : comments;

    if (sortMode === 'side') {
      return [...base].sort((a, b) => {
        if (a.side !== b.side) return a.side === 'a' ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    return [...base].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments, mineOnly, sortMode, userId]);

  const handleVote = async (side: SparringSide) => {
    if (!userId) {
      router.push(`/auth?next=${encodeURIComponent(detailPath)}`);
      return;
    }
    if (selectedVote || sparring.status !== 'active') return;

    setPending(true);
    try {
      if (!localPreview) await vote(sparring.id, side);
      setSelectedVote(side);
      setStats(prev => ({
        ...prev,
        votes_a: prev.votes_a + (side === 'a' ? 1 : 0),
        votes_b: prev.votes_b + (side === 'b' ? 1 : 0),
        votes_total: prev.votes_total + 1,
      }));
    } finally {
      setPending(false);
    }
  };

  const handleComment = async () => {
    const text = body.trim();
    if (!text || !selectedVote || !userId) return;

    setPending(true);
    try {
      const next = localPreview
        ? {
            id: `local-${Date.now()}`,
            sparring_id: sparring.id,
            user_id: userId,
            side: selectedVote,
            body: text,
            like_count: 0,
            dislike_count: 0,
            created_at: new Date().toISOString(),
          }
        : await createComment(sparring.id, selectedVote, text);

      setComments(prev => [next, ...prev]);
      setStats(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
      setBody('');
    } finally {
      setPending(false);
    }
  };

  const renderChoice = (side: SparringSide) => {
    const polarity = getSidePolarity(sparring, side);
    const isSelected = selectedVote === side;
    const label = getSideLabel(sparring, side);

    return (
      <button
        className={`${styles.choice} ${polarity === 'positive' ? styles.positive : styles.negative} ${isSelected ? styles.selected : ''}`}
        type="button"
        disabled={Boolean(selectedVote) || pending || sparring.status !== 'active'}
        onClick={() => handleVote(side)}
        aria-label={`${side === 'a' ? 'A' : 'B'} 의견: ${label}`}
      >
        <p className={styles.choiceText}>{label}</p>
        <span className={styles.choicePill}>{isSelected ? '완료' : '선택'}</span>
      </button>
    );
  };

  let lastGroup: SparringSide | null = null;

  return (
    <main className={styles.detailPage}>
      <div className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.breadcrumb}>스파링 · {sparring.category}</div>
          <div className={styles.round}>{sparring.round_number} 라운드</div>
          <h1 className={styles.title}>{sparring.title}</h1>
          <div className={styles.choiceGrid}>
            {renderChoice('a')}
            {renderChoice('b')}
          </div>

          <div className={styles.statCard}>
            <div className={styles.statTop}>
              <span><FaIcon name="fire" size={20} /> {formatNumber(total)}명 투표 중!</span>
            </div>
            <div className={styles.countdownLabel}>남은 투표 시간</div>
            <div className={styles.countdownValue}><Countdown deadlineAt={sparring.deadline_at} /></div>
          </div>

          <div className={styles.memoCard}>
            <div className={styles.memoHead}>
              <span>재테크한입에서 설정한 주제</span>
              <button type="button" onClick={() => setMemoOpen(open => !open)}>설명 보기</button>
            </div>
            {memoOpen && <p className={styles.memoBody}>{sparring.body || '이번 라운드는 댓글을 통해 실제 판단 근거를 모으기 위해 열렸어요.'}</p>}
          </div>

          {/* 공유 — 카카오톡·X·스레드·링크 */}
          <ShareButtons
            url={`${SITE_URL}${detailPath}`}
            title={sparring.title}
            text={`A. ${sparring.side_a_label} vs B. ${sparring.side_b_label} — 너의 의견은?`}
          />
        </section>

        {/* Figma 실측: hero 밖 별도 통계 카드 */}
        <section className={styles.resultCard} aria-label="투표 결과 통계">
          <div className={styles.resultCardTitle}>
            {resultVisible ? '투표 결과' : '내가 선택한 의견의 비율'}
          </div>
          <div className={styles.resultCardSub}>전체 통계</div>
          {resultVisible ? (
            <div className={styles.resultChart} aria-label="투표 결과">
              <div
                className={styles.donut}
                style={{
                  background: `conic-gradient(var(--rw-blue70) 0 ${percentA}%, var(--rw-red50) ${percentA}% 100%)`,
                }}
                role="img"
                aria-label={`${sparring.side_a_label} ${percentA}% / ${sparring.side_b_label} ${percentB}%`}
              >
                <div className={styles.donutHole}>
                  <strong>{percentA >= percentB ? percentA : percentB}%</strong>
                  <span>{percentA >= percentB ? sparring.side_a_label : sparring.side_b_label}</span>
                </div>
              </div>
              <div className={styles.barLabels}>
                <span className={styles.labelA}>● {sparring.side_a_label} {percentA}%</span>
                <span className={styles.labelB}>● {sparring.side_b_label} {percentB}%</span>
              </div>
            </div>
          ) : (
            <div className={styles.resultLocked} aria-label="투표 결과 잠김">
              <div className={styles.donutPlaceholder}>
                <div className={styles.donutLockText}>
                  <strong>투표하면 결과를 볼 수 있어요</strong>
                  <span>의견을 선택해 보세요</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {(sparring.etf_a_code || sparring.etf_b_code) && (
          <EtfCompareCard
            etfA={getEtfByCode(sparring.etf_a_code || undefined)}
            etfB={getEtfByCode(sparring.etf_b_code || undefined)}
            sideALabel={sparring.side_a_label}
            sideBLabel={sparring.side_b_label}
          />
        )}

        <section aria-label="토론">
          <div className={styles.commentsHead}>
            <h2>전체 토론 {formatNumber(stats.comment_count)}</h2>
            <div className={styles.commentFilters}>
              <button
                className={sortMode === 'side' ? styles.filterOn : ''}
                type="button"
                onClick={() => setSortMode(sortMode === 'side' ? 'latest' : 'side')}
              >
                투표 항목별 <FaIcon name="chevron-down" size={12} />
              </button>
              <button
                className={mineOnly ? styles.filterOn : ''}
                type="button"
                onClick={() => setMineOnly(value => !value)}
              >
                내가 남긴 댓글
              </button>
            </div>
          </div>

          <div className={styles.composer}>
            {!userId ? (
              <div className={styles.lock}>
                <span><FaIcon name="lock" size={15} /> 로그인하고 참여하면 투표와 댓글을 남길 수 있어요.</span>
                <button className={styles.loginCta} type="button" onClick={() => router.push(`/auth?next=${encodeURIComponent(detailPath)}`)}>로그인하고 참여하기</button>
              </div>
            ) : !selectedVote ? (
              <div className={styles.lock}>
                <span><FaIcon name="lock" size={15} /> 투표 후 의견 작성 가능</span>
                <span>먼저 위에서 한쪽을 선택해 주세요.</span>
              </div>
            ) : (
              <>
                <textarea
                  value={body}
                  onChange={event => setBody(event.target.value)}
                  placeholder={`${getSideLabel(sparring, selectedVote)} 의견으로 댓글을 남겨보세요`}
                />
                <div className={styles.composerActions}>
                  <span>{getSideLabel(sparring, selectedVote)} 입장으로 표시돼요</span>
                  <button type="button" disabled={pending || !body.trim()} onClick={handleComment}>댓글 쓰기</button>
                </div>
              </>
            )}
          </div>

          <div className={styles.commentList}>
            {renderedComments.length === 0 && <p className={styles.empty}>아직 표시할 댓글이 없어요.</p>}
            {renderedComments.map(comment => {
              const groupChanged = sortMode === 'side' && lastGroup !== comment.side;
              if (groupChanged) lastGroup = comment.side;
              const polarity = getSidePolarity(sparring, comment.side);

              return (
                <div key={comment.id}>
                  {groupChanged && <div className={styles.groupDivider}>{getSideLabel(sparring, comment.side)} 의견</div>}
                  <article className={styles.comment}>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentUser}>{displayName(comment.user_id)}</span>
                      <span>{timeAgo(comment.created_at)}</span>
                    </div>
                    <span className={`${styles.badge} ${polarity === 'positive' ? styles.positive : styles.negative}`}>
                      <FaIcon name="circle-check" size={12} /> {getSideLabel(sparring, comment.side)}
                    </span>
                    <p>{comment.body}</p>
                    <div className={styles.commentActions}>
                      <span>좋아요 {comment.like_count}</span>
                      <span>아쉬워요 {comment.dislike_count}</span>
                      <span><FaIcon name="message" size={12} /> 답글</span>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className={styles.sidebar} aria-label="다른 스파링">
        <Link href="/sparring" className={styles.homeLink}>스파링 홈 &gt;</Link>
        {otherActive.map(item => {
          const totalVotes = item.stats.votes_total || (item.stats.votes_a + item.stats.votes_b);
          const aPct = totalVotes > 0 ? Math.round((item.stats.votes_a / totalVotes) * 100) : 0;
          const bPct = totalVotes > 0 ? 100 - aPct : 0;
          const leadingSide = aPct >= bPct ? 'a' : 'b';
          const leadingLabel = leadingSide === 'a' ? item.side_a_label : item.side_b_label;
          const leadingPct = leadingSide === 'a' ? aPct : bPct;
          const isActive = item.status === 'active';
          return (
            <Link key={item.id} href={sparringPath(item.slug)} className={styles.sideCard}>
              <span className={styles.sideCardRound}>
                {item.round_number}라운드
                {!isActive && <span className={styles.sideCardEnded}>· 종료</span>}
              </span>
              <strong className={styles.sideCardTitle}>{item.title}</strong>
              {totalVotes > 0 && (
                <div className={styles.sideCardStats}>
                  <div className={styles.sideCardStatCol}>
                    <span>투표 수</span>
                    <strong>{formatNumber(totalVotes)}표</strong>
                  </div>
                  <div className={styles.sideCardStatCol}>
                    <span>토론 수</span>
                    <strong>{formatNumber(item.stats.comment_count || 0)}개</strong>
                  </div>
                </div>
              )}
              {totalVotes > 0 && (
                <em className={`${styles.sideCardLeader} ${leadingSide === 'a' ? styles.sideCardLeaderA : styles.sideCardLeaderB}`}>
                  {leadingLabel} {leadingPct}%
                </em>
              )}
              {totalVotes === 0 && (
                <em className={styles.sideCardEmpty}>아직 투표 없음</em>
              )}
            </Link>
          );
        })}

        {mentionedEtfs.length > 0 && (
          <RelatedContent heading="이 스파링과 관련된 ETF" etfs={mentionedEtfs} />
        )}
      </aside>
    </main>
  );
}
