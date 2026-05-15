/**
 * "당신을 위한" 홈 개인화 — 로그인 사용자에게만.
 *
 * 3가지:
 *  - 팔로우한 크리에이터 최근 글 (5개)
 *  - 관심 ETF 오늘 변동 큰 순 (5개)
 *  - 내 질문 새 답변 + 내 글에 받은 좋아요/댓글 알림 요약 (3개)
 */

import { createClient } from '@/lib/supabase/server';
import { fetchEtfs } from '@/lib/etfsDb';

export type ForYouCreatorPost = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  preview: string | null;
  is_member_only: boolean;
  published_at: string;
  creator_slug: string;
  creator_name: string;
  creator_avatar: string | null;
};

export type ForYouWatchEtf = {
  code: string;
  slug: string;
  shortName: string;
  name: string;
  change: string;
  changeTone: 'up' | 'down' | 'flat';
};

export type ForYouNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
};

export type ForYouBundle = {
  hasUser: boolean;
  posts: ForYouCreatorPost[];
  watch: ForYouWatchEtf[];
  notifications: ForYouNotification[];
};

export async function fetchForYou(): Promise<ForYouBundle> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { hasUser: false, posts: [], watch: [], notifications: [] };
  }

  const [posts, watch, notifications] = await Promise.all([
    fetchFollowedCreatorPosts(supabase, user.id),
    fetchWatchedEtfs(supabase, user.id),
    fetchRecentNotifications(supabase, user.id),
  ]);

  return { hasUser: true, posts, watch, notifications };
}

async function fetchFollowedCreatorPosts(supabase: any, userId: string): Promise<ForYouCreatorPost[]> {
  const { data: follows } = await supabase
    .from('creator_follows')
    .select('creator_id')
    .eq('user_id', userId);
  const ids = (follows || []).map((f: any) => f.creator_id);
  if (ids.length === 0) return [];

  const { data: posts } = await supabase
    .from('creator_posts')
    .select('id, title, slug, cover_url, preview, is_member_only, published_at, creator_id')
    .in('creator_id', ids)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(5);
  if (!posts || posts.length === 0) return [];

  const creatorIds = Array.from(new Set(posts.map((p: any) => p.creator_id)));
  const { data: creators } = await supabase
    .from('creators')
    .select('id, slug, display_name, avatar_url')
    .in('id', creatorIds);
  const cMap = new Map<string, any>((creators || []).map((c: any) => [c.id, c]));

  return posts.map((p: any) => {
    const c = cMap.get(p.creator_id) || {};
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      cover_url: p.cover_url,
      preview: p.preview,
      is_member_only: p.is_member_only,
      published_at: p.published_at,
      creator_slug: c.slug || '',
      creator_name: c.display_name || '',
      creator_avatar: c.avatar_url || null,
    };
  });
}

async function fetchWatchedEtfs(supabase: any, userId: string): Promise<ForYouWatchEtf[]> {
  const { data: rows } = await supabase
    .from('etf_watches')
    .select('etf_code')
    .eq('user_id', userId)
    .limit(20);
  const codes = (rows || []).map((r: any) => r.etf_code);
  if (codes.length === 0) return [];

  const all = await fetchEtfs(2000);
  const subset = all.filter(e => codes.includes(e.code));

  // 변동 큰 순 정렬 — change 문자열에서 절대값 파싱
  const withMagnitude = subset.map(e => {
    const pct = parseFloat((e.change || '').replace(/[^0-9.\-]/g, '')) || 0;
    return { etf: e, magnitude: Math.abs(pct) };
  });
  withMagnitude.sort((a, b) => b.magnitude - a.magnitude);

  return withMagnitude.slice(0, 5).map(({ etf }) => ({
    code: etf.code,
    slug: etf.slug,
    shortName: etf.shortName || etf.name,
    name: etf.name,
    change: etf.change || '',
    changeTone: etf.changeTone || 'flat',
  }));
}

async function fetchRecentNotifications(supabase: any, userId: string): Promise<ForYouNotification[]> {
  const { data } = await supabase
    .from('user_notifications')
    .select('id, kind, title, body, link, created_at')
    .eq('user_id', userId)
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(3);
  return (data || []) as ForYouNotification[];
}
