/**
 * 채널 추천 — collaborative filtering (간단 버전).
 *
 * 흐름:
 *  1. 현재 채널을 팔로우하는 사용자 목록 조회
 *  2. 그 사용자들이 팔로우하는 다른 채널 집계
 *  3. 빈도 높은 순으로 정렬 → 본 채널 제외 → 상위 N개 반환
 *
 * 데이터 적을 땐 fallback 으로 같은 토픽 채널 추천.
 */
import { createClient } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';

export async function fetchSimilarCreators(
  creatorId: string,
  creatorTopics: string[] = [],
  limit = 4,
): Promise<Creator[]> {
  const supabase = createClient();
  if (!supabase) return [];

  // 1) 이 채널 팔로워들
  const { data: followers } = await supabase
    .from('creator_follows')
    .select('user_id')
    .eq('creator_id', creatorId)
    .limit(200);

  const followerIds = (followers || []).map((r: any) => r.user_id);

  // 2) 그 사용자들이 팔로우하는 다른 채널 집계
  let coCounts = new Map<string, number>();
  if (followerIds.length > 0) {
    const { data: others } = await supabase
      .from('creator_follows')
      .select('creator_id')
      .in('user_id', followerIds)
      .neq('creator_id', creatorId)
      .limit(500);

    for (const row of others || []) {
      const id = (row as any).creator_id;
      coCounts.set(id, (coCounts.get(id) || 0) + 1);
    }
  }

  // 3) 빈도순 정렬
  const ranked = Array.from(coCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  // 4) 추천 결과 조회
  let recommendIds = ranked.slice(0, limit);

  // 5) 데이터 부족 시 같은 토픽 fallback
  if (recommendIds.length < limit && creatorTopics.length > 0) {
    const { data: byTopic } = await supabase
      .from('creators')
      .select('id, topics')
      .eq('is_published', true)
      .neq('id', creatorId)
      .overlaps('topics', creatorTopics)
      .order('follower_count', { ascending: false })
      .limit(limit * 2);
    const topicIds = (byTopic || [])
      .map((c: any) => c.id)
      .filter((id: string) => !recommendIds.includes(id));
    recommendIds = [...recommendIds, ...topicIds].slice(0, limit);
  }

  if (recommendIds.length === 0) return [];

  const { data } = await supabase
    .from('creators')
    .select('*')
    .in('id', recommendIds)
    .eq('is_published', true);

  // 빈도순 유지
  const list = (data || []) as Creator[];
  const ordered = recommendIds
    .map(id => list.find(c => c.id === id))
    .filter((c): c is Creator => Boolean(c));
  return ordered;
}
