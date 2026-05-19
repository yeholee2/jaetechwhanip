/**
 * ETF 보유종목 Supabase 캐시.
 *
 * 핵심:
 *  - `etf_holdings_cache(etf_code, symbol PRIMARY KEY, weight, ...)`
 *  - `symbol` 은 정규화된 키: 대문자 + .,-,_ 제거 (BRK.B / BRK-B 동일하게 매칭)
 *  - `display_symbol` 로 원본 보존
 *
 * 흐름:
 *   getHoldingsCached(etfCode)  → 캐시 24h 이내면 즉시 반환, 아니면 fetcher 호출 + upsert
 *   findEtfsHoldingSymbol(sym)  → SQL 한 방으로 역방향 검색
 *   upsertHoldings(etfCode, ..) → 외부에서 수동 채울 때
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchEtfHoldings, type HoldingItem, type EtfHoldingsData } from '@/lib/etfHoldings';
import { fetchEtfByCode } from '@/lib/etfsDb';
import { fetchNaverHoldings } from '@/lib/naverHoldings';

const CACHE_TTL_HOURS = 24;

export function normalizeSymbol(s: string): string {
  return s.toUpperCase().replace(/[.\-_\s]/g, '');
}

export type CachedHolding = {
  etf_code: string;
  symbol: string;          // normalized
  display_symbol: string;
  name: string;
  weight: number;
  sector?: string | null;
  source: string;
  updated_at: string;
};

function isKrHoldingCode(etfCode: string) {
  return /^[0-9A-Z]{6}$/.test(etfCode.toUpperCase());
}

function cachedRowsToData(rows: CachedHolding[]): EtfHoldingsData | null {
  if (rows.length === 0) return null;
  return {
    holdings: rows.map(r => ({ symbol: r.display_symbol, name: r.name, weight: r.weight })),
    sectors: [],
    source: rows[0]?.source?.startsWith('naver') ? 'naver' : 'yahoo',
  };
}

/** 캐시에서 ETF 보유종목 조회 (TTL 무시, 그냥 있는 것 다 반환) */
export async function getCachedHoldings(etfCode: string): Promise<CachedHolding[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('etf_holdings_cache')
    .select('*')
    .eq('etf_code', etfCode)
    .order('weight', { ascending: false });
  return (data || []) as CachedHolding[];
}

/** 캐시 fresh 여부 — 첫 행의 updated_at 기준 */
function isFresh(rows: CachedHolding[]): boolean {
  if (rows.length === 0) return false;
  const ageMs = Date.now() - new Date(rows[0].updated_at).getTime();
  return ageMs < CACHE_TTL_HOURS * 3600 * 1000;
}

/**
 * 캐시 우선 보유종목 조회 + lazy refresh.
 * stale 이면 외부에서 새로 받아 upsert.
 */
export async function getHoldingsCached(etfCode: string): Promise<HoldingItem[]> {
  const cached = await getCachedHoldings(etfCode);
  if (isFresh(cached)) {
    return cached.map(r => ({ symbol: r.display_symbol, name: r.name, weight: r.weight }));
  }

  // stale → 외부 fetch (Yahoo). KR ETF 는 보통 실패하나 시도는 함.
  const live = await fetchEtfHoldings(etfCode).catch(() => null);
  if (live?.holdings?.length) {
    await upsertHoldings(etfCode, live.holdings, 'yahoo');
    if (live.expenseRatio != null || live.dividendYield != null || live.totalAssets != null) {
      await upsertMeta(etfCode, {
        expense_ratio: live.expenseRatio,
        dividend_yield: live.dividendYield,
        total_assets: live.totalAssets,
        source: 'yahoo',
      });
    }
    return live.holdings;
  }

  // live 실패 → stale 캐시라도 있으면 반환 (없으면 빈 배열)
  return cached.map(r => ({ symbol: r.display_symbol, name: r.name, weight: r.weight }));
}

/** ETF 메타 (운용보수·배당·AUM) 캐시 with TTL 24h */
export async function getMetaCached(etfCode: string): Promise<{
  expense_ratio?: number; dividend_yield?: number; total_assets?: number;
} | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from('etf_meta_cache')
    .select('*')
    .eq('etf_code', etfCode)
    .maybeSingle();
  return data as any;
}

