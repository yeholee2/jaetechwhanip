/**
 * 어드민 — ETF 보유종목 CSV 수동 업로드.
 *
 * KR ETF 처럼 자동 소스가 없는 경우 운용사 공시 (KODEX/TIGER/ACE 등) 의 CSV/Excel 을
 * 어드민이 받아서 붙여넣기로 채움.
 *
 * 요청:
 *   POST /api/admin/holdings/upload
 *   { etfCode: '069500', source: 'manual', items: [{ symbol, name, weight }] }
 *
 *   weight 는 0~1 또는 0~100 둘 다 허용 (자동 정규화)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';
import { upsertHoldings } from '@/lib/holdingsCache';
import type { HoldingItem } from '@/lib/etfHoldings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext();
  if (!ctx.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!ctx.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const etfCode = String(body?.etfCode || '').trim();
  const source = String(body?.source || 'manual').trim();
  const rawItems = Array.isArray(body?.items) ? body.items : [];

  if (!etfCode) return NextResponse.json({ error: 'etfCode required' }, { status: 400 });
  if (rawItems.length === 0) return NextResponse.json({ error: 'items required' }, { status: 400 });

  // weight 0~100 → 0~1 자동 정규화
  const sumWeight = rawItems.reduce((s: number, it: any) => s + (Number(it.weight) || 0), 0);
  const scale = sumWeight > 1.5 ? 0.01 : 1;

  const items: HoldingItem[] = rawItems
    .map((it: any): HoldingItem => ({
      symbol: String(it.symbol || it.code || '').trim(),
      name: String(it.name || it.symbol || '').trim(),
      weight: (Number(it.weight) || 0) * scale,
    }))
    .filter((it: HoldingItem) => it.symbol && it.weight > 0);

  const res = await upsertHoldings(etfCode, items, source);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 500 });
  return NextResponse.json({ ok: true, etfCode, count: res.count, scaled: scale === 0.01 });
}
