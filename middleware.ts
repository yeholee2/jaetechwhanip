import { NextResponse, type NextRequest } from 'next/server';

const SERVICE_HOST = 'we.hannipmoney.com';
const LEGACY_SERVICE_HOSTS = new Set([
  'qa.hannipmoney.com',
  'home.hannipmoney.com',
]);
const LEGACY_ARTICLE_HOSTS = new Set([
  'article.hannipmoney.com',
  'column.hannipmoney.com',
]);

// Edge Runtime에서 @supabase/ssr의 cookies() 충돌 방지
// 세션 갱신은 Server Component에서 처리
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (host && LEGACY_SERVICE_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.hostname = SERVICE_HOST;
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  if (host && LEGACY_ARTICLE_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.hostname = SERVICE_HOST;
    url.protocol = 'https:';
    if (request.nextUrl.pathname === '/') url.pathname = '/articles';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
