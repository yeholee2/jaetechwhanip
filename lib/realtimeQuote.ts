/**
 * 실시간 시세 — 한 함수에서 시장별로 다른 소스 자동 라우팅.
 *
 * 우선순위:
 *  - 6자리 숫자 (KR)  → Naver mobile integration (비공식, 거의 실시간, 키 없음)
 *  - 그 외 (US/기타)  → Finnhub (FINNHUB_API_KEY 있을 때 진짜 실시간)
 *  - Finnhub 없거나 실패 → Yahoo (15분 지연 fallback)
 *
 * 응답은 통일된 Quote 형태로.
 */

export type Quote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;  // 0.0123 = 1.23%
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  currency: string;
  source: 'finnhub' | 'naver' | 'yahoo';
  delayed: boolean;        // true 면 15분 지연
  fetchedAt: string;       // ISO
};

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15';

function isKrCode(s: string): boolean {
  return /^[0-9]{6}$/.test(s);
}

function parseNum(s: string | number | undefined | null): number {
  if (s == null) return NaN;
  if (typeof s === 'number') return s;
  return Number(String(s).replace(/[,+\s]/g, ''));
}

/* ---------- KR: Naver mobile integration ---------- */
async function fetchNaverKr(code: string): Promise<Quote | null> {
  try {
    const url = `https://m.stock.naver.com/api/stock/${encodeURIComponent(code)}/integration`;
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://m.stock.naver.com/',
      },
      next: { revalidate: 15 }, // 15s edge cache
    });
    if (!r.ok) return null;
    const j = await r.json();
    const trend = j?.dealTrendInfos?.[0];
    if (!trend) return null;

    const close = parseNum(trend.closePrice);
    const change = parseNum(trend.compareToPreviousClosePrice);
    if (!Number.isFinite(close)) return null;

    const prev = close - change;
    const volume = parseNum(trend.accumulatedTradingVolume);

    // totalInfos 에서 시/고/저
    let open: number | undefined;
    let high: number | undefined;
    let low: number | undefined;
    for (const t of j?.totalInfos || []) {
      if (t.code === 'openPrice') open = parseNum(t.value);
      else if (t.code === 'highPrice') high = parseNum(t.value);
      else if (t.code === 'lowPrice') low = parseNum(t.value);
    }

    return {
      symbol: code,
      price: close,
      previousClose: prev,
      change,
      changePercent: prev > 0 ? change / prev : 0,
      open: Number.isFinite(open!) ? open : undefined,
      high: Number.isFinite(high!) ? high : undefined,
      low: Number.isFinite(low!) ? low : undefined,
      volume: Number.isFinite(volume) ? volume : undefined,
      currency: 'KRW',
      source: 'naver',
      delayed: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch { return null; }
}

/* ---------- US/기타: Finnhub ---------- */
async function fetchFinnhub(symbol: string): Promise<Quote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${key}`;
    const r = await fetch(url, { next: { revalidate: 15 } });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Number.isFinite(j?.c) || j.c === 0) return null; // 휴장/심볼 오류
    return {
      symbol: symbol.toUpperCase(),
      price: j.c,
      previousClose: j.pc,
      change: j.d,
      changePercent: (j.dp ?? 0) / 100,
      open: j.o || undefined,
      high: j.h || undefined,
      low: j.l || undefined,
      currency: 'USD',
      source: 'finnhub',
      delayed: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch { return null; }
}

/* ---------- fallback: Yahoo (15분 지연) ---------- */
async function fetchYahoo(symbol: string): Promise<Quote | null> {
  const yahooSym = isKrCode(symbol) ? `${symbol}.KS` : symbol.toUpperCase();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSym)}?interval=1d&range=5d`;
    const r = await fetch(url, {
      headers: { 'User-Agent': UA },
      next: { revalidate: 60 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta || !Number.isFinite(meta.regularMarketPrice)) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change = price - prev;
    return {
      symbol: yahooSym,
      price,
      previousClose: prev,
      change,
      changePercent: prev > 0 ? change / prev : 0,
      currency: meta.currency || (isKrCode(symbol) ? 'KRW' : 'USD'),
      source: 'yahoo',
      delayed: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch { return null; }
}

/** 통합 진입점 — 시장별 라우팅 + fallback */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  const s = symbol.trim();
  if (!s) return null;

  // KR 6자리 코드: Naver 우선
  if (isKrCode(s)) {
    const naver = await fetchNaverKr(s);
    if (naver) return naver;
    return fetchYahoo(s);
  }

  // 그 외: Finnhub 우선
  const fh = await fetchFinnhub(s);
  if (fh) return fh;
  return fetchYahoo(s);
}
