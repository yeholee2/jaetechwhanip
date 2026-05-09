import { createClient } from '@supabase/supabase-js';
import { NEWS_SOURCES, classifyNewsCategory } from '@/lib/feed';

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
    rows.push(...parseRssItems(feed, source.name));
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

function parseRssItems(xml: string, source: string): ParsedNews[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi))
    .slice(0, 20)
    .map(match => parseRssItem(match[0], source))
    .filter((item): item is ParsedNews => !!item);
}

function parseRssItem(itemXml: string, source: string): ParsedNews | null {
  const title = readTag(itemXml, 'title');
  const url = readTag(itemXml, 'link');
  const summary = stripHtml(readTag(itemXml, 'description')).slice(0, 200);
  const publishedRaw = readTag(itemXml, 'pubDate') || readTag(itemXml, 'dc:date');
  const thumbnail = readEnclosure(itemXml);

  if (!title || !url) return null;

  const publishedAt = publishedRaw && !Number.isNaN(new Date(publishedRaw).getTime())
    ? new Date(publishedRaw).toISOString()
    : new Date().toISOString();

  return {
    source,
    title,
    summary,
    url,
    thumbnail_url: thumbnail,
    category: classifyNewsCategory(title, summary),
    published_at: publishedAt,
  };
}

function readTag(xml: string, tag: string) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(pattern);
  return decodeXml(match?.[1] || '').trim();
}

function readEnclosure(xml: string) {
  const enclosure = xml.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*>/i);
  const media = xml.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i);
  return decodeXml(enclosure?.[1] || media?.[1] || '').trim() || null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
