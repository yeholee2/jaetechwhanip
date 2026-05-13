/**
 * DB-first 대가 13F 조회 (Supabase whale_filings).
 * DB에 없거나 빈 경우 시드(portfolioWhales.ts) fallback.
 *
 * UI에서는 이걸 호출하면 됨 — 시드 vs 실시간 자동 분기.
 */

import { WHALE_PORTFOLIOS, type WhalePortfolio, type WhaleHolding, getWhaleBySlug } from './portfolioWhales';

type DbHolding = {
  cusip: string;
  name: string;
  ticker?: string;
  valueMln: number;
  shares?: number;
  weight: number;
  putCall?: string | null;
};

type DbRow = {
  cik: string;
  manager_slug: string;
  manager_name: string;
  fund_name: string;
  quarter: string;
  filed_at: string;
  total_value_mln: number | null;
  position_count: number | null;
  holdings: DbHolding[];
  updated_at: string;
};

function dbToWhale(row: DbRow): WhalePortfolio {
  // 시드 메타(tagline, philosophy)는 유지
  const seed = getWhaleBySlug(row.manager_slug);
  const topHoldings: WhaleHolding[] = (row.holdings || []).map(h => ({
    ticker: h.ticker || h.cusip.slice(0, 6), // ticker 없으면 cusip 앞 6자
    name: h.name,
    weight: h.weight,
    valueMln: h.valueMln,
    change: undefined, // 직전 분기 비교는 향후 (2개 분기 저장 시 가능)
    kind: 'stock' as const,
  }));
  return {
    slug: row.manager_slug,
    name: row.fund_name,
    manager: row.manager_name,
    cik: row.cik,
    quarter: row.quarter,
    filedAt: row.filed_at,
    totalValueMln: Number(row.total_value_mln) || 0,
    positionCount: row.position_count || topHoldings.length,
    tagline: seed?.tagline || '',
    philosophy: seed?.philosophy || '',
    topHoldings,
  };
}

let memoryCache: { data: WhalePortfolio[]; expiresAt: number } | null = null;

export async function fetchWhales(): Promise<WhalePortfolio[]> {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) return memoryCache.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return WHALE_PORTFOLIOS;

  try {
    const res = await fetch(`${url}/rest/v1/whale_filings?select=*&order=filed_at.desc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return WHALE_PORTFOLIOS;
    const rows: DbRow[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return WHALE_PORTFOLIOS;

    // DB 결과를 시드 순서대로 정렬 + 누락된 매니저는 시드로 채움
    const bySlug = new Map(rows.map(r => [r.manager_slug, dbToWhale(r)]));
    const merged = WHALE_PORTFOLIOS.map(seed => bySlug.get(seed.slug) || seed);

    memoryCache = { data: merged, expiresAt: now + 30 * 60 * 1000 };
    return merged;
  } catch {
    return WHALE_PORTFOLIOS;
  }
}

export async function fetchWhaleBySlug(slug: string): Promise<WhalePortfolio | undefined> {
  const all = await fetchWhales();
  return all.find(w => w.slug === slug);
}
