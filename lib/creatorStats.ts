/**
 * 크리에이터 활동 지표 — 채널의 "살아있음" 시그널.
 *
 * 멤버십 결제 직전 사용자가 가치 판단하는 핵심 데이터.
 * 네프콘식 "최근 30일 65건 발행" 자동 표시.
 */
import { createClient } from '@/lib/supabase/server';

export type CreatorStats = {
  posts30d: number;            // 최근 30일 발행 글
  posts7d: number;             // 최근 7일 발행 글
  members30d: number;          // 최근 30일 신규 멤버
  followers30d: number;        // 최근 30일 신규 팔로워
  lastPostAt: string | null;   // 마지막 발행일 (ISO)
  totalLikes: number;          // 받은 좋아요 합
};

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

/** 활동 등급 — 라벨로 표시 */
export function activityBadge(stats: CreatorStats): { label: string; tone: 'hot' | 'active' | 'steady' | 'quiet' } | null {
  if (stats.posts7d >= 3) return { label: '🔥 활발', tone: 'hot' };
  if (stats.posts30d >= 8) return { label: '✓ 꾸준히', tone: 'active' };
  if (stats.posts30d >= 3) return { label: '월간 발행', tone: 'steady' };
  return null;
}

/** "최근 30일 N건 발행" 같은 사람이 읽기 좋은 문장 */
export function summarize(stats: CreatorStats): string[] {
  const lines: string[] = [];
  if (stats.posts30d > 0) lines.push(`최근 30일 ${stats.posts30d}건 발행`);
  if (stats.members30d > 0) lines.push(`최근 30일 ${stats.members30d}명 신규 멤버`);
  if (stats.totalLikes >= 10) lines.push(`누적 ${stats.totalLikes.toLocaleString()} 좋아요`);
  return lines;
}
