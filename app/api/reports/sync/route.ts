/**
 * 리포트 자동 수집 cron 엔드포인트 (Phase 6-D)
 *
 * 인증:
 *  - Vercel Cron이 자동으로 호출할 때는 `Authorization: Bearer ${CRON_SECRET}` 헤더가 붙음
 *  - 수동 호출 시에도 동일 시크릿 필요
 *
 * 동작:
 *  1. collectAllReports() 로 RSS + DART에서 신규 항목 가져옴
 *  2. URL 기준 upsert (이미 있으면 스킵, dedup은 unique 제약)
 *  3. 결과 요약 JSON 반환
 *
 * 환경변수:
 *  CRON_SECRET                — 호출 인증
 *  SUPABASE_SERVICE_ROLE_KEY  — DB 쓰기 (RLS 우회)
 *  DART_API_KEY, DART_CORP_CODES — 옵션
 *  REPORT_SOURCE_RSS          — 옵션 (콤마구분 "name|url|category")
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectAllReports } from '@/lib/reportSources';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: 'supabase admin client unavailable' }, { status: 500 });
  }

  const collected = await collectAllReports();
  if (collected.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0, skipped: 0, sources: 0, note: 'no sources configured or all empty' });
  }

  let inserted = 0;
  let skipped = 0;
  const errors: Array<{ url: string; message: string }> = [];

  // url unique 제약 활용: insert 후 conflict 시 skip
  for (const item of collected) {
    const { error } = await admin.from('reports').insert({
      source: item.source,
      title: item.title,
      summary: item.summary,
      url: item.url,
      thumbnail_url: item.thumbnailUrl,
      category: item.category,
      related_etf_codes: item.relatedEtfCodes,
      published_at: item.publishedAt,
    });
    if (error) {
      if (error.code === '23505') {
        skipped += 1; // duplicate
      } else {
        errors.push({ url: item.url, message: error.message });
      }
    } else {
      inserted += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    inserted,
    skipped,
    sources_total_fetched: collected.length,
    errors: errors.slice(0, 10),
  });
}
