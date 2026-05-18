import { SITE_URL } from '@/lib/seo';

export type EtfHolding = {
  name: string;
  weight: string;
  note: string;
};

export type EtfQuestion = {
  tag: string;
  title: string;
  meta: string;
};

export type EtfInfo = {
  slug: string;
  code: string;
  name: string;
  shortName: string;
  issuer: string;
  category: string;
  theme: string;
  summary: string;
  oneLine: string;
  price: string;
  change: string;
  changeTone: 'up' | 'down' | 'flat';
  aum: string;
  fee: string;
  distribution: string;
  hedge: string;
  listedAt: string;
  volume: string;
  tags: string[];
  fit: string;
  holdings: EtfHolding[];
  relatedQuestions: EtfQuestion[];
  sparringTitle: string;
  /** 거래소 — 'KRX'(한국), 'NYSE', 'NASDAQ', 'HKEX' 등. 기본 'KRX'. */
  market?: string;
  /** 발행국가 — 'KR', 'US', 'HK', 'JP' 등. 기본 'KR'. */
  country?: string;
  /** 거래통화 — 'KRW', 'USD', 'HKD' 등. 기본 'KRW'. */
  currency?: string;
  /** 추종 자산 국가 — 'KR', 'US', 'CN', 'JP', 'IN', 'EU', 'GLOBAL', 'EM' 등. */
  underlyingCountry?: string;
  /** 추종 지수명 (예: 'KRX 바이오 TOP 10 지수', 'S&P 500 Index'). */
  trackingIndex?: string;
  /** 가격/순자산 등 시장 스냅샷 기준일. */
  baseDate?: string;
  /** ETF 기준가격/NAV. */
  nav?: string;
  /** 거래대금. */
  tradeValue?: string;
  /** 데이터 출처. static이면 시드 메타데이터이며 시장 스냅샷으로 쓰면 안 된다. */
  dataSource?: string;
  /** 사용자에게 표시할 데이터 출처 안내. */
  dataNotice?: string;
};

export const ETF_HOME_PATH = '/etf';
export const ETF_HOME_URL = `${SITE_URL}${ETF_HOME_PATH}`;

