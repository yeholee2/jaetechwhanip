'use client';

/**
 * /feeds — 팔로우 크리에이터 최신 글 통합 피드.
 * Fanding 뉴스피드 패턴.
 *  - 상단: '내 크리에이터' 가로 스크롤
 *  - 메인: '최신 콘텐츠' (전체 / 열람 가능 필터)
 *  - 우측: '추천 크리에이터' 사이드 (PC 만)
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './Feeds.module.css';

export type FollowedCreator = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  membership_enabled: boolean;
};

export type FeedPost = {
  id: string;
  slug: string;
  title: string;
  preview: string | null;
  cover_url: string | null;
  like_count: number;
  comment_count: number;
  view_count: number;
  published_at: string;
  tags: string[];
  locked: boolean;
  is_member_only: boolean;
  has_inline_paywall: boolean;
  creator: {
    slug: string;
    display_name: string;
    avatar_url: string | null;
    membership_tier_name: string | null;
    membership_price_won: number | null;
  } | null;
};

type Recommended = {
  id: string;
  slug: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  member_count: number | null;
  follower_count: number | null;
};

type Filter = 'all' | 'unlocked';

function timeAgo(iso: string): string {
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

export function FeedsClient({
  followed,
  posts,
  recommended,
}: {
  followed: FollowedCreator[];
  posts: FeedPost[];
  recommended: Recommended[];
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const visiblePosts = useMemo(() => {
    if (filter === 'unlocked') return posts.filter(p => !p.locked);
    return posts;
  }, [posts, filter]);

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>뉴스피드</h1>
        <p>팔로우한 크리에이터의 최신 글을 한 곳에서 봐요.</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.center}>
          {/* 내 크리에이터 (가로 스크롤) */}
          {followed.length > 0 && (
            <section className={styles.creatorsBar}>
              <div className={styles.barHead}>
                <strong>내 크리에이터</strong>
                <span className={styles.barCount}>{followed.length}</span>
              </div>
              <div className={styles.creatorsScroll}>
                {followed.map(c => (
                  <Link
                    key={c.id}
                    href={`/creator/${c.slug}`}
                    className={styles.creatorChip}
                  >
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" className={styles.creatorAvatar} />
                    ) : (
                      <span className={styles.creatorAvatarPlaceholder}>
                        {c.display_name.slice(0, 1)}
                      </span>
                    )}
                    <span className={styles.creatorName}>{c.display_name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 최신 콘텐츠 */}
          <section className={styles.contentSection}>
            <div className={styles.sectionHead}>
              <strong>최신 콘텐츠</strong>
              <div className={styles.filterRow}>
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`${styles.filterBtn} ${filter === 'all' ? styles.filterOn : ''}`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('unlocked')}
                  className={`${styles.filterBtn} ${filter === 'unlocked' ? styles.filterOn : ''}`}
                >
                  열람 가능
                </button>
              </div>
            </div>

            {followed.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>👀</div>
                <strong>아직 팔로우한 크리에이터가 없어요</strong>
                <p>아래 추천 크리에이터를 둘러보거나 검색해보세요.</p>
                <Link href="/creators" className={styles.emptyCta}>크리에이터 둘러보기</Link>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📭</div>
                <strong>{filter === 'unlocked' ? '열람 가능한 글이 없어요' : '아직 글이 없어요'}</strong>
                <p>크리에이터가 글을 올리면 여기에 표시돼요.</p>
              </div>
            ) : (
              <ul className={styles.postList}>
                {visiblePosts.map(p => (
                  <li key={p.id}>
                    <PostCard post={p} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 우측 추천 사이드 */}
        {recommended.length > 0 && (
          <aside className={styles.side}>
            <div className={styles.sideCard}>
              <div className={styles.sideHead}>추천 크리에이터</div>
              <ul className={styles.recList}>
                {recommended.map(c => (
                  <li key={c.id} className={styles.recItem}>
                    <Link href={`/creator/${c.slug}`} className={styles.recLink}>
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt="" className={styles.recAvatar} />
                      ) : (
                        <span className={styles.recAvatarPlaceholder}>
                          {c.display_name.slice(0, 1)}
                        </span>
                      )}
                      <div className={styles.recBody}>
                        <strong>{c.display_name}</strong>
                        {c.bio && <span>{c.bio}</span>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const c = post.creator;
  if (!c) return null;
  const lockedBadge = post.locked
    ? (post.is_member_only ? '💎 멤버십 전용 공개' : '🔒 일부 멤버 전용')
    : null;

  return (
    <article className={styles.postCard}>
      {/* head */}
      <Link href={`/creator/${c.slug}`} className={styles.postCardHead}>
        {c.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.avatar_url} alt="" className={styles.postAuthorAvatar} />
        ) : (
          <span className={styles.postAuthorAvatarPlaceholder}>
            {c.display_name.slice(0, 1)}
          </span>
        )}
        <span className={styles.postAuthorName}>{c.display_name}</span>
      </Link>

      {lockedBadge && (
        <div className={styles.lockedBadge}>{lockedBadge}</div>
      )}

      <Link href={`/creator/${c.slug}/posts/${post.slug}`} className={styles.postCardBody}>
        <h3 className={styles.postTitle}>{post.title}</h3>
        <div className={styles.postMeta}>
          <span>{timeAgo(post.published_at)}</span>
          <span>·</span>
          <span>조회 {post.view_count.toLocaleString()}</span>
        </div>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt={post.title}
            className={`${styles.postCover} ${post.locked ? styles.postCoverBlur : ''}`}
          />
        )}

        {post.preview && !post.locked && (
          <p className={styles.postPreview}>{post.preview}</p>
        )}

        {post.locked && (
          <div className={styles.unlockCta}>
            <span className={styles.unlockIcon}>🔒</span>
            <span>잠긴 콘텐츠 열어보기</span>
          </div>
        )}

        {post.tags?.length > 0 && (
          <div className={styles.postTags}>
            {post.tags.slice(0, 4).map(t => (
              <span key={t}>#{t}</span>
            ))}
          </div>
        )}
      </Link>

      <div className={styles.postFoot}>
        <span>♥ {post.like_count}</span>
        <span>💬 {post.comment_count}</span>
        {post.locked && (c as any).membership_enabled && c.membership_price_won && (
          <Link href={`/creator/${c.slug}`} className={styles.joinBtn}>
            월 {c.membership_price_won.toLocaleString()}원 멤버
          </Link>
        )}
      </div>
    </article>
  );
}
