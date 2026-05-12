import { NextResponse, type NextRequest } from 'next/server';

/**
 * 도메인 정규화 redirect.
 *
 * 의도:
 *   - 최종 production: we.hannipmoney.com (canonical)
 *   - 다른 서브도메인은 we.hannipmoney.com 로 308 redirect
 *
 * 현 상태:
 *   - we.hannipmoney.com DNS 미등록 → redirect 후 NXDOMAIN 으로 사이트 사망
 *   - 환경변수 SERVICE_REDIRECT_ENABLED=true 일 때만 redirect 활성화
 *   - 기본값: redirect 비활성화 (모든 서브도메인 직접 서빙) — DNS 준비될 때까지 안전 모드
 *
 * DNS 정상화 후:
 *   Vercel env에 SERVICE_REDIRECT_ENABLED=true 추가 → 자동으로 we 로 정규화 redirect 복원.
 */

const SERVICE_HOST = process.env.NEXT_PUBLIC_SERVICE_HOST || 'we.hannipmoney.com';
const REDIRECT_ENABLED = process.env.SERVICE_REDIRECT_ENABLED === 'true';

const LEGACY_SERVICE_HOSTS = new Set([
  'qa.hannipmoney.com',
  'home.hannipmoney.com',
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
