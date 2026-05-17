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
import { createClient } from '@/lib/supabase/client';
import type { Creator, CreatorPost } from '@/lib/creator';
import { type CreatorStats, activityBadge, summarize } from '@/lib/creatorStatsTypes';
import styles from './CreatorPage.module.css';

type Tab = 'posts' | 'about' | 'membership';

function coverStyle(c: any): React.CSSProperties {
  if (c.cover_url) return { backgroundImage: `url(${c.cover_url})` };
  if (c.coverGradient) return { background: c.coverGradient };
  const palette = [
    'linear-gradient(135deg, #1B64DA, #3182F6)',
    'linear-gradient(135deg, #7C4DFF, #B383FF)',
    'linear-gradient(135deg, #2E9C5C, #44C781)',
    'linear-gradient(135deg, #FF9F1C, #FFC36B)',
    'linear-gradient(135deg, #E94986, #FF8FB7)',
  ];
  const hash = (c.slug || c.id || '').split('').reduce((a: number, ch: string) => a + ch.charCodeAt(0), 0);
  return { background: palette[hash % palette.length] };
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
  const [tab, setTab] = useState<Tab>('posts');

  useEffect(() => {
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
          {creator.topics?.length > 0 && (
            <div className={styles.topics}>
              {creator.topics.map(t => (
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
                + 글 작성
              </Link>
              <Link href={`/creator/${creator.slug}/dashboard`} className={styles.btnSecondary}>
                📊 대시보드
              </Link>
              <Link href={`/creator/${creator.slug}/templates`} className={styles.btnSecondary}>
                🗂️ 템플릿
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
                <button type="button" onClick={subscribe} className={styles.btnSubscribe}>
                  월 {creator.membership_price_won?.toLocaleString()}원 멤버
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
          className={`${styles.tab} ${tab === 'posts' ? styles.tabOn : ''}`}
          onClick={() => setTab('posts')}
        >
          글 <span>{posts.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'about' ? styles.tabOn : ''}`}
          onClick={() => setTab('about')}
        >
          소개
        </button>
        {creator.membership_enabled && (
          <button
            type="button"
            className={`${styles.tab} ${tab === 'membership' ? styles.tabOn : ''}`}
            onClick={() => setTab('membership')}
          >
            멤버십
          </button>
        )}
      </nav>

      {/* 메인 + 사이드 */}
      <div className={styles.layout}>
        <div className={styles.main}>
          {tab === 'posts' && (
            <PostsTab posts={posts} slug={creator.slug} isOwner={isOwner} />
          )}
          {tab === 'about' && (
            <AboutTab creator={creator} />
          )}
          {tab === 'membership' && creator.membership_enabled && (
            <MembershipTab creator={creator} perks={perks} onSubscribe={subscribe} />
          )}
        </div>

        <aside className={styles.side}>
          {creator.membership_enabled && tab !== 'membership' && (
            <div className={styles.sideMembership}>
              <span className={styles.sideEyebrow}>🌟 멤버십</span>
              <strong className={styles.sidePrice}>
                월 {creator.membership_price_won?.toLocaleString()}원
              </strong>
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
              <button type="button" onClick={subscribe} className={styles.sideCta}>
                멤버 되기
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

// ── 글 탭 ──
function PostsTab({ posts, slug, isOwner }: { posts: CreatorPost[]; slug: string; isOwner: boolean }) {
  if (posts.length === 0) {
    return (
      <div className={styles.emptyPosts}>
        <div className={styles.emptyEmoji}>📝</div>
        <strong>아직 올라온 글이 없어요</strong>
        <span>{isOwner ? '첫 글을 작성해 보세요.' : '크리에이터의 첫 글을 기다려 주세요.'}</span>
        {isOwner && (
          <Link href={`/creator/${slug}/write`} className={styles.emptyCta}>+ 글 작성</Link>
        )}
      </div>
    );
  }
  return (
    <ul className={styles.postList}>
      {posts.map(p => (
        <li key={p.id}>
          <Link href={`/creator/${slug}/posts/${p.slug}`} className={styles.postCard}>
            {p.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.cover_url} alt={p.title} className={styles.postCover} />
            )}
            <div className={styles.postBody}>
              <div className={styles.postMeta}>
                {p.is_member_only && <span className={styles.postLock}>🔒 멤버 전용</span>}
                <time>{new Date(p.published_at).toLocaleDateString('ko-KR')}</time>
                {p.like_count > 0 && <span>❤️ {p.like_count}</span>}
                {p.comment_count > 0 && <span>💬 {p.comment_count}</span>}
              </div>
              <strong className={styles.postTitle}>{p.title}</strong>
              {p.preview && <p className={styles.postPreview}>{p.preview}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ── 소개 탭 ──
function AboutTab({ creator }: { creator: any }) {
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
      {creator.topics?.length > 0 && (
        <section>
          <h3>다루는 주제</h3>
          <div className={styles.aboutTopics}>
            {creator.topics.map((t: string) => (
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

// ── 멤버십 탭 ──
function MembershipTab({ creator, perks, onSubscribe }: { creator: Creator; perks: string[]; onSubscribe: () => void }) {
  return (
    <div className={styles.memBlock}>
      <header className={styles.memHero}>
        <span className={styles.memEyebrow}>🌟 멤버십</span>
        <h2>{creator.membership_tier_name}</h2>
        <strong className={styles.memPrice}>월 {creator.membership_price_won?.toLocaleString()}원</strong>
        <p>{creator.display_name} 의 모든 멤버 전용 콘텐츠를 무제한으로.</p>
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

      <button type="button" onClick={onSubscribe} className={styles.memCta}>
        월 {creator.membership_price_won?.toLocaleString()}원 멤버 시작하기
      </button>
      <p className={styles.memNote}>언제든 해지할 수 있어요. 결제는 곧 연결돼요.</p>
    </div>
  );
}
