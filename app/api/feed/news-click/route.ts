import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAllowedNewsUrl } from '@/lib/feed';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const requestedUrl = new URL(req.url).searchParams.get('url') || '';

  if (!requestedUrl || !isAllowedNewsUrl(requestedUrl)) {
    return Response.json({ ok: false, error: 'invalid_news_url' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceRoleKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      const { data } = await supabase
        .from('news_items')
        .select('click_count')
        .eq('url', requestedUrl)
        .maybeSingle();

      if (data) {
        await supabase
          .from('news_items')
          .update({ click_count: (data.click_count || 0) + 1 })
          .eq('url', requestedUrl);
      }
    } catch {
      // Click tracking should never block the reader from reaching the source.
    }
  }

  return NextResponse.redirect(requestedUrl, { status: 302 });
}

