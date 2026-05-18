import { NextRequest, NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/creator';
import { normalizeCreatorTopics } from '@/lib/categories';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase, hasSupabaseServer } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TOPICS = 12;
const MAX_TEXT = 500;

function cleanText(value: unknown, max = MAX_TEXT) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanTopics(value: unknown) {
  if (!Array.isArray(value)) return [];
  const topics = value
    .map(topic => cleanText(topic, 30))
    .filter(Boolean)
    .slice(0, MAX_TOPICS);
  return normalizeCreatorTopics(topics).slice(0, MAX_TOPICS);
}

async function reserveSlug(admin: NonNullable<ReturnType<typeof createAdminClient>>, requested: string) {
  const baseSlug = normalizeSlug(requested) || `c-${Date.now().toString(36)}`;
  let finalSlug = baseSlug.slice(0, 32);

  for (let i = 0; i < 6; i++) {
    const { data: clash } = await admin
      .from('creators')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();
    if (!clash) return finalSlug;
    finalSlug = `${baseSlug.slice(0, 26)}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return `${baseSlug.slice(0, 22)}-${Date.now().toString(36).slice(-6)}`;
}

export async function POST(req: NextRequest) {
  if (!hasSupabaseServer()) {
    return NextResponse.json({ ok: false, error: 'auth_not_configured' }, { status: 503 });
  }

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });

  const displayName = cleanText(body.displayName, 80);
  const bio = cleanText(body.bio, 300);
  const requestedSlug = cleanText(body.slug, 80) || displayName;
  const avatarUrl = cleanText(body.avatar_url, 1000) || null;
  const coverUrl = cleanText(body.cover_url, 1000) || null;
  const topics = cleanTopics(body.topics);

  if (displayName.length < 2) {
    return NextResponse.json({ ok: false, error: '닉네임은 2자 이상이어야 해요.' }, { status: 400 });
  }
  if (bio.length < 5) {
    return NextResponse.json({ ok: false, error: '한 줄 소개를 5자 이상 적어주세요.' }, { status: 400 });
  }
  if (topics.length === 0) {
    return NextResponse.json({ ok: false, error: '토픽을 1개 이상 선택해주세요.' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await admin
    .from('creators')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle();
  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }
  if (existing?.slug) {
    return NextResponse.json({ ok: true, slug: existing.slug, existing: true });
  }

  const finalSlug = await reserveSlug(admin, requestedSlug);

  const { data: created, error: createError } = await admin
    .from('creators')
    .insert({
      user_id: user.id,
      slug: finalSlug,
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
      cover_url: coverUrl,
      topics,
      membership_enabled: false,
      is_published: true,
    })
    .select('slug')
    .single();

  if (createError) {
    return NextResponse.json({ ok: false, error: createError.message }, { status: 500 });
  }

  const referralSource = cleanText(body.referral_source, 120);
  const intendedUse = cleanText(body.intended_use, 200);
  await admin.from('creator_applications').insert({
    user_id: user.id,
    display_name: displayName,
    slug: finalSlug,
    bio,
    topics,
    referral_source: referralSource || null,
    intended_use: intendedUse || null,
    status: 'approved',
    reviewed_at: new Date().toISOString(),
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, slug: created.slug });
}
