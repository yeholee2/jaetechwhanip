/**
 * 새 글 발행 알림 메일 — 팔로워/멤버 일괄 발송.
 *
 * 흐름:
 *  1. 인증된 사용자가 본인 creator 의 post 발행 직후 호출
 *  2. 서버가 creator 소유 검증 + post 조회
 *  3. 멤버 전용이면 active 멤버에게만, 무료면 팔로워 전체에게 발송
 *  4. Resend NOP 환경(키 미설정)에서도 안전하게 통과
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { sendNewPostNotification } from '@/lib/email';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabase();
  if (!supabase) return NextResponse.json({ error: 'auth not configured' }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const postId = body?.postId as string | undefined;
  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: true, skipped: 'no service role' });

  // 1) post + creator 조회
  const { data: post } = await admin
    .from('creator_posts')
    .select('id, title, slug, preview, is_member_only, creator_id, creators:creator_id(slug, display_name, user_id)')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

  const creator = (post as any).creators;
  if (!creator || creator.user_id !== user.id) {
    return NextResponse.json({ error: 'not your post' }, { status: 403 });
  }

  // 2) 수신자 목록 — 멤버 전용이면 active 멤버, 아니면 팔로워
  let recipients: string[] = [];
  if (post.is_member_only) {
    const { data: members } = await admin
      .from('creator_subscriptions')
      .select('user_id, users:user_id(email)')
      .eq('creator_id', post.creator_id)
      .eq('status', 'active')
      .limit(2000);
    recipients = ((members || []) as any[])
      .map(m => m.users?.email)
      .filter(Boolean);
  } else {
    const { data: followers } = await admin
      .from('creator_follows')
      .select('user_id, users:user_id(email)')
      .eq('creator_id', post.creator_id)
      .limit(5000);
    recipients = ((followers || []) as any[])
      .map(f => f.users?.email)
      .filter(Boolean);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const postUrl = `${SITE_URL}/creator/${creator.slug}/posts/${post.slug}`;
  // Fire-and-forget (await but cap at reasonable batch)
  await sendNewPostNotification({
    to: recipients.slice(0, 500), // 안전 캡
    creatorName: creator.display_name,
    postTitle: post.title,
    postUrl,
    preview: post.preview || undefined,
  });

  return NextResponse.json({ ok: true, sent: recipients.length });
}
