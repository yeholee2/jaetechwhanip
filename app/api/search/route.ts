/**
 * 글로벌 검색 — ⌘+K.
 *
 * 소스 4종:
 *  - Q&A 질문 (questions)
 *  - ETF (lib/etfsDb)
 *  - 크리에이터 (creators)
 *  - 재테크한입 블로그 (Ghost RSS, 캐시 사용)
 *
 * 각 소스당 최대 5건, 정렬은 source 별 의미 있는 것.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchEtfs } from '@/lib/etfsDb';
import { fetchHannipBlog } from '@/lib/newsFeed';

export const runtime = 'nodejs';

export type SearchHit = {
  kind: 'qa' | 'etf' | 'creator' | 'blog';
  id: string;
  title: string;
  subtitle?: string | null;
  url: string;
  meta?: string | null;
};

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 1) {
    return NextResponse.json({ q, hits: [] as SearchHit[] });
  }
  const supabase = createClient();

  const [qa, etfs, creators, blog] = await Promise.all([
    searchQuestions(supabase, q),
    searchEtfs(q),
    searchCreators(supabase, q),
    searchBlog(q),
  ]);

  const hits: SearchHit[] = [...etfs, ...creators, ...qa, ...blog];
  return NextResponse.json({ q, hits });
}

async function searchQuestions(supabase: any, q: string): Promise<SearchHit[]> {
  if (!supabase) return [];
  const like = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`;
  const { data } = await supabase
    .from('questions')
    .select('id, title, body, slug, category, view_count, answer_count')
    .or(`title.ilike.${like},body.ilike.${like}`)
    .order('view_count', { ascending: false })
    .limit(5);
  return (data || []).map((row: any) => ({
    kind: 'qa' as const,
    id: `qa-${row.id}`,
    title: row.title,
    subtitle: row.body?.replace(/\s+/g, ' ').slice(0, 80) || null,
    url: `/q/${encodeURIComponent(row.slug || row.id)}`,
    meta: `${row.category || 'Q&A'} · 조회 ${row.view_count || 0} · 답변 ${row.answer_count || 0}`,
  }));
}

async function searchEtfs(q: string): Promise<SearchHit[]> {
  const lower = q.toLowerCase();
  const all = await fetchEtfs(2000);
  return all
    .filter(e => {
      return (
        e.name.toLowerCase().includes(lower) ||
        (e.shortName || '').toLowerCase().includes(lower) ||
        e.code.toLowerCase().includes(lower) ||
        (e.slug || '').toLowerCase().includes(lower) ||
        (e.theme || '').toLowerCase().includes(lower)
      );
    })
    .slice(0, 5)
    .map(e => ({
      kind: 'etf' as const,
      id: `etf-${e.code}`,
      title: e.shortName || e.name,
      subtitle: e.name,
      url: `/etf/${encodeURIComponent(e.slug || e.code)}`,
      meta: `${e.code}${e.issuer ? ` · ${e.issuer}` : ''}${e.theme ? ` · ${e.theme}` : ''}`,
    }));
}

async function searchCreators(supabase: any, q: string): Promise<SearchHit[]> {
  if (!supabase) return [];
  const like = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`;
  const { data } = await supabase
    .from('creators')
    .select('id, display_name, slug, bio, topics, follower_count')
    .eq('is_published', true)
    .or(`display_name.ilike.${like},bio.ilike.${like}`)
    .order('follower_count', { ascending: false })
    .limit(5);
  return (data || []).map((row: any) => ({
    kind: 'creator' as const,
    id: `creator-${row.id}`,
    title: row.display_name,
    subtitle: row.bio?.slice(0, 80) || null,
    url: `/creator/${encodeURIComponent(row.slug)}`,
    meta: `핀플루언서 · ${(row.topics || []).slice(0, 2).join(' · ') || ''}`,
  }));
}

async function searchBlog(q: string): Promise<SearchHit[]> {
  const lower = q.toLowerCase();
  const posts = await fetchHannipBlog(40);
  return posts
    .filter(p =>
      p.title.toLowerCase().includes(lower) ||
      (p.summary || '').toLowerCase().includes(lower),
    )
    .slice(0, 5)
    .map(p => ({
      kind: 'blog' as const,
      id: p.id,
      title: p.title,
      subtitle: p.summary || null,
      url: p.url,
      meta: '재테크 한입 블로그',
    }));
}
