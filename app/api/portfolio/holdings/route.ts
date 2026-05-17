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
  const quantity = Number(body?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'quantity > 0 required' }, { status: 400 });
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
  if (Number.isFinite(Number(body?.quantity))) patch.quantity = Number(body.quantity);
  if (body?.avgCost !== undefined) {
    patch.avg_cost = body.avgCost === null ? null : Number(body.avgCost);
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