/** holdings upsert — symbol 은 정규화하여 저장 */
export async function upsertHoldings(
  etfCode: string,
  items: HoldingItem[],
  source: string,
): Promise<{ ok: boolean; count: number; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, count: 0, error: 'no service role' };
  if (items.length === 0) return { ok: true, count: 0 };

  // 1) 기존 cleanup — 같은 etf_code 에 더이상 없는 종목 제거
  await admin.from('etf_holdings_cache').delete().eq('etf_code', etfCode);

  // 2) 새로 insert
  const rows = items
    .filter(h => h.symbol && h.weight > 0)
    .map(h => ({
      etf_code: etfCode,
      symbol: normalizeSymbol(h.symbol),
      display_symbol: h.symbol,
      name: h.name || h.symbol,
      weight: h.weight,
      source,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return { ok: true, count: 0 };

  const { error } = await admin.from('etf_holdings_cache').insert(rows);
  if (error) return { ok: false, count: 0, error: error.message };
  return { ok: true, count: rows.length };
}

export async function upsertMeta(
  etfCode: string,
  meta: { expense_ratio?: number; dividend_yield?: number; total_assets?: number; source: string },
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from('etf_meta_cache').upsert({
    etf_code: etfCode,
    expense_ratio: meta.expense_ratio,
    dividend_yield: meta.dividend_yield,
    total_assets: meta.total_assets,
    source: meta.source,
    updated_at: new Date().toISOString(),
  });
}

/**
 * 종목 → ETF 역방향 검색 (O(1) — symbol 인덱스 사용).
 *
 * 우리 etfs 테이블과 조인해서 slug/name/issuer/aum 까지 한 번에.
 */
export type EtfExposureRow = {
  etf_code: string;
  symbol: string;
  display_symbol: string;
  name: string;
  weight: number;
  etfs?: {
    slug: string;
    name: string;
    short_name: string;
    issuer: string;
    aum: string | null;
  } | null;
};

/**
 * fetchEtfHoldings 래퍼 — 결과를 캐시에 fire-and-forget upsert.
 * ETF 상세 페이지에서 그대로 갈아끼울 수 있음.
 */
export async function fetchEtfHoldingsWithCache(etfCode: string): Promise<EtfHoldingsData | null> {
  const cached = await getCachedHoldings(etfCode).catch(() => []);
  if (isFresh(cached)) return cachedRowsToData(cached);

  // KR ETF는 Yahoo에서 긴 지연/미지원이 잦아 Naver 구성자산만 빠르게 확인한다.
  if (isKrHoldingCode(etfCode)) {
    const naverItems = await fetchNaverHoldings(etfCode).catch(() => []);
    if (naverItems.length > 0) {
      if (naverItems.some(item => item.weight > 0)) {
        upsertHoldings(etfCode, naverItems, 'naver_top').catch(() => {});
      }
      return {
        holdings: naverItems,
        sectors: [],
        source: 'naver',
      };
    }
    return cachedRowsToData(cached);
  }

  // 미국 ETF 등 Yahoo 지원 가능성이 높은 종목만 Yahoo 조회를 시도한다.
  const data = await fetchEtfHoldings(etfCode).catch(() => null);
  if (data?.holdings?.length) {
    upsertHoldings(etfCode, data.holdings, 'yahoo').catch(() => {});
    if (data.expenseRatio != null || data.dividendYield != null || data.totalAssets != null) {
      upsertMeta(etfCode, {
        expense_ratio: data.expenseRatio,
        dividend_yield: data.dividendYield,
        total_assets: data.totalAssets,
        source: 'yahoo',
      }).catch(() => {});
    }
    return { ...data, source: 'yahoo' };
  }

  return cachedRowsToData(cached) || data; // null
}

export async function findEtfsHoldingSymbol(symbol: string, limit = 10): Promise<EtfExposureRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const norm = normalizeSymbol(symbol);
  const { data } = await admin
    .from('etf_holdings_cache')
    .select(`
      etf_code, symbol, display_symbol, name, weight,
      etfs:etf_code ( slug, name, short_name, issuer, aum )
    `)
    .eq('symbol', norm)
    .order('weight', { ascending: false })
    .limit(limit);
  return (data || []) as any as EtfExposureRow[];
}
