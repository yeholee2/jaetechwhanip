/**
 * 일회성 스파링 시드 endpoint — admin 인증 후 미리 정의된 화두 INSERT.
 * GET /api/admin/seed-sparring?key=pension
 *
 * 보안: getAdminContext()로 admin role 검증.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEEDS: Record<string, any> = {
  pension: {
    round_number: 217,
    category: '절세',
    title: '국민연금 보험료율 9% → 13% 인상안, 찬성하시나요?',
    body: '노후 보장을 위한 인상이 필요하다는 입장과 청년·중장년의 보험료 부담이 너무 크다는 입장이 갈려요. 여러분은 어느 쪽이세요?',
    slug: 'nps-rate-hike-2026',
    side_a_label: '찬성 (노후 대비 필요)',
    side_b_label: '반대 (부담 과중)',
    side_a_polarity: 'positive',
    side_b_polarity: 'negative',
    thumbnail_url: null,
    deadline_at: new Date(Date.now() + 5.5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  },
};

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const key = req.nextUrl.searchParams.get('key') || '';
  const seed = SEEDS[key];
  if (!seed) {
    return NextResponse.json({ ok: false, error: 'unknown_seed', available: Object.keys(SEEDS) }, { status: 400 });
  }

  // slug 중복 검사 — 이미 있으면 건너뜀
  const { data: exists } = await admin
    .from('sparrings')
    .select('id')
    .eq('slug', seed.slug)
    .maybeSingle();
  if (exists) {
    return NextResponse.json({ ok: true, status: 'already_exists', id: exists.id });
  }

  const { data, error } = await admin.from('sparrings').insert(seed).select().single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // 캐시 무효화 — /sparring 즉시 갱신
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/sparring');
    revalidatePath('/');
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, status: 'inserted', id: data.id, slug: data.slug });
}
