/**
 * GET /api/quote/[symbol]
 *
 * 단일 종목의 실시간 시세 — 시장별 자동 라우팅.
 *  - KR 6자리 코드 → Naver (거의 실시간)
 *  - 그 외 → Finnhub (진짜 실시간) → Yahoo (15분 지연)
 *
 * 클라이언트에서 폴링하기 좋게 짧은 캐시 (15s).
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/realtimeQuote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol || '').trim();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const quote = await fetchQuote(symbol);
  if (!quote) return NextResponse.json({ error: 'not found', symbol }, { status: 404 });

  return NextResponse.json(quote, {
    headers: {
      'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=60',
    },
  });
}
