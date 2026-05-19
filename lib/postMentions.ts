/**
 * 종목/ETF 로 글 역방향 검색.
 *
 *   fetchPostsBySymbol('AAPL', 8)
 *   fetchPostsByEtfCode('069500', 8)
 *
 * post_mentions 인덱스 활용 — O(1).
 */

export type PostWithCreator = {
  id: string;
  title: string;
  slug: string;
  preview: string | null;
  cover_url: string | null;
  is_member_only: boolean;
  published_at: string | null;
  view_count: number;
  like_count: number;
  weight: number;          // mention 가중치
  creator: {
    slug: string;
    display_name: string;
    avatar_url: string | null;
  };
};

function normalize(s: string): string {
  return s.toUpperCase().replace(/[.\-_\s]/g, '');
}

export async function fetchPostsBySymbol(symbol: string, limit = 8): Promise<PostWithCreator[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];

  const norm = normalize(symbol);
  const params = new URLSearchParams({
    select: `
      symbol, weight,
      creator_posts:post_id (
        id, title, slug, preview, cover_url, is_member_only,
        published_at, view_count, like_count, is_published,
        creators:creator_id ( slug, display_name, avatar_url )
      )
    `,
    symbol: `eq.${norm}`,
    order: 'weight.desc',
    limit: String(limit * 2),
  });
  const response = await fetch(`${url}/rest/v1/post_mentions?${params.toString()}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(1000),
  }).catch(() => null);
  if (!response?.ok) return [];

  const data = await response.json().catch(() => []);
  const rows = (data || []) as any[];
  const out: PostWithCreator[] = [];
  for (const r of rows) {
    const p = r.creator_posts;
    if (!p?.is_published) continue;
    out.push({
      id: p.id,
      title: p.title,
      slug: p.slug,
      preview: p.preview,
      cover_url: p.cover_url,
      is_member_only: p.is_member_only,
      published_at: p.published_at,
      view_count: p.view_count,
      like_count: p.like_count,
      weight: r.weight,
      creator: {
        slug: p.creators?.slug || '',
        display_name: p.creators?.display_name || '',
        avatar_url: p.creators?.avatar_url || null,
      },
    });
    if (out.length >= limit) break;
  }
  return out;
}
