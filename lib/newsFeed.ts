/**
 * 뉴스/블로그 피드 통합 fetcher.
 *
 * 3개 소스:
 *  1. 재테크한입 블로그 (Ghost RSS — hannipmoney.com)
 *  2. 매크로 뉴스 (Finnhub general)
 *  3. ETF 큐레이션 (수동 시드)
 */

export type FeedItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt?: string;   // ISO
  imageUrl?: string | null;
  summary?: string | null;
  category?: string | null;
};

// ── 1. 재테크한입 블로그 (Ghost RSS) ───────────────────────
const GHOST_RSS = 'https://hannipmoney.com/rss/';

/** 가벼운 XML <item> 파서 — 정규식 기반. RSS 2.0 한정. */
function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = extractCdata(block, 'title');
    const link = extractTag(block, 'link');
    const desc = extractCdata(block, 'description');
    const pub = extractTag(block, 'pubDate');
    const enclosure = /<enclosure[^>]*url="([^"]+)"/i.exec(block)?.[1]
      || /<media:content[^>]*url="([^"]+)"/i.exec(block)?.[1]
      || extractImageFromHtml(extractCdata(block, 'content:encoded') || desc || '');
    if (!title || !link) continue;
    items.push({
      id: `ghost-${i++}-${link.slice(-32)}`,
      title: stripHtml(title),
      source: '재테크 한입',
      url: link,
      publishedAt: pub ? new Date(pub).toISOString() : undefined,
      imageUrl: enclosure || null,
      summary: stripHtml(desc || '').slice(0, 140) || null,
      category: '블로그',
    });
  }
  return items;
}

function extractCdata(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const m = re.exec(block);
  return m?.[1].trim() || null;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = re.exec(block);
  return m?.[1].trim() || null;
}

function extractImageFromHtml(html: string): string | null {
  const m = /<img[^>]*src="([^"]+)"/i.exec(html);
  return m?.[1] || null;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

export async function fetchHannipBlog(limit = 8): Promise<FeedItem[]> {
  try {
    const r = await fetch(GHOST_RSS, {
      headers: { 'User-Agent': 'Mozilla/5.0 (hannipmoney we-app)' },
      next: { revalidate: 1800 }, // 30분
      redirect: 'follow',
    });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseRssItems(xml).slice(0, limit);
  } catch {
    return [];
  }
}

// ── 2. 매크로 뉴스 (Finnhub general) ───────────────────────
type FinnhubNews = {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
};

export async function fetchMacroNews(limit = 10): Promise<FeedItem[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return [];
  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`, {
      next: { revalidate: 900 }, // 15분
    });
    if (!r.ok) return [];
    const rows = (await r.json()) as FinnhubNews[];
    return rows.slice(0, limit).map(n => ({
      id: `finnhub-${n.id}`,
      title: n.headline,
      source: n.source,
      url: n.url,
      publishedAt: new Date(n.datetime * 1000).toISOString(),
      imageUrl: n.image || null,
      summary: n.summary?.slice(0, 160) || null,
      category: translateCategory(n.category),
    }));
  } catch {
    return [];
  }
}

function translateCategory(cat: string): string {
  const m: Record<string, string> = {
    forex: '외환',
    crypto: '암호화폐',
    merger: '인수합병',
    general: '시장',
    business: '경제',
    technology: '테크',
    top: '주요',
  };
  return m[cat] || cat || '시장';
}

// ── 3. ETF 큐레이션 (수동 시드) ─────────────────────────────
const ETF_CURATED: FeedItem[] = [
  { id: 'etf-1', title: '같은 반도체가 아냐…인텔·마이크론·AMD 추격 매수 vs 찬밥 된 엔비디아', source: '머니투데이', url: '/feed?tab=news', category: 'ETF' },
  { id: 'etf-2', title: '[ETF 시황] 반도체·우주 ETF 급등…코스피 7800 돌파에 인버스 급락', source: 'NewsPim', url: '/feed?tab=news', category: 'ETF' },
  { id: 'etf-3', title: '황선오 금감원 부원장 "韓 증시 74% 급등에 단타·빚투 급증…리스크 관리 필요"', source: '조선비즈', url: '/feed?tab=news', category: 'ETF' },
  { id: 'etf-4', title: "금감원 '삼전' 2배 레버리지 ETF, 투자자 쏠림 심화할 것", source: '아시아경제', url: '/feed?tab=news', category: 'ETF' },
  { id: 'etf-5', title: "JP모간 '코스피 1만도 가능'…한 달 만에 목표치 재상향", source: 'NewsPim', url: '/feed?tab=news', category: 'ETF' },
];

export function getEtfCurated(): FeedItem[] {
  return ETF_CURATED;
}

// ── 시간 표시 유틸 ────────────────────────────────────────
export function timeAgo(iso?: string): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}
