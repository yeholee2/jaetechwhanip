import { SITE_URL } from '@/lib/seo';
import { parseRss, stripHtml, truncateText } from '@/lib/rss';
import type { RssEntry } from '@/lib/rss';

export const FEED_PATH = '/feed';
export const FEED_URL = `${SITE_URL}${FEED_PATH}`;
export const GHOST_BLOG_URL = 'https://hannipmoney.com';
export const GHOST_RSS_URL = 'https://www.hannipmoney.com/rss/';

export const FEED_CATEGORY_FILTERS = [
  { key: '전체', label: '전체' },
  { key: '재테크입문', label: '💡 재테크' },
  { key: '국내주식·ETF', label: '📈 국내주식·ETF' },
  { key: '해외주식·ETF', label: '🌎 해외주식·ETF' },
  { key: '절세', label: '🏦 절세' },
  { key: '보험', label: '🛡️ 보험' },
  { key: '대출·부채', label: '💳 대출·부채' },
];

export type HanipArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  tags: string[];
  originalUrl?: string;
  contentHtml?: string;
  sourceName?: string;
};

export type NewsItem = {
  id?: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl?: string | null;
  category: string;
  publishedAt: string;
  clickCount?: number;
};

export type FeedItem =
  | ({ type: 'column' } & HanipArticle)
  | ({ type: 'news' } & NewsItem);

export const hanipArticles: HanipArticle[] = [
  {
    slug: 'sp500-etf-first-rule',
    title: 'S&P500 ETF를 처음 살 때 먼저 정해야 하는 3가지',
    description: 'VOO, IVV, SPY 이름보다 중요한 건 투자 기간, 환율 부담, 매수 주기입니다.',
    category: '해외주식·ETF',
    readingTime: '4분',
    publishedAt: '2026-05-09T10:10:00+09:00',
    tags: ['S&P500', 'ETF', '분할매수'],
  },
  {
    slug: 'isa-pension-order',
    title: 'ISA와 연금저축, 월급쟁이는 어떤 순서로 채워야 할까',
    description: '세액공제, 중도인출, 투자 기간을 기준으로 계좌 우선순위를 잡는 법을 정리했습니다.',
    category: '절세',
    readingTime: '5분',
    publishedAt: '2026-05-08T19:20:00+09:00',
    tags: ['ISA', '연금저축', '절세계좌'],
  },
  {
    slug: 'dividend-etf-tax',
    title: '월배당 ETF가 좋아 보일 때 꼭 같이 봐야 하는 세금',
    description: '분배금의 기분 좋은 현금흐름과 장기 수익률, 배당소득세를 같이 보는 체크리스트입니다.',
    category: '해외주식·ETF',
    readingTime: '3분',
    publishedAt: '2026-05-07T08:30:00+09:00',
    tags: ['월배당', '배당ETF', '세금'],
  },
];

export const sampleNewsItems: NewsItem[] = [
  {
    source: '연합뉴스',
    title: '기준금리 전망에 채권형 ETF 관심 확대',
    summary: '금리 인하 기대와 변동성 장세가 겹치며 채권형 ETF로 자금이 유입되고 있습니다.',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    category: '국내주식·ETF',
    publishedAt: '2026-05-09T09:10:00+09:00',
  },
  {
    source: '매일경제',
    title: 'ISA 만기 앞둔 투자자, 연금계좌 이전 전략 주목',
    summary: '세액공제와 과세이연 효과를 함께 고려하는 계좌 이전 전략이 관심을 받고 있습니다.',
    url: 'https://www.mk.co.kr/rss/50200011/',
    category: '절세',
    publishedAt: '2026-05-08T16:40:00+09:00',
  },
];

