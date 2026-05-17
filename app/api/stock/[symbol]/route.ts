/**
 * GET /api/stock/[symbol]
 *
 * 종목 한 개의 상세 — 차트 데이터는 /api/chart/history 로 따로 받음.
 * 응답:
 *  - profile: 이름·섹터·시가총액·PER·52주 등
 *  - topEtfs: 이 종목을 가장 많이 담은 ETF Top 10 (비중 정렬)
 *
 * Cache: profile 1h, topEtfs 6h (Yahoo 부담 줄이기).
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchStockProfile, fetchTopEtfsHolding } from '@/lib/stockDetail';

export const runtime = 'nodejs';
export const revalidate = 3600;

export async function GET(_req: NextRequest, { params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol || '').trim();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const [profile, topEtfs] = await Promise.all([
    fetchStockProfile(symbol),
    fetchTopEtfsHolding(symbol, 10).catch(() => []),
  ]);

  if (!profile && topEtfs.length === 0) {
    return NextResponse.json({ error: 'not found', symbol }, { status: 404 });
  }

  return NextResponse.json({
    symbol,
    profile,
    topEtfs,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600' },
  });
}
