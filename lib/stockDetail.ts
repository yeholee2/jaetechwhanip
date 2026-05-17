/**
 * 종목 상세 — Yahoo quoteSummary + 역방향 ETF 노출도.
 *
 * 역방향 노출도:
 *  - 우리 DB의 ETF 들을 스캔
 *  - 각 ETF의 holdings 에 이 symbol 이 들어있는지 확인
 *  - 비중 내림차순 Top N 반환
 *
 *  ETF holdings 는 Yahoo (12h cache).  스캔 동시성 8.
 */
import { fetchEtfHoldings } from '@/lib/etfHoldings';
import { fetchEtfs } from '@/lib/etfsDb';
import { findEtfsHoldingSymbol, getHoldingsCached, upsertHoldings, normalizeSymbol } from '@/lib/holdingsCache';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15';

export type StockProfile = {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  previousClose?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  longBusinessSummary?: string;
  website?: string;
};

export type EtfExposure = {
  etfCode: string;
  etfSlug?: string;
  etfName: string;
  etfShortName?: string;
  issuer?: string;
  weight: number; // 0~1
  aum?: string;
};

let crumbCache: { crumb: string; cookie: string; expiresAt: number } | null = null;

async function getCrumbAndCookie(): Promise<{ crumb: string; cookie: string } | null> {
  const now = Date.now();
  if (crumbCache && crumbCache.expiresAt > now) return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  try {
    const cookieRes = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA }, redirect: 'manual' });
    const setCookie = cookieRes.headers.get('set-cookie') || '';
    if (!setCookie) return null;
    const cookie = setCookie.split(',').map(c => c.split(';')[0]).join('; ');
    const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': UA, Cookie: cookie },
    });
    if (!crumbRes.ok) return null;
    const crumb = (await crumbRes.text()).trim();
    if (!crumb) return null;
    crumbCache = { crumb, cookie, expiresAt: now + 12 * 3600 * 1000 };
    return { crumb, cookie };
  } catch { return null; }
}

function toYahooSymbol(code: string): string {
  if (/^[0-9]{6}$/.test(code)) return `${code}.KS`;
  return code.toUpperCase();
}

/** Yahoo quoteSummary 로 종목 프로필 + 시세 */
export async function fetchStockProfile(symbol: string): Promise<StockProfile | null> {
  const auth = await getCrumbAndCookie();
  if (!auth) return null;
  const yahooSym = toYahooSymbol(symbol);
  const modules = 'price,summaryDetail,defaultKeyStatistics,assetProfile';
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSym)}?modules=${modules}&crumb=${encodeURIComponent(auth.crumb)}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, Cookie: auth.cookie },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.quoteSummary?.result?.[0];
    if (!result) return null;
    const price = result.price || {};
    const sd = result.summaryDetail || {};
    const dks = result.defaultKeyStatistics || {};
    const ap = result.assetProfile || {};
    return {
      symbol: yahooSym,
      name: price.longName || price.shortName || symbol,
      exchange: price.exchangeName,
      currency: price.currency,
      sector: ap.sector,
      industry: ap.industry,
      marketCap: price.marketCap?.raw,
      regularMarketPrice: price.regularMarketPrice?.raw,
      regularMarketChangePercent: price.regularMarketChangePercent?.raw,
      previousClose: sd.previousClose?.raw ?? price.regularMarketPreviousClose?.raw,
      trailingPE: sd.trailingPE?.raw,
      forwardPE: sd.forwardPE?.raw,
      dividendYield: sd.dividendYield?.raw,
      fiftyTwoWeekHigh: sd.fiftyTwoWeekHigh?.raw,
      fiftyTwoWeekLow: sd.fiftyTwoWeekLow?.raw,
      longBusinessSummary: ap.longBusinessSummary,
      website: ap.website,
    };
  } catch { return null; }
}

/** 동시성 제한 병렬 실행 */
async function parallelLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }));
  return out;
}

/**
 * 이 종목을 가장 많이 담은 ETF Top N — Supabase 캐시 우선.
 *
 * 흐름:
 *  1. etf_holdings_cache 에서 symbol 인덱스로 한 방 조회 (O(1))
 *  2. 캐시 빈약하면 live scan (Yahoo) 으로 채우고 다시 조회
 *  3. live scan 도 캐시에 upsert 해서 다음 번에는 O(1)
 */
export async function fetchTopEtfsHolding(symbol: string, limit = 10): Promise<EtfExposure[]> {
  // 1) 캐시 우선
  const cached = await findEtfsHoldingSymbol(symbol, limit);
  if (cached.length >= 3) {
    return cached.map(row => ({
      etfCode: row.etf_code,
      etfSlug: row.etfs?.slug,
      etfName: row.etfs?.name || row.etf_code,
      etfShortName: row.etfs?.short_name,
      issuer: row.etfs?.issuer,
      weight: row.weight,
      aum: row.etfs?.aum || undefined,
    }));
  }

  // 2) 캐시 부족 → live scan 으로 채우기
  const target = normalizeSymbol(symbol);
  const all = await fetchEtfs(1000).catch(() => [] as Awaited<ReturnType<typeof fetchEtfs>>);
  const candidates = all
    .filter(e => !/^[0-9]{6}$/.test(e.code)) // KR ETF는 Yahoo 부족
    .slice(0, 80);

  await parallelLimit(candidates, 8, async (etf) => {
    try {
      const data = await fetchEtfHoldings(etf.code);
      if (data?.holdings?.length) {
        await upsertHoldings(etf.code, data.holdings, 'yahoo');
      }
    } catch { /* ignore */ }
  });

  // 3) 다시 캐시에서 조회 — 이번엔 풍부함
  const refreshed = await findEtfsHoldingSymbol(symbol, limit);
  if (refreshed.length > 0) {
    return refreshed.map(row => ({
      etfCode: row.etf_code,
      etfSlug: row.etfs?.slug,
      etfName: row.etfs?.name || row.etf_code,
      etfShortName: row.etfs?.short_name,
      issuer: row.etfs?.issuer,
      weight: row.weight,
      aum: row.etfs?.aum || undefined,
    }));
  }

  // 4) 그래도 없으면 캐시에 있는 것만이라도
  return cached.map(row => ({
    etfCode: row.etf_code,
    etfSlug: row.etfs?.slug,
    etfName: row.etfs?.name || row.etf_code,
    etfShortName: row.etfs?.short_name,
    issuer: row.etfs?.issuer,
    weight: row.weight,
    aum: row.etfs?.aum || undefined,
  }));
}
