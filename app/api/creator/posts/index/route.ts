/**
 * 글 발행 직후 호출 — 본문 스캔해서 post_mentions 자동 채우기.
 *
 *   POST /api/creator/posts/index   { postId }
 *
 * - 본인 글만 가능 (creator.user_id 검증)
 * - 본문 + 제목 + preview 합쳐서 스캔
 * - 기존 mentions 다 삭제 후 새로 insert (재발행 시 갱신)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { extractMentions } from '@/lib/mentionExtractor';

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

  const { data: post } = await admin
    .from('creator_posts')
    .select('id, title, body, preview, creator_id, creators:creator_id(user_id)')
    .eq('id', postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: 'post not found' }, { status: 404 });

  const creatorUserId = (post as any).creators?.user_id;
  if (creatorUserId !== user.id) {
    return NextResponse.json({ error: 'not your post' }, { status: 403 });
  }

  const combined = [post.title, post.preview, post.body].filter(Boolean).join('\n\n');
  const mentions = extractMentions(combined);

  // 기존 멘션 다 지우고 새로
  await admin.from('post_mentions').delete().eq('post_id', postId);

  if (mentions.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  const rows = mentions.map(m => ({
    post_id: postId,
    symbol: m.symbol,
    kind: m.kind,
    source: m.source,
    weight: m.weight,
  }));

  const { error } = await admin.from('post_mentions').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    count: rows.length,
    mentions: rows.map(r => ({ symbol: r.symbol, kind: r.kind, source: r.source, weight: r.weight })),
  });
}
