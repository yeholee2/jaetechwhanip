/**
 * OAuth 콜백 — Google / Kakao 공통.
 *
 * 흐름:
 *  1. /auth → signInWithOAuth → 외부 provider 로그인
 *  2. provider 가 ?code=... 로 이 라우트로 리다이렉트
 *  3. exchangeCodeForSession → 세션 쿠키 발급
 *  4. ?next= 로 이동 (없으면 /)
 *
 * 카카오 닉네임/아바타 동기화는 클라이언트 onAuthStateChange 후
 * lib/nicknames.ts 의 syncFinanceNickname 가 처리.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // 동적 origin — localhost / vercel preview / production 모두 자동 대응
  const origin = url.origin;
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');
  const errorDesc = url.searchParams.get('error_description');
  const next = url.searchParams.get('next') ?? '/';

  if (errorParam) {
    const msg = encodeURIComponent(errorDesc || errorParam);
    return NextResponse.redirect(`${origin}/auth?error=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=missing_code`);
  }

  const supabase = createClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth?error=supabase_not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : `/${next}`}`);
}
