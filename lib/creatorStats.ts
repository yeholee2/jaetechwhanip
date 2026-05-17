/**
 * 크리에이터 활동 지표 — 채널의 "살아있음" 시그널.
 *
 * 멤버십 결제 직전 사용자가 가치 판단하는 핵심 데이터.
 * 네프콘식 "최근 30일 65건 발행" 자동 표시.
 */
import { createClient } from '@/lib/supabase/server';
import type { CreatorStats } from '@/lib/creatorStatsTypes';

export type { CreatorStats } from '@/lib/creatorStatsTypes';
export { activityBadge, summarize } from '@/lib/creatorStatsTypes';

const EMPTY: CreatorStats = {
  posts30d: 0,
  posts7d: 0,
  members30d: 0,
  followers30d: 0,
  lastPostAt: null,
  totalLikes: 0,
};

export async function fetchCreatorStats(creatorId: string): Promise<CreatorStats> {
  const supabase = createClient();
  if (!supabase) return EMPTY;

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const d7 = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [posts30, posts7, members30, followers30, lastPost, likes] = await Promise.all([
    supabase
      .from('creator_posts')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      .gte('published_at', d30),
    supabase
      .from('creator_posts')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      .gte('published_at', d7),
    supabase
      .from('creator_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('status', 'active')
      .gte('created_at', d30),
    supabase
      .from('creator_follows')
      .select('user_id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .gte('created_at', d30),
    supabase
      .from('creator_posts')
      .select('published_at')
      .eq('creator_id', creatorId)
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('creator_posts')
      .select('like_count')
      .eq('creator_id', creatorId),
  ]);

  const totalLikes = (likes.data || []).reduce((s: number, r: any) => s + (r.like_count || 0), 0);

  return {
    posts30d: posts30.count || 0,
    posts7d: posts7.count || 0,
    members30d: members30.count || 0,
    followers30d: followers30.count || 0,
    lastPostAt: lastPost.data?.published_at || null,
    totalLikes,
  };
}

