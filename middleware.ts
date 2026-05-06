import { NextResponse, type NextRequest } from 'next/server';

// Edge Runtime에서 @supabase/ssr의 cookies() 충돌 방지
// 세션 갱신은 Server Component에서 처리
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
