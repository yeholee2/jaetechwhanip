/**
 * 차트용 가격 시계열 — lightweight-charts 포맷 (`{ time: 'YYYY-MM-DD', value: number }`).
 *
 * GET /api/chart/history?code=AAPL&range=1y
 *   range: 1m, 3m, 6m, ytd, 1y, 3y, 5y, max
 *
 * 미국 종목/ETF: 그대로
 * 한국 종목: 6자리 숫자 → .KS
 *
 * Edge 캐시 1시간.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const revalidate = 3600;

type Candle = { time: string; open: number; high: number; low: number; close: number };

function toYahooSymbol(code: string): string {
  if (/^[0-9]{6}$/.test(code)) return `${code}.KS`;
  return code.toUpperCase();
}

function rangeToYahoo(r: string): string {
  const map: Record<string, string> = {
    '1m': '1mo', '3m': '3mo', '6m': '6mo', 'ytd': 'ytd',
    '1y': '1y', '3y': '3y', '5y': '5y', 'max': 'max',
  };
  return map[r] || '1y';
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim();
  const range = req.nextUrl.searchParams.get('range') || '1y';
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }
  const symbol = toYahooSymbol(code);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=${rangeToYahoo(range)}`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) {
      return NextResponse.json({ error: `yahoo ${r.status}` }, { status: 502 });
    }
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ error: 'no data', symbol }, { status: 404 });
    }
    const ts: number[] = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};
    const open: (number | null)[] = q.open || [];
    const high: (number | null)[] = q.high || [];
    const low: (number | null)[] = q.low || [];
    const close: (number | null)[] = q.close || [];

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (c == null || !Number.isFinite(c)) continue;
      const d = new Date(ts[i] * 1000);
      candles.push({
        time: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        open: open[i] ?? c,
        high: high[i] ?? c,
        low: low[i] ?? c,
        close: c,
      });
    }

    const meta = result.meta || {};
    return NextResponse.json({
      symbol,
      currency: meta.currency,
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose ?? meta.chartPreviousClose,
      candles,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
