'use client';

/**
 * 크리에이터 공개 프로필 — Fanding · 네이버 프리미엄 톤.
 *
 * 구조:
 *  1. 풀폭 커버 배너 (300px)
 *  2. 프로필 카드 (커버 위 overlap) — 아바타·이름·인증·소개·통계·CTA
 *  3. 탭 — 글 / 소개 / 멤버십
 *  4. 메인: 탭별 콘텐츠
 *  5. 사이드: 멤버십 카드 (sticky)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import type { Creator, CreatorPost } from '@/lib/creator';
import { type CreatorStats, activityBadge, summarize } from '@/lib/creatorStatsTypes';
import { getCategoryLabelFromTopic } from '@/lib/categories';
import styles from './CreatorPage.module.css';

type Tab = 'home' | 'membership' | 'posts' | 'series' | 'info';

function coverStyle(c: any): React.CSSProperties {
  if (c.cover_url) return { backgroundImage: `url(${c.cover_url})` };
  if (c.coverGradient) return { background: c.coverGradient };
  // 차분한 그레이 베이스 — AI 데모 같은 색감 제거
  return { background: 'linear-gradient(180deg, #f2f4f6 0%, #e5e8eb 100%)' };
}

function displayTopics(topics: string[]) {
  const seen = new Set<string>();
  return topics
    .map(getCategoryLabelFromTopic)
    .filter(topic => {
      if (seen.has(topic)) return false;
      seen.add(topic);
      return true;
    });
}

export function CreatorPageClient({
  creator,
  posts,
  stats,
  similar = [],
  isOwner,
}: {
  creator: Creator & { verified?: boolean; credential?: string; coverGradient?: string; badge?: string };
  posts: CreatorPost[];
  stats: CreatorStats;
  similar?: Creator[];
  isOwner: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(creator.follower_count);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState<Tab>('home');
  const visibleTopics = displayTopics(creator.topics || []);

  useEffect(() => {
    if (!hasSupabase()) return;

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('creator_follows')
        .select('creator_id')
        .eq('creator_id', creator.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsFollowing(!!data);
    });
  }, [creator.id]);

  const toggleFollow = async () => {
    if (!userId) {
      window.location.href = `/auth?next=/creator/${creator.slug}`;
      return;
    }
    if (pending) return;
    setPending(true);
    try {
      const supabase = createClient();
      if (isFollowing) {
        const { error } = await supabase
          .from('creator_follows')
          .delete()
          .eq('creator_id', creator.id)
          .eq('user_id', userId);
        if (error) { alert(error.message); return; }
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        setToast('팔로우 취소했어요');
      } else {
        const { error } = await supabase
          .from('creator_follows')
          .insert({ creator_id: creator.id, user_id: userId });
        if (error) { alert(error.message); return; }
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
        setToast(`✓ ${creator.display_name} 팔로우 완료`);
      }
    } finally {
      setPending(false);
      setTimeout(() => setToast(''), 2400);
    }
  };

  const subscribe = () => {
    if (!creator.membership_enabled) {
      setToast('곧 멤버십이 오픈돼요');
      setTimeout(() => setToast(''), 2400);
      return;
    }
    window.location.href = `/creator/${creator.slug}/subscribe`;
  };
  const viewMembership = () => setTab('membership');

  const perks = (creator.membership_perks || '').split('\n').map(p => p.trim()).filter(Boolean);
  const actBadge = activityBadge(stats);
  const actLines = summarize(stats);

  return (
    <div className={styles.wrap}>
      {/* 풀폭 커버 배너 */}
      <div className={styles.cover} style={coverStyle(creator)} aria-hidden>
        <div className={styles.coverOverlay} />
      </div>

      {/* 프로필 헤더 — 커버 위 overlap */}
      <header className={styles.profileHead}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            {creator.avatar_url && creator.avatar_url.length <= 4 ? (
              <span>{creator.avatar_url}</span>
            ) : creator.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatar_url} alt={creator.display_name} />
            ) : (
              <span>{creator.display_name.slice(0, 1)}</span>
            )}
          </div>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.nameRow}>
            <h1>{creator.display_name}</h1>
            {creator.verified && (
              <span className={styles.verifiedBadge} title={creator.credential || '전문가 인증'}>
                ✓ 전문가
              </span>
            )}
            {creator.badge && !creator.verified && (
              <span className={styles.normalBadge}>{creator.badge}</span>
            )}
            {actBadge && (
              <span className={`${styles.activityBadge} ${styles[`act_${actBadge.tone}`]}`}>
                {actBadge.label}
              </span>
            )}
          </div>
          {creator.credential && (
            <p className={styles.credential}>{creator.credential}</p>
          )}
          {creator.bio && <p className={styles.bio}>{creator.bio}</p>}
          {visibleTopics.length > 0 && (
            <div className={styles.topics}>
              {visibleTopics.map(t => (
                <span key={t} className={styles.topicChip}>#{t}</span>
              ))}
            </div>
          )}
          <div className={styles.stats}>
            <span><strong>{followerCount.toLocaleString()}</strong> 팔로워</span>
            <span><strong>{creator.member_count.toLocaleString()}</strong> 멤버</span>
            <span><strong>{creator.post_count.toLocaleString()}</strong> 글</span>
          </div>
        </div>

        <div className={styles.actions}>
          {isOwner ? (
            <>
              <Link href={`/creator/${creator.slug}/write`} className={styles.btnPrimary}>
                글 작성
              </Link>
              <Link href={`/creator/${creator.slug}/dashboard`} className={styles.btnSecondary}>
                대시보드
              </Link>
              <Link href={`/creator/${creator.slug}/templates`} className={styles.btnSecondary}>
                템플릿
              </Link>
              <Link href={`/creator/${creator.slug}/edit`} className={styles.btnSecondary}>
                편집
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleFollow}
                disabled={pending}
                className={isFollowing ? styles.btnSecondary : styles.btnPrimary}
              >
                {isFollowing ? '✓ 팔로잉' : '+ 팔로우'}
              </button>
              {creator.membership_enabled && (
                <button type="button" onClick={viewMembership} className={styles.btnSubscribe}>
                  멤버십 보기
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {/* 탭 */}
      <nav className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'home' ? styles.tabOn : ''}`}
          onClick={() => setTab('home')}
        >
          홈
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'membership' ? styles.tabOn : ''}`}
          onClick={() => setTab('membership')}
        >
          멤버십
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'posts' ? styles.tabOn : ''}`}
          onClick={() => setTab('posts')}
        >
          글 <span>{posts.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'series' ? styles.tabOn : ''}`}
          onClick={() => setTab('series')}
        >
          시리즈
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'info' ? styles.tabOn : ''}`}
          onClick={() => setTab('info')}
        >
          안내
        </button>
      </nav>

      {/* 메인 + 사이드 */}
      <div className={styles.layout}>
        <div className={styles.main}>
          {tab === 'home' && (
            <HomeTab
              creator={creator}
              posts={posts}
              stats={stats}
              perks={perks}
              isOwner={isOwner}
              onSubscribe={viewMembership}
            />
          )}
          {tab === 'membership' && (
            <MembershipTab creator={creator} perks={perks} onSubscribe={subscribe} />
          )}
          {tab === 'posts' && (
            <PostsTab posts={posts} slug={creator.slug} isOwner={isOwner} />
          )}
          {tab === 'series' && (
            <SeriesTab slug={creator.slug} isOwner={isOwner} />
          )}
          {tab === 'info' && (
            <AboutTab creator={creator} />
          )}
        </div>

        <aside className={styles.side}>
          {creator.membership_enabled && tab !== 'membership' && (
            <div className={styles.sideMembership}>
              <span className={styles.sideEyebrow}>🌟 멤버십</span>
              <strong className={styles.sidePrice}>멤버십 혜택</strong>
              <span className={styles.sideTier}>{creator.membership_tier_name}</span>
              {actLines.length > 0 && (
                <div className={styles.sideActivity}>
                  {actLines.map((line, i) => <div key={i}>· {line}</div>)}
                </div>
              )}
              {perks.length > 0 && (
                <ul className={styles.sidePerks}>
                  {perks.slice(0, 4).map((p, i) => <li key={i}>✓ {p}</li>)}
                </ul>
              )}
              <button type="button" onClick={viewMembership} className={styles.sideCta}>
                혜택 보기
              </button>
            </div>
          )}

          <div className={styles.sideAbout}>
            <span className={styles.sideEyebrow}>소개</span>
            {creator.bio && <p>{creator.bio}</p>}
            {creator.channel_url && (
              <Link
                href={creator.channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.sideChannel}
              >
                외부 채널 →
              </Link>
            )}
          </div>

          {similar.length > 0 && (
            <div className={styles.sideSimilar}>
              <span className={styles.sideEyebrow}>이 채널 보는 사람이 본 채널</span>
              <ul>
                {similar.map(s => (
                  <li key={s.id}>
                    <Link href={`/creator/${s.slug}`} className={styles.similarItem}>
                      <div className={styles.similarAvatar}>
                        {s.avatar_url && s.avatar_url.length <= 4 ? (
                          <span>{s.avatar_url}</span>
                        ) : s.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.avatar_url} alt="" />
                        ) : (
                          <span>{s.display_name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className={styles.similarBody}>
                        <strong>{s.display_name}</strong>
                        <span>{s.follower_count.toLocaleString()} 팔로워</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

// ── 홈 탭 ──
function HomeTab({
  creator,
  posts,
  stats,
  perks,
  isOwner,
  onSubscribe,
}: {
  creator: Creator;
  posts: CreatorPost[];
  stats: CreatorStats;
  perks: string[];
  isOwner: boolean;
  onSubscribe: () => void;
}) {
  const actLines = summarize(stats);
  const latestPosts = posts.slice(0, 3);

  return (
    <div className={styles.homeBlock}>
      {isOwner && <OwnerLaunchPanel creator={creator} />}

      <section className={styles.homeSection}>
        <div className={styles.homeSectionHead}>
          <div>
            <span>채널 홈</span>
            <h2>{creator.display_name}의 재프콘</h2>
          </div>
          {creator.membership_enabled && (
            <button type="button" onClick={onSubscribe} className={styles.homeJoinBtn}>
              멤버십 보기
            </button>
          )}
        </div>
        <p className={styles.homeBio}>{creator.bio || '소개가 준비 중이에요.'}</p>
        <div className={styles.homeSignals}>
          <div><strong>{creator.post_count.toLocaleString()}</strong><span>누적 글</span></div>
          <div><strong>{creator.member_count.toLocaleString()}</strong><span>멤버</span></div>
          <div><strong>{creator.follower_count.toLocaleString()}</strong><span>팔로워</span></div>
        </div>
        {actLines.length > 0 && (
          <div className={styles.homeActivity}>
            {actLines.map((line, i) => <span key={i}>{line}</span>)}
          </div>
        )}
      </section>

      <section className={styles.homeSection}>
        <div className={styles.homeSectionHead}>
          <div>
            <span>최신 콘텐츠</span>
            <h2>최근 발행 글</h2>
          </div>
          {posts.length > 3 && <span className={styles.textTabButton}>글 {posts.length}개</span>}
        </div>
        {latestPosts.length === 0 ? (
          <div className={styles.inlineEmpty}>
            <strong>아직 발행된 글이 없어요</strong>
            <span>{isOwner ? '첫 글을 올리면 홈에 자동으로 노출돼요.' : '첫 콘텐츠가 올라오면 이곳에 표시됩니다.'}</span>
          </div>
        ) : (
          <ul className={styles.homePostList}>
            {latestPosts.map(p => (
              <li key={p.id}>
                <Link href={`/creator/${creator.slug}/posts/${p.slug}`} className={styles.homePost}>
                  <strong>{p.title}</strong>
                  <span>{new Date(p.published_at).toLocaleDateString('ko-KR')}</span>
                  {p.preview && <p>{p.preview}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creator.membership_enabled && (
        <section className={styles.homeSection}>
          <div className={styles.homeSectionHead}>
            <div>
              <span>멤버십</span>
              <h2>{creator.membership_tier_name || '월간 멤버십'}</h2>
            </div>
          </div>
          {perks.length > 0 && (
            <div className={styles.homePerks}>
              {perks.slice(0, 4).map((p, i) => <span key={i}>{p}</span>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function OwnerLaunchPanel({ creator }: { creator: Creator }) {
  const checklist = [
    {
      label: '기본 정보',
      hint: '닉네임·소개·주제 정리',
      href: `/creator/${creator.slug}/edit`,
      done: Boolean(creator.bio && creator.topics?.length),
    },
    {
      label: '프로필 이미지',
      hint: '아바타 또는 커버 등록',
      href: `/creator/${creator.slug}/edit`,
      done: Boolean(creator.avatar_url || creator.cover_url),
    },
    {
      label: '멤버십 상품',
      hint: '혜택과 운영 방식 입력',
      href: `/creator/${creator.slug}/edit`,
      done: Boolean(creator.membership_enabled && creator.membership_perks),
    },
    {
      label: '첫 글 발행',
      hint: '공개 글 또는 멤버 전용 글',
      href: `/creator/${creator.slug}/write`,
      done: creator.post_count > 0,
    },
  ];
  const doneCount = checklist.filter(item => item.done).length;

  return (
    <section className={styles.ownerPanel}>
      <div>
        <span className={styles.ownerKicker}>페이지 생성 완료</span>
        <h2>공개 채널이 만들어졌어요</h2>
        <p>운영에 필요한 항목을 채우면 팔로우와 멤버십 전환이 더 자연스럽게 이어져요.</p>
        <div className={styles.ownerProgress} aria-label={`프로필 완성도 ${doneCount}/4`}>
          <span>프로필 완성도</span>
          <strong>{doneCount}/4</strong>
          <div aria-hidden>
            <i style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
        </div>
      </div>
      <div className={styles.ownerChecklist}>
        {checklist.map(item => (
          <Link
            key={item.label}
            href={item.href}
            className={`${styles.ownerTask} ${item.done ? styles.ownerTaskDone : ''}`}
          >
            <span aria-hidden>{item.done ? '✓' : ''}</span>
            <strong>{item.label}</strong>
            <em>{item.hint}</em>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ── 글 탭 ──
function PostsTab({ posts, slug, isOwner }: { posts: CreatorPost[]; slug: string; isOwner: boolean }) {
  if (posts.length === 0) {
    return (
      <div className={styles.emptyPosts}>
        <div className={styles.emptyEmoji} aria-hidden />
        <strong>아직 올라온 글이 없어요</strong>
        <span>{isOwner ? '첫 글을 작성해 보세요.' : '크리에이터의 첫 글을 기다려 주세요.'}</span>
        {isOwner && (
          <Link href={`/creator/${slug}/write`} className={styles.emptyCta}>글 작성</Link>
        )}
      </div>
    );
  }
  return (
    <ul className={styles.postList}>
      {posts.map(p => {
        const hasInlinePaywall = !!(p.body && /<hr\b[^>]*\bdata-paywall\b[^>]*\/?>/i.test(p.body));
        const locked = p.is_member_only || hasInlinePaywall;
        return (
          <li key={p.id}>
            <Link href={`/creator/${slug}/posts/${p.slug}`} className={styles.postCard}>
              {locked && (
                <div className={styles.postLockBadge}>
                  {p.is_member_only ? '멤버 전용' : '일부 잠금'}
                </div>
              )}
              <strong className={styles.postTitle}>{p.title}</strong>
              <div className={styles.postMeta}>
                <time>{relativeTime(p.published_at)}</time>
                <span>·</span>
                <span>조회 {(p.view_count || 0).toLocaleString()}</span>
              </div>
              {p.cover_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.cover_url}
                  alt={p.title}
                  className={`${styles.postCover} ${locked ? styles.postCoverBlur : ''}`}
                />
              )}
              {p.preview && !locked && <p className={styles.postPreview}>{p.preview}</p>}
              {locked && (
                <div className={styles.postUnlock}>
                  <span className={styles.postUnlockIcon} aria-hidden /> 잠긴 콘텐츠 열어보기
                </div>
              )}
              {p.tags && p.tags.length > 0 && (
                <div className={styles.postTags}>
                  {p.tags.slice(0, 5).map((t: string) => <span key={t}>#{t}</span>)}
                </div>
              )}
              <div className={styles.postFoot}>
                <span>♥ {p.like_count || 0}</span>
                <span>💬 {p.comment_count || 0}</span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR');
}

// ── 소개 탭 ──
function AboutTab({ creator }: { creator: any }) {
  const visibleTopics = displayTopics(creator.topics || []);

  return (
    <div className={styles.aboutBlock}>
      {creator.bio && (
        <section>
          <h3>소개</h3>
          <p>{creator.bio}</p>
        </section>
      )}
      {creator.credential && (
        <section>
          <h3>전문성</h3>
          <p className={styles.aboutCred}>✓ {creator.credential}</p>
          <p className={styles.aboutNote}>전문 자격증/경력은 운영진이 직접 검증한 정보예요.</p>
        </section>
      )}
      {visibleTopics.length > 0 && (
        <section>
          <h3>다루는 주제</h3>
          <div className={styles.aboutTopics}>
            {visibleTopics.map((t: string) => (
              <span key={t} className={styles.topicChip}>#{t}</span>
            ))}
          </div>
        </section>
      )}
      {creator.channel_url && (
        <section>
          <h3>외부 채널</h3>
          <Link
            href={creator.channel_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.aboutLink}
          >
            {creator.channel_url} →
          </Link>
        </section>
      )}
      <section>
        <h3>활동</h3>
        <div className={styles.aboutStats}>
          <div><strong>{creator.follower_count.toLocaleString()}</strong><span>팔로워</span></div>
          <div><strong>{creator.member_count.toLocaleString()}</strong><span>유료 멤버</span></div>
          <div><strong>{creator.post_count.toLocaleString()}</strong><span>발행 글</span></div>
        </div>
      </section>
    </div>
  );
}

// ── 시리즈 탭 ──
function SeriesTab({ slug, isOwner }: { slug: string; isOwner: boolean }) {
  return (
    <div className={styles.emptyPosts}>
      <div className={styles.emptyEmoji}>▦</div>
      <strong>시리즈가 준비 중이에요</strong>
      <span>연재 콘텐츠가 생기면 이곳에서 묶어볼 수 있어요.</span>
      {isOwner && (
        <Link href={`/creator/${slug}/series`} className={styles.emptyCta}>시리즈 관리</Link>
      )}
    </div>
  );
}

// ── 멤버십 탭 ──
function MembershipTab({ creator, perks, onSubscribe }: { creator: Creator; perks: string[]; onSubscribe: () => void }) {
  if (!creator.membership_enabled) {
    return (
      <div className={styles.memBlock}>
        <section className={styles.memWaiting}>
          <span className={styles.memEyebrow}>멤버십</span>
          <h2>아직 멤버십을 준비 중이에요</h2>
          <p>멤버십 상품이 열리면 혜택, 가격, 상품 후기를 이 탭에서 확인할 수 있어요.</p>
        </section>
        <ProductReviewBlock enabled={false} />
      </div>
    );
  }

  return (
    <div className={styles.memBlock}>
      <header className={styles.memHero}>
        <span className={styles.memEyebrow}>멤버십 상품</span>
        <h2>{creator.membership_tier_name || '월간 멤버십'}</h2>
        <p>{creator.display_name}의 멤버 전용 콘텐츠와 리워드를 이용할 수 있어요.</p>
      </header>

      {perks.length > 0 && (
        <section className={styles.memPerks}>
          <h3>이런 걸 받아요</h3>
          <ul>
            {perks.map((p, i) => (
              <li key={i}>
                <span className={styles.memCheck}>✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ProductReviewBlock enabled />

      <section className={styles.memRiskNote}>
        <strong>투자 콘텐츠 안내</strong>
        <p>재프콘의 콘텐츠는 투자 판단을 돕는 참고 자료이며, 수익을 보장하지 않습니다. 최종 투자 결정과 책임은 이용자에게 있어요.</p>
      </section>

      <button type="button" onClick={onSubscribe} className={styles.memCta}>
        월 {creator.membership_price_won?.toLocaleString()}원 멤버 시작하기
      </button>
      <p className={styles.memNote}>언제든 해지할 수 있어요. 결제는 곧 연결돼요.</p>
    </div>
  );
}

function ProductReviewBlock({ enabled, compact = false }: { enabled: boolean; compact?: boolean }) {
  return (
    <div className={`${styles.reviewBlock} ${compact ? styles.reviewCompact : ''}`}>
      <div className={styles.reviewScore}>
        <strong>{enabled ? '후기 준비중' : '멤버십 오픈 전'}</strong>
        <span>멤버십 상품 후기</span>
      </div>
      <div className={styles.reviewBody}>
        <p>
          후기는 크리에이터 전체가 아니라 멤버십 상품에 연결됩니다. 가격보다 먼저 혜택과 자료 품질을 확인한 뒤,
          실제 멤버가 남긴 만족도를 볼 수 있도록 설계해요.
        </p>
        <div className={styles.reviewChips}>
          <span>설명 명확성</span>
          <span>업데이트 성실도</span>
          <span>자료 품질</span>
          <span>리스크 설명</span>
        </div>
      </div>
    </div>
  );
}