export const etfs: EtfInfo[] = [
  {
    slug: 'tiger-미국sp500',
    code: '360750',
    name: 'TIGER 미국S&P500',
    shortName: 'TIGER S&P500',
    issuer: '미래에셋자산운용',
    category: '국내상장 해외 ETF',
    theme: 'S&P500',
    summary: '미국 대표 500개 기업에 원화 계좌로 분산 투자하는 ETF예요.',
    oneLine: '환전 없이 S&P500에 장기 적립하고 싶을 때 먼저 비교해요.',
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    fee: '연 0.07%',
    distribution: '분기 지급',
    hedge: '미실시',
    listedAt: '2020.08.07',
    volume: '',
    tags: ['S&P500', 'ISA', '연금저축', '분기분배'],
    fit: 'ISA·연금저축',
    holdings: [
      { name: '엔비디아', weight: '6.8%', note: 'AI 반도체 비중' },
      { name: '애플', weight: '6.7%', note: '대표 빅테크' },
      { name: '마이크로소프트', weight: '6.3%', note: '클라우드·AI' },
    ],
    relatedQuestions: [
      { tag: '#S&P500', title: 'VOO 대신 국내상장 S&P500 ETF를 사도 괜찮을까요?', meta: '답변 6 · 조회 2,031' },
      { tag: '#ISA', title: 'ISA에서는 TIGER 미국S&P500이 괜찮은 선택인가요?', meta: '답변 4 · 조회 1,248' },
    ],
    sparringTitle: '지금 S&P500 들어가도 될까요?',
  },
  {
    slug: 'kodex-미국나스닥100tr',
    code: '379810',
    name: 'KODEX 미국나스닥100TR',
    shortName: 'KODEX 나스닥100TR',
    issuer: '삼성자산운용',
    category: '국내상장 해외 ETF',
    theme: '나스닥100',
    summary: '나스닥100 지수를 따라가되 분배금을 재투자하는 TR형 ETF예요.',
    oneLine: '분배금보다 장기 복리와 성장주 노출을 우선할 때 비교해요.',
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    fee: '연 0.05%',
    distribution: '재투자',
    hedge: '미실시',
    listedAt: '2021.04.09',
    volume: '',
    tags: ['나스닥100', 'TR', '성장주', '장기투자'],
    fit: '장기 복리',
    holdings: [
      { name: '마이크로소프트', weight: '8.4%', note: '클라우드·AI' },
      { name: '엔비디아', weight: '7.9%', note: '반도체 성장' },
      { name: '애플', weight: '7.6%', note: '빅테크 핵심' },
    ],
    relatedQuestions: [
      { tag: '#나스닥100', title: 'S&P500이랑 나스닥100 중 초보자는 뭐가 나아요?', meta: '답변 8 · 조회 2,814' },
      { tag: '#TR', title: 'TR ETF는 분배금 ETF보다 장기투자에 유리한가요?', meta: '답변 5 · 조회 1,520' },
    ],
    sparringTitle: '나스닥100 비중을 S&P500보다 높여도 될까요?',
  },
  {
    slug: 'ace-미국배당다우존스',
    code: '402970',
    name: 'ACE 미국배당다우존스',
    shortName: 'ACE 미국배당',
    issuer: '한국투자신탁운용',
    category: '국내상장 해외 ETF',
    theme: '배당성장',
    summary: '미국 배당성장주에 투자해 분배금 흐름을 체감하기 쉬운 ETF예요.',
    oneLine: '월급 같은 현금흐름을 원할 때 배당률만 보지 않고 비교해요.',
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    fee: '연 0.01%',
    distribution: '월 지급',
    hedge: '미실시',
    listedAt: '2021.10.21',
    volume: '',
    tags: ['배당', '월배당', 'SCHD', '현금흐름'],
    fit: '월분배 선호',
    holdings: [
      { name: '브로드컴', weight: '4.2%', note: '배당 성장' },
      { name: '홈디포', weight: '4.1%', note: '소비재 배당' },
      { name: '텍사스 인스트루먼트', weight: '3.9%', note: '반도체 배당' },
    ],
    relatedQuestions: [
      { tag: '#월배당', title: '월배당 ETF는 초보자가 시작하기 괜찮은가요?', meta: '답변 3 · 조회 918' },
      { tag: '#배당ETF', title: '배당 ETF는 세금까지 보면 손해일 수도 있나요?', meta: '답변 5 · 조회 1,104' },
    ],
    sparringTitle: '월배당 ETF를 월급처럼 받아도 될까요?',
  },
  {
    slug: 'kodex-미국sp500tr',
    code: '379800',
    name: 'KODEX 미국S&P500TR',
    shortName: 'KODEX S&P500TR',
    issuer: '삼성자산운용',
    category: '국내상장 해외 ETF',
    theme: 'S&P500 TR',
    summary: 'S&P500 분배금을 자동 재투자하는 TR형 ETF예요.',
    oneLine: '분배금을 바로 쓰지 않는 장기투자자라면 비교 후보가 돼요.',
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    fee: '연 0.05%',
    distribution: '재투자',
    hedge: '미실시',
    listedAt: '2021.04.09',
    volume: '',
    tags: ['S&P500', 'TR', '재투자', '장기투자'],
    fit: '분배금 불필요',
    holdings: [
      { name: '엔비디아', weight: '6.8%', note: 'AI 반도체 비중' },
      { name: '애플', weight: '6.7%', note: '대표 빅테크' },
      { name: '마이크로소프트', weight: '6.3%', note: '클라우드·AI' },
    ],
    relatedQuestions: [
      { tag: '#TR', title: 'S&P500 TR ETF는 분배금 ETF보다 복리에 유리해요?', meta: '답변 4 · 조회 1,380' },
      { tag: '#장기투자', title: '분배금 안 받는 ETF가 연금저축에 더 잘 맞나요?', meta: '답변 7 · 조회 1,902' },
    ],
    sparringTitle: 'ISA에서는 TR ETF가 더 유리할까요?',
  },
  {
    slug: 'tiger-미국필라델피아반도체나스닥',
    code: '381180',
    name: 'TIGER 미국필라델피아반도체나스닥',
    shortName: 'TIGER 반도체',
    issuer: '미래에셋자산운용',
    category: '국내상장 해외 ETF',
    theme: '반도체',
    summary: '미국 반도체 대표 기업에 집중 투자하는 테마형 ETF예요.',
    oneLine: '엔비디아를 직접 사기 부담스러울 때 ETF 노출로 비교해요.',
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    fee: '연 0.49%',
    distribution: '분기 지급',
    hedge: '미실시',
    listedAt: '2021.04.09',
    volume: '',
    tags: ['반도체', '엔비디아', 'AI', '테마형'],
    fit: '테마 투자',
    holdings: [
      { name: '엔비디아', weight: '11.9%', note: '최대 편입권' },
      { name: '브로드컴', weight: '8.6%', note: 'AI 인프라' },
      { name: 'AMD', weight: '6.4%', note: '반도체 경쟁' },
    ],
    relatedQuestions: [
      { tag: '#엔비디아', title: '엔비디아를 개별주 대신 ETF로 사도 괜찮을까요?', meta: '답변 4 · 조회 1,730' },
      { tag: '#테마형', title: '반도체 ETF는 포트폴리오에서 몇 퍼센트가 적당해요?', meta: '답변 6 · 조회 1,112' },
    ],
    sparringTitle: 'AI 반도체 ETF, 지금 비중 늘려도 될까요?',
  },
];

