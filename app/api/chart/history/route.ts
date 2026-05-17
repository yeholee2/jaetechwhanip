/**
 * 차트용 가격 시계열 + 거래량.
 *
 * GET /api/chart/history?code=AAPL&tf=1d
 *   tf (timeframe):
 *     5m  → 5분봉 (최근 5일)
 *     1d  → 일봉 (최근 5년)
 *     1w  → 주봉 (max)
 *     1mo → 월봉 (max)
 *     1y  → 연봉 (max)
 *   range 파라미터도 받음 (legacy): 1y, 3y 등 → 1d 일봉으로 매핑
 *
 * 응답:
 *   { symbol, currency, regularMarketPrice, previousClose, candles: [{time, open, high, low, close, volume}] }
 *
 * Edge 캐시: 인트라데이 60s, 일봉 이상 1시간.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

type Candle = { time: string | number; open: number; high: number; low: number; close: number; volume?: number };

function toYahooSymbol(code: string): string {
  if (/^[0-9]{6}$/.test(code)) return `${code}.KS`;
  return code.toUpperCase();
}

/** 타임프레임 → Yahoo interval + 적절한 range */
function tfToYahoo(tf: string): { interval: string; range: string; cacheSec: number; isIntraday: boolean } {
  switch (tf) {
    case '5m':
    case '5min':
      return { interval: '5m', range: '5d', cacheSec: 60, isIntraday: true };
    case '15m': return { interval: '15m', range: '5d', cacheSec: 60, isIntraday: true };
    case '60m':
    case '1h':
      return { interval: '60m', range: '1mo', cacheSec: 300, isIntraday: true };
    case '1d':
    case 'day':
    case '일':
      return { interval: '1d', range: '5y', cacheSec: 3600, isIntraday: false };
    case '1w':
    case 'week':
    case '주':
      return { interval: '1wk', range: 'max', cacheSec: 3600, isIntraday: false };
    case '1mo':
    case 'month':
    case '월':
      return { interval: '1mo', range: 'max', cacheSec: 3600, isIntraday: false };
    case '1y':
    case 'year':
    case '년':
      return { interval: '3mo', range: 'max', cacheSec: 3600, isIntraday: false }; // Yahoo 1년봉 없어서 3개월봉 대체
    // legacy range params — 다 1d 일봉으로
    case '1mo_range': case '3m': case '6m': case 'ytd': case '3y': case '5y': case 'max':
      return { interval: '1d', range: tf === '1mo_range' ? '1mo' : tf, cacheSec: 3600, isIntraday: false };
    default:
      return { interval: '1d', range: '5y', cacheSec: 3600, isIntraday: false };
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim();
  // tf 우선, 없으면 range (legacy)
  const tfParam = req.nextUrl.searchParams.get('tf')
    || req.nextUrl.searchParams.get('range')
    || '1d';
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 });
  }
  const symbol = toYahooSymbol(code);
  const { interval, range, cacheSec, isIntraday } = tfToYahoo(tfParam);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: cacheSec },
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
    const volume: (number | null)[] = q.volume || [];

    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (c == null || !Number.isFinite(c)) continue;
      const d = new Date(ts[i] * 1000);
      const time = isIntraday
        ? ts[i] // UTCTimestamp (seconds) — lightweight-charts 지원
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      candles.push({
        time,
        open: open[i] ?? c,
        high: high[i] ?? c,
        low: low[i] ?? c,
        close: c,
        volume: volume[i] != null && Number.isFinite(volume[i]) ? volume[i]! : undefined,
      });
    }

    const meta = result.meta || {};
    return NextResponse.json({
      symbol,
      currency: meta.currency,
      regularMarketPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose ?? meta.chartPreviousClose,
      interval,
      candles,
    }, {
      headers: { 'Cache-Control': `public, s-maxage=${cacheSec}, stale-while-revalidate=${cacheSec * 6}` },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'fetch failed' }, { status: 500 });
  }
}
