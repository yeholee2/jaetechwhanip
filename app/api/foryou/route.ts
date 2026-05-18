/**
 * GET /api/foryou — 홈 개인화 번들.
 *
 * 서버 사이드 fetchForYou 를 클라이언트에서 호출 가능하게 래핑.
 * 홈 페이지가 force-dynamic 안 되어도 개인화 영역 별도 fetch 가능.
 */
import { NextResponse } from 'next/server';
import { fetchForYou } from '@/lib/forYou';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const bundle = await fetchForYou();
  return NextResponse.json(bundle, {
    headers: {
      // 개인화 데이터 — 캐시 금지
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    },
  });
}
