/**
 * Creator Platform — 핀플루언서 신청·승인·콘텐츠 타입.
 */

export type CreatorApplicationStatus = 'pending' | 'approved' | 'rejected';

export type CreatorApplication = {
  id: string;
  user_id: string;
  display_name: string;
  slug?: string | null;
  bio: string;
  channel_url?: string | null;
  follower_count?: number | null;
  topics: string[];
  sample_content?: string | null;
  motivation?: string | null;
  status: CreatorApplicationStatus;
  reject_reason?: string | null;
  applied_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};

export type Creator = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  channel_url?: string | null;
  topics: string[];
  membership_enabled: boolean;
  membership_price_won?: number | null;
  membership_tier_name: string;
  membership_perks?: string | null;
  follower_count: number;
  member_count: number;
  post_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type CreatorPost = {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  body?: string | null;
  cover_url?: string | null;
  preview?: string | null;
  is_member_only: boolean;
  is_published: boolean;
  video_url?: string | null;
  video_provider?: 'mux' | 'vimeo' | 'youtube' | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  published_at: string;
  updated_at: string;
};

export function creatorPath(slug: string): string {
  return `/creator/${encodeURIComponent(slug)}`;
}

/** slug 정규화 — 영문 소문자/숫자/대시만 허용 */
export function normalizeSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}
