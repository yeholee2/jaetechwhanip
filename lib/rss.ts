export type RssEntry = {
  title: string;
  link: string;
  description: string;
  contentHtml: string;
  categories: string[];
  publishedAt: string;
  thumbnailUrl: string | null;
  guid?: string;
};

export function parseRss(xml: string, limit = 20): RssEntry[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi))
    .slice(0, limit)
    .map(match => parseRssItem(match[0]))
    .filter((item): item is RssEntry => !!item);
}

export function parseRssItem(itemXml: string): RssEntry | null {
  const title = readTag(itemXml, 'title');
  const link = readTag(itemXml, 'link');
  const description = stripHtml(readTag(itemXml, 'description'));
  const contentHtml = sanitizeHtml(readTag(itemXml, 'content:encoded'));
  const publishedRaw = readTag(itemXml, 'pubDate') || readTag(itemXml, 'dc:date');
  const publishedAt = publishedRaw && !Number.isNaN(new Date(publishedRaw).getTime())
    ? new Date(publishedRaw).toISOString()
    : new Date().toISOString();

  if (!title || !link) return null;

  return {
    title,
    link,
    description,
    contentHtml,
    categories: readTags(itemXml, 'category'),
    publishedAt,
    thumbnailUrl: readEnclosure(itemXml),
    guid: readTag(itemXml, 'guid'),
  };
}

export function readTag(xml: string, tag: string) {
  const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'i');
  const match = xml.match(pattern);
  return decodeXml(match?.[1] || '').trim();
}

export function readTags(xml: string, tag: string) {
  const pattern = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, 'gi');
  return Array.from(xml.matchAll(pattern))
    .map(match => decodeXml(match[1] || '').trim())
    .filter(Boolean);
}

export function readEnclosure(xml: string) {
  const enclosure = xml.match(/<enclosure\b[^>]*url=["']([^"']+)["'][^>]*>/i);
  const media = xml.match(/<media:content\b[^>]*url=["']([^"']+)["'][^>]*>/i);
  return decodeXml(enclosure?.[1] || media?.[1] || '').trim() || null;
}

export function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function truncateText(value: string, length = 200) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= length) return normalized;
  return `${normalized.slice(0, length - 1).trimEnd()}…`;
}

export function sanitizeHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[\s\S]*?>/gi, '')
    .replace(/<form\b[\s\S]*?<\/form>/gi, '')
    .replace(/<button\b[\s\S]*?<\/button>/gi, '')
    .replace(/\son[a-z]+=["'][^"']*["']/gi, '')
    .replace(/\sstyle=["'][^"']*["']/gi, '')
    .replace(/(href|src)=["']javascript:[^"']*["']/gi, '$1="#"');
}

export function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
