import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { createClient } from '@/lib/supabase/server';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { FeedsClient, type FollowedCreator, type FeedPost } from './FeedsClient';

export const metadata: Metadata = {
  title: '내 뉴스피드',
  description: '팔로우한 재프콘 크리에이터의 최신 글을 한 곳에서.',
  keywords: ['재프콘 피드', '뉴스피드', '팔로잉', SITE_NAME],
  alternates: { canonical: '/feeds' },
  openGraph: {
    title: `내 뉴스피드 | ${SITE_NAME}`,
    description: '팔로우한 재프콘 크리에이터의 최신 글을 한 곳에서.',
    url: `${SITE_URL}/feeds`,
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function FeedsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth?next=/feeds');

  // 1) 본인이 팔로우한 크리에이터 id 목록
  const { data: followRows } = await supabase
    .from('creator_follows')
    .select('creator_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  const followedIds = (followRows || []).map(r => r.creator_id as string);

  // 2) 활성 멤버십 — 잠긴 글 미리보기 판단용
  const { data: subs } = await supabase
    .from('creator_subscriptions')
    .select('creator_id')
    .eq('user_id', user.id)
    .eq('status', 'active');
  const memberOf = new Set((subs || []).map(s => s.creator_id as string));

  // 3) 팔로우한 크리에이터 카드 (가로 스크롤용)
  let followed: FollowedCreator[] = [];
  if (followedIds.length) {
    const { data: cs } = await supabase
      .from('creators')
      .select('id, slug, display_name, avatar_url, cover_url, membership_enabled')
      .in('id', followedIds)
      .eq('is_published', true);
    if (cs) {
      const orderMap = new Map(followedIds.map((id, idx) => [id, idx]));
      followed = (cs as any[])
        .map(c => ({
          id: c.id,
          slug: c.slug,
          display_name: c.display_name,
          avatar_url: c.avatar_url,
          cover_url: c.cover_url,
          membership_enabled: !!c.membership_enabled,
        }))
        .sort((a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999));
    }
  }

  // 4) 팔로우한 크리에이터들의 최신 글 (발행됨 + publish_at 지난 것만)
  let posts: FeedPost[] = [];
  if (followedIds.length) {
    const nowIso = new Date().toISOString();
    const { data: postRows } = await supabase
      .from('creator_posts')
      .select('id, creator_id, slug, title, preview, cover_url, body, is_member_only, like_count, comment_count, view_count, published_at, tags')
      .in('creator_id', followedIds)
      .eq('is_published', true)
      .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
      .order('published_at', { ascending: false })
      .limit(30);

    if (postRows?.length) {
      // creator 정보 매핑
      const cMap = new Map<string, { slug: string; display_name: string; avatar_url: string | null; membership_tier_name: string | null; membership_price_won: number | null }>();
      const { data: creatorsForPosts } = await supabase
        .from('creators')
        .select('id, slug, display_name, avatar_url, membership_tier_name, membership_price_won')
        .in('id', Array.from(new Set(postRows.map(p => p.creator_id))));
      (creatorsForPosts || []).forEach((c: any) => cMap.set(c.id, c));

      posts = (postRows as any[]).map(p => {
        const c = cMap.get(p.creator_id);
        const hasInlinePaywall = !!(p.body && /<hr\b[^>]*\bdata-paywall\b[^>]*\/?>/i.test(p.body));
        const locked = !memberOf.has(p.creator_id) && (p.is_member_only || hasInlinePaywall);
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          preview: p.preview,
          cover_url: p.cover_url,
          like_count: p.like_count || 0,
          comment_count: p.comment_count || 0,
          view_count: p.view_count || 0,
          published_at: p.published_at,
          tags: p.tags || [],
          locked,
          is_member_only: !!p.is_member_only,
          has_inline_paywall: hasInlinePaywall,
          creator: c
            ? {
                slug: c.slug,
                display_name: c.display_name,
                avatar_url: c.avatar_url,
                membership_tier_name: c.membership_tier_name,
                membership_price_won: c.membership_price_won,
              }
            : null,
        };
      });
    }
  }

  // 5) 추천 크리에이터 (팔로우 안 한 인기 페이지 — member_count 기준)
  const { data: featured } = await supabase
    .from('creators')
    .select('id, slug, display_name, avatar_url, bio, member_count, follower_count')
    .eq('is_published', true)
    .order('member_count', { ascending: false, nullsFirst: false })
    .order('follower_count', { ascending: false, nullsFirst: false })
    .limit(12);
  const featuredFiltered = (featured || []).filter((c: any) => !followedIds.includes(c.id)).slice(0, 8);

  return (
    <AppShell active="feed" wide hideSlogan>
      <FeedsClient
        followed={followed}
        posts={posts}
        recommended={featuredFiltered as any}
      />
    </AppShell>
  );
}
