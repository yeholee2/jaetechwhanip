import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateParam = searchParams.get('state');
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://jaetechwhanip.vercel.app';

  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=')).filter(p => p.length === 2)
  );
  const savedState = cookies['naver_oauth_state'];
  const next = cookies['naver_oauth_next'] || '/';

  if (!code || !stateParam || stateParam !== savedState) {
    return NextResponse.redirect(`${siteUrl}/auth?error=naver_invalid_state`);
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseServiceKey) {
    return NextResponse.redirect(`${siteUrl}/auth?error=naver_not_configured`);
  }

  try {
    const callbackUrl = `${siteUrl}/api/auth/naver/callback`;

    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        state: stateParam,
        redirect_uri: callbackUrl,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${siteUrl}/auth?error=naver_token_failed`);
    }

    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.response) {
      return NextResponse.redirect(`${siteUrl}/auth?error=naver_profile_failed`);
    }

    const naverUser = profile.response;
    const email = naverUser.email || `${naverUser.id}@naver.local`;
    const name = naverUser.nickname || naverUser.name || '네이버 사용자';
    const avatar = naverUser.profile_image || null;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        data: { provider: 'naver', naver_id: naverUser.id, name, avatar_url: avatar },
        redirectTo: `${siteUrl}${next}`,
      },
    });

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Naver login error:', linkErr);
      return NextResponse.redirect(`${siteUrl}/auth?error=naver_link_failed`);
    }

    const response = NextResponse.redirect(linkData.properties.action_link);
    response.cookies.delete('naver_oauth_state');
    response.cookies.delete('naver_oauth_next');
    return response;
  } catch (e: any) {
    console.error('Naver callback error:', e);
    return NextResponse.redirect(`${siteUrl}/auth?error=naver_unknown`);
  }
}
