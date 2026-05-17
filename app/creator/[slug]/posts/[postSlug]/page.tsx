import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import type { Creator, CreatorPost } from '@/lib/creator';
import { PostBody } from './PostBody';
import { PostInteractions } from './PostInteractions';
import styles from './CreatorPost.module.css';

export const revalidate = 60;

type Props = { params: { slug: string; postSlug: string } };

async function fetchCreatorAndPost(slug: string, postSlug: string) {
  const supabase = createClient();
  const { data: creatorRow } = await supabase
    .from('creators')
    .select('*')
    .eq('slug', decodeURIComponent(slug))
    .eq('is_published', true)
    .maybeSingle();
  const creator = creatorRow as Creator | null;
  if (!creator) return { creator: null, post: null, isMember: false };

  const { data: postRow } = await supabase
    .from('creator_posts')
    .select('*')
    .eq('creator_id', creator.id)
    .eq('slug', decodeURIComponent(postSlug))
    .eq('is_published', true)
    .maybeSingle();
  const post = postRow as CreatorPost | null;
  if (!post) return { creator, post: null, isMember: false };

  // 본인/admin/active member 체크
  let isMember = false;
  let isOwnerOrAdmin = false;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    if (user.id === creator.user_id) {
      isMember = true;
      isOwnerOrAdmin = true;
    } else {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role === 'admin') {
        isMember = true;
        isOwnerOrAdmin = true;
      } else {
        const { data: sub } = await supabase
          .from('creator_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('creator_id', creator.id)
          .eq('status', 'active')
          .maybeSingle();
        if (sub) isMember = true;
      }
    }
  }

  // 예약 발행 가드: publish_at 이 미래면 본인/admin 외엔 숨김
  if (post.publish_at && new Date(post.publish_at).getTime() > Date.now() && !isOwnerOrAdmin) {
    return { creator, post: null, isMember: false };
  }
  return { creator, post, isMember };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { creator, post } = await fetchCreatorAndPost(params.slug, params.postSlug);
  if (!creator || !post) return { title: '글을 찾을 수 없어요', robots: { index: false } };
  const desc = post.preview || `${creator.display_name} | ${SITE_NAME}`;
  return {
    title: `${post.title} | ${creator.display_name}`,
    description: desc,
    alternates: { canonical: `/creator/${creator.slug}/posts/${post.slug}` },
    openGraph: {
      title: post.title,
      description: desc,
      url: `${SITE_URL}/creator/${creator.slug}/posts/${post.slug}`,
      images: post.cover_url ? [post.cover_url] : undefined,
      type: 'article',
    },
  };
}

const PAYWALL_RE = /<hr\b[^>]*\bdata-paywall\b[^>]*\/?>/i;

function splitBodyAtPaywall(html: string | null | undefined): { before: string; hasMarker: boolean } {
  if (!html) return { before: '', hasMarker: false };
  const m = html.match(PAYWALL_RE);
  if (!m || m.index === undefined) return { before: html, hasMarker: false };
  return { before: html.slice(0, m.index), hasMarker: true };
}

function stripPaywall(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(PAYWALL_RE, '');
}

export default async function CreatorPostPage({ params }: Props) {
  const { creator, post, isMember } = await fetchCreatorAndPost(params.slug, params.postSlug);
  if (!creator || !post) notFound();

  const { before: bodyBeforePaywall, hasMarker: hasInlinePaywall } = splitBodyAtPaywall(post.body);
  const inlineLocked = hasInlinePaywall && !isMember;
  const fullLocked = post.is_member_only && !isMember;
  const locked = inlineLocked || fullLocked;

  const renderedBody = isMember
    ? stripPaywall(post.body)
    : inlineLocked
      ? bodyBeforePaywall
      : (post.body || '');

  return (
    <AppShell active="my" hideSlogan>
      <main className={styles.wrap}>
        <Link href={`/creator/${creator.slug}`} className={styles.back}>
          ← {creator.display_name}
        </Link>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.cover_url} alt={post.title} className={styles.cover} />
        )}

        <header className={styles.head}>
          {post.is_member_only ? (
            <span className={styles.memberBadge}>
              {isMember ? '✓ 멤버 전용' : '🔒 멤버 전용'}
            </span>
          ) : hasInlinePaywall ? (
            <span className={styles.memberBadge}>
              {isMember ? '✓ 일부 멤버 전용' : '🔒 일부 멤버 전용'}
            </span>
          ) : null}
          <h1>{post.title}</h1>
          <div className={styles.meta}>
            <Link href={`/creator/${creator.slug}`} className={styles.authorLink}>
              {creator.display_name}
            </Link>
            <span>·</span>
            <time>{new Date(post.published_at).toLocaleDateString('ko-KR')}</time>
          </div>
        </header>

        {inlineLocked ? (
          <>
            <PostBody body={renderedBody} />
            <div className={styles.paywall}>
              <div className={styles.paywallIcon}>🔒</div>
              <strong>여기부터는 {creator.membership_tier_name}만 볼 수 있어요</strong>
              <p>
                {creator.display_name}의 멤버가 되면 이 글의 나머지 내용과 모든 멤버 전용 콘텐츠를 볼 수 있어요.
              </p>
              <Link href={`/creator/${creator.slug}`} className={styles.paywallBtn}>
                {creator.membership_enabled
                  ? `월 ${creator.membership_price_won?.toLocaleString()}원 멤버 되기`
                  : '곧 멤버십 오픈'}
              </Link>
            </div>
          </>
        ) : fullLocked ? (
          <>
            {post.preview && <PostBody body={post.preview} className={styles.preview} />}
            <div className={styles.paywall}>
              <div className={styles.paywallIcon}>🔒</div>
              <strong>여기서부터는 {creator.membership_tier_name}만 볼 수 있어요</strong>
              <p>
                {creator.display_name}의 멤버가 되면 이 글의 전체 내용과 모든 멤버 전용 콘텐츠를 볼 수 있어요.
              </p>
              <Link href={`/creator/${creator.slug}`} className={styles.paywallBtn}>
                {creator.membership_enabled
                  ? `월 ${creator.membership_price_won?.toLocaleString()}원 멤버 되기`
                  : '곧 멤버십 오픈'}
              </Link>
            </div>
          </>
        ) : (
          <PostBody body={renderedBody} />
        )}

        <PostInteractions
          postId={post.id}
          initialLikeCount={post.like_count}
          initialCommentCount={post.comment_count}
          locked={locked}
        />
      </main>
    </AppShell>
  );
}
