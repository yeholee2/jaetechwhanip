import { createClient } from '@supabase/supabase-js';
import { NEWS_SOURCES, classifyNewsCategory } from '@/lib/feed';
import { parseRss, truncateText } from '@/lib/rss';

export const dynamic = 'force-dynamic';

type ParsedNews = {
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnail_url: string | null;
  category: string;
  published_at: string;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');

  if (!cronSecret) {
    return Response.json(
      { ok: false, error: 'missing_cron_secret' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { ok: false, error: 'missing_supabase_env' },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const rows: ParsedNews[] = [];

  for (const source of NEWS_SOURCES) {
    const feed = await fetch(source.url, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
        'user-agent': 'JaetechHanipBot/1.0 (+https://we.hannipmoney.com/feed)',
      },
      next: { revalidate: 0 },
    }).then(res => (res.ok ? res.text() : null)).catch(() => null);

    if (!feed) continue;
    rows.push(...parseRss(feed, 20).map(item => ({
      source: source.name,
      title: item.title,
      summary: truncateText(item.description, 200),
      url: item.link,
      thumbnail_url: item.thumbnailUrl,
      category: classifyNewsCategory(item.title, item.description),
      published_at: item.publishedAt,
    })));
  }

  if (rows.length === 0) {
    return Response.json({ ok: true, inserted: 0, sources: NEWS_SOURCES.length });
  }

  const { error } = await supabase
    .from('news_items')
    .upsert(rows, { onConflict: 'url', ignoreDuplicates: true });

  if (error) {
    if (/news_items|schema cache|relation/i.test(error.message)) {
      return Response.json({
        ok: true,
        inserted: 0,
        skipped: 'news_items_table_missing',
        sources: NEWS_SOURCES.length,
      });
    }

    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    inserted: rows.length,
    sources: NEWS_SOURCES.length,
  });
}
