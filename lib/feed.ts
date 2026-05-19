import { SITE_URL } from '@/lib/seo';
import { parseRss, stripHtml, truncateText } from '@/lib/rss';
import type { RssEntry } from '@/lib/rss';
import { fetchRecentReportsWithFallback, type ReportItem } from '@/lib/reports';

export const FEED_PATH = '/feed';
export const FEED_URL = `${SITE_URL}${FEED_PATH}`;
export const GHOST_BLOG_URL = 'https://hannipmoney.com';
export const GHOST_RSS_URL = 'https://www.hannipmoney.com/rss/';

export const FEED_CATEGORY_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '재테크입문', label: '재테크' },
  { key: '국내주식·ETF', label: '국내주식·ETF' },
  { key: '해외주식·ETF', label: '해외주식·ETF' },
  { key: '배당주·ETF', label: '배당주·ETF' },
  { key: '적립식·연금', label: '적립식·연금' },
  { key: '테마·트렌드', label: '테마·트렌드' },
  { key: '자산관리', label: '자산관리' },
  { key: '절세', label: '절세' },
  { key: '보험', label: '보험' },
  { key: '대출·부채', label: '대출·부채' },
];

export type HanipArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  tags: string[];
  thumbnailUrl?: string | null;
  originalUrl?: string;
  contentHtml?: string;
  sourceName?: string;
};

export type FeedItem =
  | ({ type: 'column' } & HanipArticle)
  | ({ type: 'question' } & FeedQuestion)
  | ({ type: 'news' } & FeedNews)
  | ({ type: 'report' } & FeedReport);

export type FeedReport = {
  slug: string;            // = report.id
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  sourceName: string;      // 증권사·운용사 명
  originalUrl: string;
  thumbnailUrl?: string | null;
  relatedEtfCodes: string[];
  readingTime?: string;
  tags?: string[];
};

export type FeedQuestion = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  authorName: string;
  answerCount: number;
  likeCount: number;
  viewCount: number;
  thumbnailUrl?: string | null;
  readingTime?: string;
  tags?: string[];
};

export type FeedNews = {
  slug: string;        // 또는 newsItem id
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  sourceName: string;  // 매일경제, 한국경제 등
  originalUrl: string;
  thumbnailUrl?: string | null;
  readingTime?: string;
  tags?: string[];
};

export const hanipArticles: HanipArticle[] = [
  {
    slug: 'sp500-etf-first-rule',
    title: 'S&P500 ETF를 처음 살 때 먼저 정해야 하는 3가지',
    description: 'VOO, IVV, SPY 이름보다 중요한 건 투자 기간, 환율 부담, 매수 주기입니다.',
    category: '해외주식·ETF',
    readingTime: '4분',
    publishedAt: '2026-05-09T10:10:00+09:00',
    tags: ['S&P500', 'ETF', '분할매수'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=420&q=80',
  },
  {
    slug: 'isa-pension-order',
    title: 'ISA와 연금저축, 월급쟁이는 어떤 순서로 채워야 할까',
    description: '세액공제, 중도인출, 투자 기간을 기준으로 계좌 우선순위를 잡는 법을 정리했습니다.',
    category: '절세',
    readingTime: '5분',
    publishedAt: '2026-05-08T19:20:00+09:00',
    tags: ['ISA', '연금저축', '절세계좌'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=420&q=80',
  },
  {
    slug: 'dividend-etf-tax',
    title: '월배당 ETF가 좋아 보일 때 꼭 같이 봐야 하는 세금',
    description: '분배금의 기분 좋은 현금흐름과 장기 수익률, 배당소득세를 같이 보는 체크리스트입니다.',
    category: '해외주식·ETF',
    readingTime: '3분',
    publishedAt: '2026-05-07T08:30:00+09:00',
    tags: ['월배당', '배당ETF', '세금'],
    thumbnailUrl: 'https://images.unsplash.com/photo-1604594849809-dfedbc827105?auto=format&fit=crop&w=420&q=80',
  },
];

export function articleUrl(slug: string) {
  return `${FEED_PATH}/${encodeURIComponent(slug)}`;
}

export function feedUrl() {
  return FEED_URL;
}

export function toFeedItems(articles: HanipArticle[] = hanipArticles): FeedItem[] {
  return articles.map(article => ({ ...article, type: 'column' as const })).sort((a, b) => (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ));
}

export async function fetchFeedItems() {
  const [articles, questions, news, reports] = await Promise.all([
    fetchGhostArticles(),
    fetchRecentQuestions(),
    fetchRecentNewsItems(),
    fetchRecentReportsWithFallback(),
  ]);

  const items: FeedItem[] = [
    ...articles.map(a => ({ ...a, type: 'column' as const })),
    ...questions.map(q => ({ ...q, type: 'question' as const })),
    ...news.map(n => ({ ...n, type: 'news' as const })),
    ...reports.map(r => reportToFeedItem(r)),
  ];

  return items.sort((a, b) => (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ));
}

function reportToFeedItem(r: ReportItem): Extract<FeedItem, { type: 'report' }> {
  return {
    type: 'report',
    slug: r.id,
    title: r.title,
    description: r.summary,
    category: r.category,
    publishedAt: r.publishedAt,
    sourceName: r.source,
    originalUrl: r.url,
    thumbnailUrl: r.thumbnailUrl,
    relatedEtfCodes: r.relatedEtfCodes,
    tags: [],
  };
}

/**
 * Supabase에서 최근 질문 fetch.
 * 마이그레이션 미적용/실패 시 빈 배열 안전.
 */
export async function fetchRecentQuestions(limit = 20): Promise<FeedQuestion[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(
      `${url}/rest/v1/questions?select=id,slug,title,body,category,created_at,answer_count,like_count,view_count,users:author_id(name)&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((row: any) => ({
      slug: row.slug || row.id,
      title: row.title || '',
      description: (row.body || '').slice(0, 160),
      category: normalizeFeedCategory(row.category || '', row.title || '', row.body || ''),
      publishedAt: row.created_at,
      authorName: row.users?.name || '익명',
      answerCount: row.answer_count || 0,
      likeCount: row.like_count || 0,
      viewCount: row.view_count || 0,
      tags: [],
    }));
  } catch {
    return [];
  }
}

/**
 * Supabase news_items에서 최근 뉴스 fetch.
 * 테이블 미적용/실패 시 빈 배열 안전.
 */
export async function fetchRecentNewsItems(limit = 20): Promise<FeedNews[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(
      `${url}/rest/v1/news_items?select=id,source,title,summary,url,thumbnail_url,category,published_at&order=published_at.desc&limit=${limit}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((row: any) => ({
      slug: row.id,
      title: row.title || '',
      description: row.summary || '',
      category: row.category || '재테크입문',
      publishedAt: row.published_at,
      sourceName: row.source || '뉴스',
      originalUrl: row.url || '#',
      thumbnailUrl: row.thumbnail_url || null,
      tags: [],
    }));
  } catch {
    return [];
  }
}

export async function fetchGhostArticles(): Promise<HanipArticle[]> {
  try {
    const res = await fetch(GHOST_RSS_URL, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
        'user-agent': 'JaetechHanipBot/1.0 (+https://we.hannipmoney.com/feed)',
      },
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(1000),
    });

    if (!res.ok) return hanipArticles;

    const entries = parseRss(await res.text(), 20);
    const articles = entries.map(ghostEntryToArticle).filter(Boolean) as HanipArticle[];

    return articles.length > 0 ? articles : hanipArticles;
  } catch {
    return hanipArticles;
  }
}

