import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/auth?error=naver_not_configured', request.url));
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';
  
  // request.url에서 origin 추출 (Vercel 도메인 정확히 반영)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const state = crypto.randomBytes(16).toString('hex');
  const callbackUrl = `${origin}/api/auth/naver/callback`;

  const naverUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  naverUrl.searchParams.set('response_type', 'code');
  naverUrl.searchParams.set('client_id', clientId);
  naverUrl.searchParams.set('redirect_uri', callbackUrl);
  naverUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(naverUrl.toString());
  response.cookies.set('naver_oauth_state', state, { httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax' });
  response.cookies.set('naver_oauth_next', next, { httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax' });
  return response;
}
