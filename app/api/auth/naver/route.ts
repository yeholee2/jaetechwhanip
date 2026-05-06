import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const clientId = process.env.NAVER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/auth?error=naver_not_configured', request.url));
  }

  const { searchParams } = new URL(request.url);
  const next = searchParams.get('next') ?? '/';
  
  // origin을 env에서 가져와서 localhost 문제 방지
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jaetechwhanip.vercel.app';
  const state = crypto.randomBytes(16).toString('hex');
  const callbackUrl = `${siteUrl}/api/auth/naver/callback`;

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
