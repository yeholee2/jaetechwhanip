/**
 * ETF 메타데이터 조회 API.
 * 클라이언트 컴포넌트(HomeWatchWidget 등)가 ETF 코드 목록으로 메타를 가져올 때 사용.
 *
 * GET /api/etf/meta?codes=069500,360750&slugs=tiger-미국sp500
 *   → { items: [{ code, shortName, name, slug, issuer }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchEtfs } from '@/lib/etfsDb';

export const revalidate = 600;
export const runtime = 'nodejs';

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('codes') ?? '';
  const codes = raw
    .split(',')
    .map(c => c.trim())
    .filter(Boolean)
    .slice(0, 50); // 최대 50개
  const rawSlugs = req.nextUrl.searchParams.get('slugs') ?? '';
  const slugs = rawSlugs
    .split(',')
    .map(slug => safeDecode(slug.trim()))
    .filter(Boolean)
    .slice(0, 50);

  if (codes.length === 0 && slugs.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const all = await fetchEtfs(2000);
  const seen = new Set<string>();
  const matches = [
    ...codes.map(code => all.find(e => e.code === code)),
    ...slugs.map(slug => all.find(e => e.slug === slug)),
  ].filter((e): e is NonNullable<typeof e> => {
    if (!e || seen.has(e.code)) return false;
    seen.add(e.code);
    return true;
  });

  const items = matches
    .map(e => ({
      code: e.code,
      shortName: e.shortName,
      name: e.name,
      slug: e.slug,
      issuer: e.issuer,
      price: e.price,
      change: e.change,
      changeTone: e.changeTone,
    }));

  return NextResponse.json({ items });
}