export const etfFilters = ['전체', 'S&P500', '나스닥100', '배당', '월배당', '반도체', 'TR', 'ISA'];

export const etfCompareRows = [
  {
    name: 'TIGER 미국S&P500',
    fee: '0.07%',
    distribution: '분기',
    hedge: '미실시',
    fit: 'ISA·연금저축',
    slug: 'tiger-미국sp500',
  },
  {
    name: 'KODEX 미국S&P500TR',
    fee: '0.05%',
    distribution: '재투자',
    hedge: '미실시',
    fit: '장기 복리',
    slug: 'kodex-미국sp500tr',
  },
  {
    name: 'ACE 미국배당다우존스',
    fee: '0.01%',
    distribution: '월 지급',
    hedge: '미실시',
    fit: '현금흐름',
    slug: 'ace-미국배당다우존스',
  },
];

export const holdingSearchRows = [
  {
    holding: '엔비디아',
    weight: '11.9%',
    etf: 'TIGER 미국필라델피아반도체나스닥',
    reason: '반도체 테마 노출',
    slug: 'tiger-미국필라델피아반도체나스닥',
  },
  {
    holding: '애플',
    weight: '6.7%',
    etf: 'TIGER 미국S&P500',
    reason: 'S&P500 대표 편입',
    slug: 'tiger-미국sp500',
  },
  {
    holding: '마이크로소프트',
    weight: '8.4%',
    etf: 'KODEX 미국나스닥100TR',
    reason: '나스닥100 핵심',
    slug: 'kodex-미국나스닥100tr',
  },
];

export function etfPath(slug: string) {
  return `${ETF_HOME_PATH}/${encodeURIComponent(slug)}`;
}

export function etfUrl(slug: string) {
  return `${SITE_URL}${etfPath(slug)}`;
}

export function getEtfBySlug(slug: string) {
  const match = etfs.find(etf => etf.slug === decodeURIComponent(slug));
  return match ? stripEtfMarketSnapshot(match) : undefined;
}

/** ETF 종목 코드(6자리)로 ETF 찾기. */
export function getEtfByCode(code: string | null | undefined) {
  if (!code) return undefined;
  const match = etfs.find(etf => etf.code === code);
  return match ? stripEtfMarketSnapshot(match) : undefined;
}

export function stripEtfMarketSnapshot(etf: EtfInfo): EtfInfo {
  return {
    ...etf,
    price: '',
    change: '',
    changeTone: 'flat',
    aum: '',
    volume: '',
    nav: '',
    tradeValue: '',
    baseDate: '',
    dataSource: 'static',
    dataNotice: '시드 메타데이터 - 실시간 시세 미연동',
  };
}

export function getStaticEtfMetadata(): EtfInfo[] {
  return etfs.map(stripEtfMarketSnapshot);
}

export function getRelatedEtfs(currentSlug: string, limit = 3) {
  const current = getEtfBySlug(currentSlug);
  const staticEtfs = getStaticEtfMetadata();
  if (!current) return staticEtfs.slice(0, limit);

  return staticEtfs
    .filter(etf => etf.slug !== current.slug)
    .sort((a, b) => scoreRelatedEtf(b, current) - scoreRelatedEtf(a, current))
    .slice(0, limit);
}

function scoreRelatedEtf(candidate: EtfInfo, current: EtfInfo) {
  let score = 0;
  if (candidate.theme.includes(current.theme) || current.theme.includes(candidate.theme)) score += 4;
  if (candidate.category === current.category) score += 2;
  candidate.tags.forEach(tag => {
    if (current.tags.includes(tag)) score += 1;
  });
  return score;
}