export async function fetchGhostArticleBySlug(slug: string) {
  const articles = await fetchGhostArticles();
  return articles.find(article => article.slug === slug)
    || hanipArticles.find(article => article.slug === slug)
    || null;
}

export function normalizeFeedCategory(category = '', title = '', summary = '', tags: string[] = []) {
  const direct = category.replace(/\s+/g, '').trim();
  const directMap: Record<string, string> = {
    재테크입문: '재테크입문',
    재테크: '재테크입문',
    '국내주식·ETF': '국내주식·ETF',
    '국내주식ETF': '국내주식·ETF',
    '주식·ETF': '국내주식·ETF',
    '주식ETF': '국내주식·ETF',
    국내주식: '국내주식·ETF',
    '해외주식·ETF': '해외주식·ETF',
    '해외주식ETF': '해외주식·ETF',
    해외주식: '해외주식·ETF',
    미국주식: '해외주식·ETF',
    절세: '절세',
    보험: '보험',
    '대출·부채': '대출·부채',
    대출부채: '대출·부채',
    대출: '대출·부채',
    부채: '대출·부채',
  };

  if (directMap[direct]) return directMap[direct];
  return normalizeFeedCategoryFromText(`${title} ${summary} ${tags.join(' ')}`);
}

function normalizeFeedCategoryFromText(text: string) {
  if (/(QQQ|VOO|SPY|나스닥|S&P|미국주식|해외주식)/i.test(text)) return '해외주식·ETF';
  if (/(ETF|KODEX|TIGER|코스피|코스닥|국내주식|배당)/.test(text)) return '국내주식·ETF';
  if (/(절세|세금|연말정산|양도세|ISA|연금저축|IRP)/i.test(text)) return '절세';
  if (/(보험|실손|연금보험|종신|암보험)/.test(text)) return '보험';
  if (/(대출|부채|금리|주담대|신용대출|전세대출)/.test(text)) return '대출·부채';
  return '재테크입문';
}

function ghostEntryToArticle(entry: RssEntry): HanipArticle | null {
  const slug = slugFromGhostUrl(entry.link);
  if (!slug) return null;

  const cleanText = stripHtml(entry.contentHtml || entry.description);
  const tags = entry.categories.filter(Boolean).slice(0, 5);

  return {
    slug,
    title: entry.title,
    description: truncateText(entry.description || cleanText, 150),
    category: normalizeFeedCategory(entry.categories[0] || '', entry.title, entry.description, tags),
    readingTime: estimateReadingTime(cleanText || entry.description),
    publishedAt: entry.publishedAt,
    tags: tags.length > 0 ? tags : ['한입 칼럼'],
    thumbnailUrl: entry.thumbnailUrl,
    originalUrl: entry.link,
    contentHtml: entry.contentHtml,
    sourceName: '한입머니',
  };
}

function slugFromGhostUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split('/').filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

function estimateReadingTime(text: string) {
  const count = text.replace(/\s+/g, '').length;
  return `${Math.max(2, Math.ceil(count / 700))}분`;
}
