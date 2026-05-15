'use client';

/**
 * 크리에이터 공개 프로필 — 팬딩/네프콘 스타일.
 * - 프로필 (아바타/커버/통계/팔로우/멤버십)
 * - 글 목록 (멤버 전용 글은 잠금 표시)
 * - 본인이면 편집/글쓰기 버튼 노출
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Creator, CreatorPost } from '@/lib/creator';
import styles from './CreatorPage.module.css';

export function CreatorPageClient({
  creator,
  posts,
  isOwner,
}: {
  creator: Creator;
  posts: CreatorPost[];
  isOwner: boolean;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(creator.follower_count);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState('');

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
        if (error) {
          alert(error.message);
          return;
        }
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        setToast('팔로우 취소했어요');
      } else {
        const { error } = await supabase
          .from('creator_follows')
          .insert({ creator_id: creator.id, user_id: userId });
        if (error) {
          alert(error.message);
          return;
        }
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
    setToast(creator.membership_enabled ? '멤버십 결제는 곧 연결돼요' : '곧 멤버십이 오픈돼요');
    setTimeout(() => setToast(''), 2400);
  };

  const perks = (creator.membership_perks || '').split('\n').map(p => p.trim()).filter(Boolean);

  return (
    <div className={styles.wrap}>
      {creator.cover_url && (
        <div
          className={styles.cover}
          style={{ backgroundImage: `url(${creator.cover_url})` }}
          aria-hidden
        />
      )}

      <header className={styles.head}>
        <div className={styles.avatar}>
          {creator.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creator.avatar_url} alt={creator.display_name} />
          ) : (
            <span>{creator.display_name.slice(0, 1)}</span>
          )}
        </div>
        <div className={styles.headBody}>
          <h1>{creator.display_name}</h1>
          {creator.bio && <p className={styles.bio}>{creator.bio}</p>}
          {creator.topics?.length > 0 && (
            <div className={styles.topics}>
              {creator.topics.map(t => (
                <span key={t} className={styles.topicChip}>{t}</span>
              ))}
            </div>
          )}
          <div className={styles.stats}>
            <span><strong>{followerCount.toLocaleString()}</strong> 팔로워</span>
            <span><strong>{creator.member_count.toLocaleString()}</strong> 멤버</span>
            <span><strong>{creator.post_count.toLocaleString()}</strong> 글</span>
          </div>
          <div className={styles.actions}>
            {isOwner ? (
              <>
                <Link href={`/creator/${creator.slug}/write`} className={styles.btnFollow}>
                  + 글 작성
                </Link>
                <Link href={`/creator/${creator.slug}/edit`} className={styles.btnFollowing}>
                  페이지 편집
                </Link>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={pending}
                  className={isFollowing ? styles.btnFollowing : styles.btnFollow}
                >
                  {isFollowing ? '팔로잉' : '+ 팔로우'}
                </button>
                <button
                  type="button"
                  onClick={subscribe}
                  className={styles.btnSubscribe}
                >
                  {creator.membership_enabled
                    ? `월 ${creator.membership_price_won?.toLocaleString() ?? ''}원 ${creator.membership_tier_name}`
                    : '곧 멤버십 오픈'}
                </button>
              </>
            )}
            {creator.channel_url && (
              <Link
                href={creator.channel_url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnChannel}
              >
                채널 보기 →
              </Link>
            )}
          </div>
        </div>
      </header>

      {creator.membership_enabled && perks.length > 0 && (
        <section className={styles.membershipCard}>
          <div className={styles.membershipHead}>
            <strong>{creator.membership_tier_name} 멤버 혜택</strong>
            <span>월 {creator.membership_price_won?.toLocaleString()}원</span>
          </div>
          <ul className={styles.perks}>
            {perks.map((p, i) => (
              <li key={i}>✓ {p}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>글</h2>
        {posts.length === 0 ? (
          <div className={styles.emptyPosts}>
            <div className={styles.emptyEmoji}>📝</div>
            <strong>아직 올라온 글이 없어요</strong>
            <span>
              {isOwner ? '첫 글을 작성해 보세요.' : '크리에이터의 첫 글을 기다려 주세요.'}
            </span>
            {isOwner && (
              <Link href={`/creator/${creator.slug}/write`} className={styles.emptyCta}>
                + 글 작성
              </Link>
            )}
          </div>
        ) : (
          <div className={styles.postList}>
            {posts.map(p => (
              <Link
                key={p.id}
                href={`/creator/${creator.slug}/posts/${p.slug}`}
                className={styles.postCard}
              >
                {p.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.cover_url} alt={p.title} className={styles.postCover} />
                )}
                <div className={styles.postBody}>
                  <div className={styles.postMeta}>
                    {p.is_member_only && <span className={styles.postLock}>🔒 멤버 전용</span>}
                    <time>{new Date(p.published_at).toLocaleDateString('ko-KR')}</time>
                  </div>
                  <strong className={styles.postTitle}>{p.title}</strong>
                  {p.preview && <p className={styles.postPreview}>{p.preview}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
