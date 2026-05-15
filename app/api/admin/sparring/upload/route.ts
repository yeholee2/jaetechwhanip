/**
 * 관리자용 스파링 썸네일 업로드 — 서비스 롤로 RLS 우회.
 *
 * 흐름:
 *  1. 클라이언트가 multipart FormData 로 POST (file 필드)
 *  2. 서버에서 로그인 사용자 검증 + role === 'admin' 확인
 *  3. 서비스 롤 클라이언트로 sparring-thumbnails 버킷에 업로드
 *  4. 공개 URL 반환
 *
 * RLS 정책 없어도 작동 — 서비스 롤이 모든 권한 가짐.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'sparring-thumbnails';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  // 1. 로그인 + admin 검증
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'auth not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'admin only' }, { status: 403 });
  }

  // 2. FormData 파싱
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }

  // 3. 검증
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: `5MB 이하만 가능 (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB)` }, { status: 413 });
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: `허용된 형식: ${ALLOWED_MIME.join(', ')} (받은 형식: ${file.type})` }, { status: 415 });
  }

  // 4. 서비스 롤로 업로드 (RLS 우회)
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: 'admin client not configured' }, { status: 503 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-') || 'thumb.webp';
  const path = `sparring/${Date.now()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error('[upload-thumbnail] storage error:', uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({ ok: true, url: urlData.publicUrl, path });
}
