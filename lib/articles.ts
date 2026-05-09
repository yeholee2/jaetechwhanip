export const ARTICLE_PATH = '/articles';
export const ARTICLE_URL =
  process.env.NEXT_PUBLIC_ARTICLE_URL?.replace(/\/$/, '') ||
  'https://article.hannipmoney.com';

export type HanipArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  publishedAt: string;
  tags: string[];
};

export const hanipArticles: HanipArticle[] = [
  {
    slug: 'sp500-etf-first-rule',
    title: 'S&P500 ETF를 처음 살 때 먼저 정해야 하는 3가지',
    description: 'VOO, IVV, SPY 이름보다 중요한 건 투자 기간, 환율 부담, 매수 주기입니다.',
    category: '주식·ETF',
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
    category: '주식·ETF',
    readingTime: '3분',
    publishedAt: '2026-05-07T08:30:00+09:00',
    tags: ['월배당', '배당ETF', '세금'],
  },
];
