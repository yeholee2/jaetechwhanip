/**
 * 크리에이터 이미지 업로드 — 본인 또는 admin 만.
 *
 * 흐름:
 *  1. 클라이언트 multipart FormData POST (file + scope=avatar|cover|post-thumb)
 *  2. 서버: 로그인 + 본인 creators 행 확인 (또는 admin)
 *  3. 서비스 롤로 creator-assets 버킷 업로드 (RLS 우회)
 *  4. 공개 URL 반환
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'creator-assets';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ALLOWED_SCOPES = ['avatar', 'cover', 'post-thumb'];

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'auth not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const scope = (formData.get('scope') as string) || 'avatar';
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }
  if (!ALLOWED_SCOPES.includes(scope)) {
    return NextResponse.json({ error: 'invalid scope' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `5MB 이하만 가능 (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)` },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json(
      { error: `이미지 파일만 가능 (PNG/JPG/WEBP/GIF)` },
      { status: 415 },
    );
  }

  // 본인이 크리에이터인지 또는 admin 인지 확인
  const { data: creator } = await supabase
    .from('creators')
    .select('id, slug')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!creator) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'creator only' }, { status: 403 });
    }
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'admin client not configured' }, { status: 503 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-') || `${scope}.png`;
  const slug = creator?.slug || 'admin';
  const path = `${slug}/${scope}/${Date.now()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadError) {
    console.error('[creator-upload]', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: urlData.publicUrl, path });
}