export const NEWS_SOURCES = [
  { name: '매일경제', url: 'https://www.mk.co.kr/rss/50200011/' },
  { name: '한국경제', url: 'https://www.hankyung.com/feed/finance' },
  { name: '이데일리', url: 'https://rss.edaily.co.kr/stock_news.xml' },
  { name: '연합뉴스', url: 'https://www.yna.co.kr/rss/economy.xml' },
] as const;

const NEWS_CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  {
    keywords: ['QQQ', 'VOO', 'SPY', '나스닥', 'S&P', '미국주식', '해외주식', '엔비디아', '테슬라', '애플', 'LUNR'],
    category: '해외주식·ETF',
  },
  {
    keywords: ['ETF', 'KODEX', 'TIGER', '코스피', '코스닥', '국내주식', '증시', '배당'],
    category: '국내주식·ETF',
  },
  {
    keywords: ['절세', '세금', '연말정산', '양도세', 'ISA', '연금저축', 'IRP'],
    category: '절세',
  },
  {
    keywords: ['보험', '실손', '연금보험', '종신', '암보험'],
    category: '보험',
  },
  {
    keywords: ['대출', '부채', '금리', '주담대', '신용대출', '전세대출'],
    category: '대출·부채',
  },
];

export function classifyNewsCategory(title = '', summary = '') {
  const text = `${title} ${summary}`;
  const matched = NEWS_CATEGORY_RULES.find(rule => (
    rule.keywords.some(keyword => text.includes(keyword))
  ));

  return matched?.category || '재테크입문';
}

export function articleUrl(slug: string) {
  return `${FEED_PATH}/${encodeURIComponent(slug)}`;
}

export function feedUrl() {
  return FEED_URL;
}

export function toFeedItems(
  articles: HanipArticle[] = hanipArticles,
  newsItems: NewsItem[] = sampleNewsItems,
): FeedItem[] {
  return [
    ...articles.map(article => ({ ...article, type: 'column' as const })),
    ...newsItems.map(item => ({ ...item, type: 'news' as const })),
  ].sort((a, b) => (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  ));
}

export async function fetchFeedItems() {
  const [articles, newsItems] = await Promise.all([
    fetchGhostArticles(),
    fetchNewsItems(),
  ]);

  return toFeedItems(articles, newsItems);
}

export async function fetchGhostArticles(): Promise<HanipArticle[]> {
  try {
    const res = await fetch(GHOST_RSS_URL, {
      headers: {
        accept: 'application/rss+xml, application/xml, text/xml',
        'user-agent': 'JaetechHanipBot/1.0 (+https://we.hannipmoney.com/feed)',
      },
      next: { revalidate: 600 },
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

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return sampleNewsItems;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/news_items?select=id,source,title,summary,url,thumbnail_url,category,published_at,click_count&order=published_at.desc&limit=40`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        next: { revalidate: 600 },
      },
    );

    if (!res.ok) return sampleNewsItems;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return sampleNewsItems;

    return data
      .filter(item => item.title && item.url)
      .map(item => ({
        id: item.id,
        source: item.source || '뉴스',
        title: item.title,
        summary: item.summary || '',
        url: item.url,
        thumbnailUrl: item.thumbnail_url,
        category: normalizeFeedCategory(item.category, item.title, item.summary),
        publishedAt: item.published_at || new Date().toISOString(),
        clickCount: item.click_count ?? 0,
      }));
  } catch {
    return sampleNewsItems;
  }
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
  return classifyNewsCategory(`${title} ${tags.join(' ')}`, summary);
}

export function newsClickUrl(url: string) {
  return `/api/feed/news-click?url=${encodeURIComponent(url)}`;
}

export function isAllowedNewsUrl(url: string) {
  try {
    const target = new URL(url);
    const allowedHosts = NEWS_SOURCES.map(source => new URL(source.url).hostname.replace(/^www\./, ''));
    const host = target.hostname.replace(/^www\./, '');
    return allowedHosts.some(allowed => host === allowed || host.endsWith(`.${allowed}`));
  } catch {
    return false;
  }
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
