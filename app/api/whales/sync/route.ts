/**
 * GET /api/whales/sync — 분기마다 13F 자동 갱신 (Vercel Cron 일 1회).
 *
 * 시드 매니저 목록 순회 → 최신 13F-HR fetch → Supabase upsert.
 * 13F는 분기마다만 갱신되므로 매일 호출해도 새 데이터가 있을 때만 변경됨.
 *
 * 인증: Authorization: Bearer {CRON_SECRET}
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetch13FSnapshot } from '@/lib/edgar';
import { WHALE_PORTFOLIOS } from '@/lib/portfolioWhales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 240;

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'supabase admin unavailable' }, { status: 500 });
  }

  // 시드 매니저들 — 시드 정의된 cik 사용
  const managers = WHALE_PORTFOLIOS.map(w => ({
    cik: w.cik,
    slug: w.slug,
    name: w.manager,
    fund: w.name,
  }));

  const results: Array<{ slug: string; status: string; quarter?: string; count?: number; error?: string }> = [];

  // rate limit 친화적으로 순차 처리 (SEC: 10 req/sec)
  for (const m of managers) {
    try {
      const snap = await fetch13FSnapshot(m.cik, 20);
      if (!snap) {
        results.push({ slug: m.slug, status: 'no_filing' });
        continue;
      }
      const { error } = await admin.from('whale_filings').upsert({
        cik: snap.cik,
        manager_slug: m.slug,
        manager_name: m.name,
        fund_name: m.fund,
        quarter: snap.quarter,
        filed_at: snap.filedAt,
        total_value_mln: snap.totalValueMln,
        position_count: snap.positionCount,
        holdings: snap.topHoldings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'cik' });
      if (error) {
        results.push({ slug: m.slug, status: 'db_error', error: error.message });
      } else {
        results.push({ slug: m.slug, status: 'ok', quarter: snap.quarter, count: snap.positionCount });
      }
    } catch (e) {
      results.push({ slug: m.slug, status: 'fetch_error', error: e instanceof Error ? e.message : String(e) });
    }
    // 200ms backoff
    await new Promise(r => setTimeout(r, 200));
  }

  return NextResponse.json({ checked: managers.length, results });
}
