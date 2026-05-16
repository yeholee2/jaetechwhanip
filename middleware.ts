import { NextResponse, type NextRequest } from 'next/server';

/**
 * 도메인 정규화 redirect.
 *
 * 의도:
 *   - 최종 production: etf.hannipmoney.com (canonical, ETF한입 브랜드)
 *   - 다른 서브도메인은 canonical 로 308 redirect
 *
 * 환경변수:
 *   - NEXT_PUBLIC_SERVICE_HOST=etf.hannipmoney.com (canonical 호스트)
 *   - SERVICE_REDIRECT_ENABLED=true 일 때만 redirect 활성화
 *     (DNS 준비 안 됐을 때 false 로 두면 모든 호스트 직접 서빙)
 */

const SERVICE_HOST = process.env.NEXT_PUBLIC_SERVICE_HOST || 'etf.hannipmoney.com';
const REDIRECT_ENABLED = process.env.SERVICE_REDIRECT_ENABLED === 'true';

const LEGACY_SERVICE_HOSTS = new Set([
  'qa.hannipmoney.com',
  'home.hannipmoney.com',
  'we.hannipmoney.com',     // 이전 canonical → 새 canonical 로 redirect
]);
const LEGACY_ARTICLE_HOSTS = new Set([
  'article.hannipmoney.com',
  'column.hannipmoney.com',
]);

export async function middleware(request: NextRequest) {
  if (!REDIRECT_ENABLED) return NextResponse.next();

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
