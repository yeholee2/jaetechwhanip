import type { FeedItem } from '@/lib/feed';
import { truncateText } from '@/lib/rss';

export type FeedDigest = {
  kicker: string;
  oneLine: string;
  why: string;
  points: string[];
  nextQuestion: string;
};

const CATEGORY_GUIDES: Record<string, { why: string; nextQuestion: string }> = {
  재테크입문: {
    why: '처음 기준을 잡는 단계에서는 작은 조건 차이가 실제 선택을 크게 바꿔요.',
    nextQuestion: '내 월급과 목표 기간에 맞게 적용하면 뭐가 달라질까?',
  },
  '국내주식·ETF': {
    why: '국내 ETF와 주식 이슈는 세금, 환율 부담, 매수 타이밍을 같이 흔들 수 있어요.',
    nextQuestion: '내가 가진 ETF나 관심 종목에는 어떤 영향이 있을까?',
  },
  '해외주식·ETF': {
    why: '해외 ETF는 가격만큼 환율, 세금, 장기 보유 비용까지 함께 봐야 해요.',
    nextQuestion: '원화 기준 수익률과 세후 수익률로 보면 판단이 달라질까?',
  },
  절세: {
    why: '절세 계좌는 가입보다 순서와 한도 관리가 수익률을 더 크게 바꿀 때가 많아요.',
    nextQuestion: 'ISA, 연금저축, IRP 중 내게 먼저 채울 계좌는 뭘까?',
  },
  보험: {
    why: '보험은 보장 공백과 중복 보장을 같이 확인해야 과한 지출을 줄일 수 있어요.',
    nextQuestion: '내 보험에서 줄여도 되는 부분과 꼭 남길 부분은 뭘까?',
  },
  '대출·부채': {
    why: '대출과 금리 글은 월 상환액, 갈아타기, 비상금 계획에 바로 연결돼요.',
    nextQuestion: '내 대출 조건에서는 고정금리와 변동금리 중 뭐가 더 안전할까?',
  },
};

const KEYWORD_GUIDES: Array<{ keywords: string[]; why: string; nextQuestion: string }> = [
  {
    keywords: ['금리', '기준금리', '채권'],
    why: '금리 방향은 예금, 채권형 ETF, 대출 이자까지 한 번에 영향을 줘요.',
    nextQuestion: '지금은 현금, 채권형 ETF, 대출 상환 중 어디에 우선순위를 둘까?',
  },
  {
    keywords: ['ISA', '연금', 'IRP', '세액공제'],
    why: '절세 계좌는 같은 돈을 넣어도 계좌 순서에 따라 돌려받는 금액이 달라져요.',
    nextQuestion: '올해 남은 한도를 어떤 계좌부터 채우는 게 좋을까?',
  },
  {
    keywords: ['S&P', 'SPY', 'VOO', 'IVV', '나스닥', 'QQQ'],
    why: '대표 지수 ETF는 상품 이름보다 환율, 보수, 매수 주기가 더 중요할 때가 많아요.',
    nextQuestion: '내 투자 기간이면 어떤 ETF 조합이 덜 흔들릴까?',
  },
  {
    keywords: ['배당', '월배당', '분배금'],
    why: '배당은 현금흐름처럼 보이지만 세금과 총수익률을 같이 봐야 해요.',
    nextQuestion: '배당을 받는 게 나은지 재투자가 나은지 어떻게 비교할까?',
  },
  {
    keywords: ['실손', '보험', '보장'],
    why: '보험료는 매달 빠져나가서 작아 보여도 장기로 보면 투자 여력에 영향을 줘요.',
    nextQuestion: '내 보장 내역에서 중복되거나 부족한 항목은 뭘까?',
  },
  {
    keywords: ['대출', '주담대', '전세대출', '신용대출'],
    why: '대출 조건은 작은 금리 차이도 1년 이자로 바꾸면 체감 금액이 커져요.',
    nextQuestion: '갈아타기 수수료까지 포함하면 실제로 이득일까?',
  },
];

export function createFeedDigest(item: FeedItem): FeedDigest {
  const sourceText = item.description;
  const cleanText = normalizeText(sourceText || item.title);
  const guide = findGuide(item.title, cleanText, item.category);
  const firstPoint = truncateText(cleanText, 82);
  const secondPoint = `${item.readingTime} 안에 질문 전에 필요한 판단 기준을 먼저 잡기 좋아요.`;

  return {
    kicker: '칼럼 정리',
    oneLine: firstPoint || '핵심만 먼저 보고, 자세한 내용은 원문에서 이어서 확인해요.',
    why: guide.why,
    points: [
      firstPoint || item.title,
      secondPoint,
      `${item.category} 관점에서 내 돈의 흐름과 연결해서 보면 좋아요.`,
    ],
    nextQuestion: guide.nextQuestion,
  };
}

function findGuide(title: string, text: string, category: string) {
  const source = `${title} ${text}`;
  const keywordGuide = KEYWORD_GUIDES.find(guide => (
    guide.keywords.some(keyword => source.includes(keyword))
  ));

  return keywordGuide || CATEGORY_GUIDES[category] || CATEGORY_GUIDES.재테크입문;
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\[[^\]]+\]/g, '')
    .trim();
}
