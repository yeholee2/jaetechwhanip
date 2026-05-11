/**
 * ETF 실시간 시세 API.
 * 금융위원회 증권상품시세정보(공공데이터포털) 결과를 JSON으로 반환.
 *
 * 환경변수: DATA_GO_KR_SERVICE_KEY (없으면 fallback 시드만 반환)
 *
 * GET /api/etf/prices
 *   → { items: [{ code, price, change, changeTone, volume, aum, nav, baseDate, dataSource }], source: 'live' | 'fallback' }
 */

import { NextResponse } from 'next/server';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';

export const revalidate = 300; // 5분 캐시
export const runtime = 'nodejs';

export async function GET() {
  const all = await getEtfsWithMarketData();
  const items = all.map(etf => ({
    code: etf.code,
    price: etf.price,
    change: etf.change,
    changeTone: etf.changeTone,
    volume: etf.volume,
    aum: etf.aum,
    nav: etf.nav,
    baseDate: etf.baseDate,
    dataSource: etf.dataSource,
  }));
  const liveCount = items.filter(i => i.dataSource === 'public-api').length;
  return NextResponse.json({
    items,
    source: liveCount > 0 ? 'live' : 'fallback',
    liveCount,
    totalCount: items.length,
    fetchedAt: new Date().toISOString(),
  });
}
