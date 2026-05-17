/**
 * POST   /api/portfolio/holdings  { symbol, name, quantity, avgCost, currency, memo }
 * PUT    /api/portfolio/holdings  { id, quantity, avgCost, memo }
 * DELETE /api/portfolio/holdings?id=...
 *
 * 본인 포트폴리오만 수정 가능 (RLS).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreatePortfolio } from '@/lib/portfolio';
import { normalizeSymbol } from '@/lib/holdingsCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: 'no auth' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const rawSym = String(body?.symbol || '').trim();
  if (!rawSym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  // 비중 또는 수량 둘 중 하나는 필수
  const rawWeight = body?.weight;
  let targetWeight: number | null = null;
  if (rawWeight !== undefined && rawWeight !== null && rawWeight !== '') {
    const w = Number(rawWeight);
    if (!Number.isFinite(w) || w <= 0 || w > 100) {
      return NextResponse.json({ error: '비중은 0~100% 사이로 입력해주세요' }, { status: 400 });
    }
    targetWeight = w / 100; // 0~1 로 저장
  }

  let quantity: number | null = null;
  if (body?.quantity !== undefined && body?.quantity !== null && body?.quantity !== '') {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q <= 0) {
      return NextResponse.json({ error: '수량은 0보다 커야 해요' }, { status: 400 });
    }
    quantity = q;
  }

  if (targetWeight == null && quantity == null) {
    return NextResponse.json({ error: '비중(%) 또는 수량 중 하나는 입력해주세요' }, { status: 400 });
  }

  const portfolio = await getOrCreatePortfolio(user.id);
  if (!portfolio) return NextResponse.json({ error: 'portfolio init failed' }, { status: 500 });

  const symbol = normalizeSymbol(rawSym);
  const currency = body?.currency === 'USD' ? 'USD' : (/^[0-9]{6}$/.test(symbol) ? 'KRW' : 'USD');

  const { data, error } = await supabase
    .from('portfolio_holdings')
    .upsert({
      portfolio_id: portfolio.id,
      symbol,
      display_symbol: rawSym,
      name: String(body?.name || rawSym).trim(),
      quantity,
      target_weight: targetWeight,
      avg_cost: Number.isFinite(Number(body?.avgCost)) ? Number(body.avgCost) : null,
      currency,
      memo: body?.memo ? String(body.memo).slice(0, 200) : null,
    }, { onConflict: 'portfolio_id,symbol' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, holding: data });
}

export async function PUT(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: 'no auth' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = body?.id;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: any = {};
  if (body?.quantity !== undefined) {
    patch.quantity = body.quantity === null || body.quantity === '' ? null : Number(body.quantity);
  }
  if (body?.weight !== undefined) {
    if (body.weight === null || body.weight === '') {
      patch.target_weight = null;
    } else {
      const w = Number(body.weight);
      if (Number.isFinite(w) && w > 0 && w <= 100) patch.target_weight = w / 100;
    }
  }
  if (body?.avgCost !== undefined) {
    patch.avg_cost = body.avgCost === null || body.avgCost === '' ? null : Number(body.avgCost);
  }
  if (body?.memo !== undefined) patch.memo = body.memo ? String(body.memo).slice(0, 200) : null;

  const { data, error } = await supabase
    .from('portfolio_holdings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, holding: data });
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ error: 'no auth' }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('portfolio_holdings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
