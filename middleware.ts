import { NextResponse, type NextRequest } from 'next/server';

// Edge Runtime에서 @supabase/ssr의 cookies() 충돌 방지
// 세션 갱신은 Server Component에서 처리
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (host === 'qa.hannipmoney.com') {
    const url = request.nextUrl.clone();
    url.hostname = 'home.hannipmoney.com';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  if (
    (host === 'article.hannipmoney.com' || host === 'column.hannipmoney.com') &&
    request.nextUrl.pathname === '/'
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/articles';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
