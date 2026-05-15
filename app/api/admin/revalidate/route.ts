/**
 * 관리자 변경 후 캐시 즉시 무효화.
 * POST { paths: string[] } → 각 path 의 ISR 캐시 무효화.
 *
 * 사용: admin 페이지에서 저장 직후 호출 → 홈/스파링 페이지 즉시 갱신.
 */
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paths: string[] = Array.isArray(body?.paths) ? body.paths : [];
    const tags: string[] = Array.isArray(body?.tags) ? body.tags : [];

    if (paths.length === 0 && tags.length === 0) {
      // 기본: 홈 + ETF 메인 + 스파링 목록
      revalidatePath('/');
      revalidatePath('/etf');
      revalidatePath('/sparring');
    } else {
      paths.forEach(p => {
        if (typeof p === 'string' && p.startsWith('/')) revalidatePath(p);
      });
      tags.forEach(t => {
        if (typeof t === 'string') revalidateTag(t);
      });
    }
    return NextResponse.json({ ok: true, revalidated: { paths, tags } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
