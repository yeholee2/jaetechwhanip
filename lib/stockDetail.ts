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
 * 이 종목을 가장 많이 담은 ETF Top N.
 *
 * 전략:
 *  - 시드/DB ETF 중 미국 시장 위주 스캔 (한국 ETF는 Yahoo topHoldings 잘 안 줌)
 *  - 종목 심볼 정규화 (BRK.B / BRK-B 매칭)
 *  - 비중 내림차순
 */
export async function fetchTopEtfsHolding(symbol: string, limit = 10): Promise<EtfExposure[]> {
  const target = symbol.toUpperCase().replace(/[.\-_]/g, '');
  const all = await fetchEtfs(1000).catch(() => [] as Awaited<ReturnType<typeof fetchEtfs>>);
  // 미국/해외 ETF 우선 스캔. (KR ETF holdings는 Yahoo가 잘 못줌)
  const candidates = all
    .filter(e => !/^[0-9]{6}$/.test(e.code))
    .slice(0, 80); // 안전 캡

  const results = await parallelLimit(candidates, 8, async (etf) => {
    try {
      const data = await fetchEtfHoldings(etf.code);
      if (!data?.holdings) return null;
      const hit = data.holdings.find(h => {
        const s = (h.symbol || '').toUpperCase().replace(/[.\-_]/g, '');
        return s === target;
      });
      if (!hit) return null;
      const exposure: EtfExposure = {
        etfCode: etf.code,
        etfSlug: etf.slug,
        etfName: etf.name,
        etfShortName: etf.shortName,
        issuer: etf.issuer,
        weight: hit.weight,
        aum: etf.aum,
      };
      return exposure;
    } catch { return null; }
  });

  return (results.filter(Boolean) as EtfExposure[])
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
