/**
 * Admin 전용 DB 변경 API.
 * RLS를 우회하려면 service_role이 필요한데, 클라이언트에는 노출할 수 없으므로
 * 이 API route에서 (1) admin 권한 검증 → (2) service_role로 변경 실행.
 *
 * 지원 액션:
 *   - delete: { table: 'questions'|'answers'|'comments'|'users', id: string }
 *   - update_role: { userId: string, role: 'user'|'expert'|'admin' }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAdminContext } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DELETE_TABLES = ['questions', 'answers', 'comments'] as const;
const ROLES = ['user', 'expert', 'admin'] as const;

export async function POST(req: NextRequest) {
  // 1) 권한 검증
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    // 행 삭제
    if (action === 'delete') {
      const table = body.table as string;
      const id = body.id as string;
      if (!DELETE_TABLES.includes(table as any)) {
        return NextResponse.json({ ok: false, error: 'invalid_table' }, { status: 400 });
      }
      if (!id || typeof id !== 'string') {
        return NextResponse.json({ ok: false, error: 'invalid_id' }, { status: 400 });
      }
      const { error } = await admin.from(table).delete().eq('id', id);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // 권한 변경
    if (action === 'update_role') {
      const userId = body.userId as string;
      const role = body.role as string;
      if (!userId) return NextResponse.json({ ok: false, error: 'invalid_user' }, { status: 400 });
      if (!ROLES.includes(role as any)) {
        return NextResponse.json({ ok: false, error: 'invalid_role' }, { status: 400 });
      }
      const { error } = await admin.from('users').update({ role }).eq('id', userId);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
