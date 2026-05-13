/**
 * 대가들의 실시간 보유 — 13F-HR 공시 기반.
 *
 * 데이터 출처: SEC EDGAR (https://www.sec.gov/edgar)
 *   13F-HR는 분기마다 45일 lag로 공개되는 펀드 보유 공시.
 *   미국 1억 달러 이상 자산운용사는 의무 공시.
 *
 * 갱신: 분기 (2/15, 5/15, 8/15, 11/15 경)
 * 현재 구조: 정적 시드. 추후 cron으로 EDGAR XML 자동 파싱 가능.
 *
 * 모델 포트폴리오 (portfolioTemplates.ts) 와 다른 점:
 * - 변동성 있음 — 분기마다 새 데이터
 * - ETF 아닌 개별 종목 중심
 * - "이 사람이 정말 갖고 있는 것"
 */

export type WhaleHolding = {
  /** 종목 티커 */
  ticker: string;
  /** 한글명 (혹은 영문) */
  name: string;
  /** 포트폴리오 내 비중 (0~1) */
  weight: number;
  /** 시장가치 (백만 달러) */
  valueMln: number;
  /** 직전 분기 대비 비중 변화: 신규/추가/감소/유지/매도 */
  change?: 'new' | 'add' | 'reduce' | 'hold' | 'exit';
  /** 종목 종류 — 개별주식 / ETF */
  kind: 'stock' | 'etf';
};

export type WhalePortfolio = {
  slug: string;
  /** 펀드/매니저 이름 */
  name: string;
  /** 매니저 본명 */
  manager: string;
  /** SEC CIK (10자리) */
  cik: string;
  /** 분기 식별 — "2024 Q4" */
  quarter: string;
  /** 공시일 */
  filedAt: string;
  /** 총 자산 (백만 달러) */
  totalValueMln: number;
  /** 개별 종목 수 */
  positionCount: number;
  /** 한 줄 소개 */
  tagline: string;
  /** 투자 철학 */
  philosophy: string;
  /** Top 10 보유 */
  topHoldings: WhaleHolding[];
};

/**
 * 시드 — 가장 잘 알려진 6명.
 * 분기마다 손으로 업데이트하거나 EDGAR cron으로 자동화.
 *
 * 데이터: 2024 Q4 13F (2025년 2월 공시 기준, 예시 값).
 * 실제 운영 시에는 EDGAR 최신 13F-HR XML 파싱 결과를 채워야 함.
 */
export const WHALE_PORTFOLIOS: WhalePortfolio[] = [
  {
    slug: 'berkshire',
    name: 'Berkshire Hathaway',
    manager: '워런 버핏',
    cik: '0001067983',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 267000,
    positionCount: 38,
    tagline: '오마하의 현인. 가치투자의 살아있는 교과서.',
    philosophy: '훌륭한 기업을 합리적 가격에 사고 영원히 보유하라.',
    topHoldings: [
      { ticker: 'AAPL', name: 'Apple',                weight: 0.286, valueMln: 75126, change: 'hold',   kind: 'stock' },
      { ticker: 'AXP',  name: 'American Express',     weight: 0.165, valueMln: 44073, change: 'hold',   kind: 'stock' },
      { ticker: 'BAC',  name: 'Bank of America',      weight: 0.111, valueMln: 29652, change: 'reduce', kind: 'stock' },
      { ticker: 'KO',   name: 'Coca-Cola',            weight: 0.094, valueMln: 25109, change: 'hold',   kind: 'stock' },
      { ticker: 'CVX',  name: 'Chevron',              weight: 0.068, valueMln: 17175, change: 'hold',   kind: 'stock' },
      { ticker: 'OXY',  name: 'Occidental Petroleum', weight: 0.044, valueMln: 11796, change: 'hold',   kind: 'stock' },
      { ticker: 'MCO',  name: 'Moody\'s',             weight: 0.041, valueMln: 10967, change: 'hold',   kind: 'stock' },
      { ticker: 'KHC',  name: 'Kraft Heinz',          weight: 0.034, valueMln: 9203,  change: 'hold',   kind: 'stock' },
      { ticker: 'CB',   name: 'Chubb',                weight: 0.029, valueMln: 7820,  change: 'hold',   kind: 'stock' },
      { ticker: 'DVA',  name: 'DaVita',               weight: 0.020, valueMln: 5370,  change: 'hold',   kind: 'stock' },
    ],
  },
  {
    slug: 'bridgewater',
    name: 'Bridgewater Associates',
    manager: '레이 달리오 (창업자)',
    cik: '0001350694',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 17600,
    positionCount: 870,
    tagline: '세계 최대 헷지펀드. 거시경제 기반 분산투자의 대가.',
    philosophy: '경기 사이클 어느 국면에서도 견디는 균형 (All Weather)을 만들어라.',
    topHoldings: [
      { ticker: 'IEMG', name: 'iShares Emerging Markets',  weight: 0.071, valueMln: 1257, change: 'hold',   kind: 'etf' },
      { ticker: 'SPY',  name: 'SPDR S&P 500',              weight: 0.055, valueMln: 974,  change: 'add',    kind: 'etf' },
      { ticker: 'GLD',  name: 'SPDR Gold Shares',          weight: 0.039, valueMln: 690,  change: 'add',    kind: 'etf' },
      { ticker: 'NVDA', name: 'NVIDIA',                    weight: 0.029, valueMln: 511,  change: 'hold',   kind: 'stock' },
      { ticker: 'WMT',  name: 'Walmart',                   weight: 0.026, valueMln: 465,  change: 'add',    kind: 'stock' },
      { ticker: 'MSFT', name: 'Microsoft',                 weight: 0.022, valueMln: 395,  change: 'hold',   kind: 'stock' },
      { ticker: 'GOOGL',name: 'Alphabet',                  weight: 0.020, valueMln: 351,  change: 'hold',   kind: 'stock' },
      { ticker: 'META', name: 'Meta Platforms',            weight: 0.018, valueMln: 322,  change: 'add',    kind: 'stock' },
      { ticker: 'JNJ',  name: 'Johnson & Johnson',         weight: 0.016, valueMln: 280,  change: 'hold',   kind: 'stock' },
      { ticker: 'PG',   name: 'Procter & Gamble',          weight: 0.015, valueMln: 271,  change: 'hold',   kind: 'stock' },
    ],
  },
  {
    slug: 'pershing-square',
    name: 'Pershing Square Capital',
    manager: '빌 애크먼',
    cik: '0001336528',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 13500,
    positionCount: 11,
    tagline: '집중 투자의 화신. 10여 종목에 자산 100%.',
    philosophy: '깊이 연구한 8~12개 위대한 기업에 자산을 몰아넣어라.',
    topHoldings: [
      { ticker: 'BN',   name: 'Brookfield',               weight: 0.198, valueMln: 2680, change: 'hold',   kind: 'stock' },
      { ticker: 'CMG',  name: 'Chipotle',                 weight: 0.171, valueMln: 2316, change: 'hold',   kind: 'stock' },
      { ticker: 'QSR',  name: 'Restaurant Brands',        weight: 0.137, valueMln: 1858, change: 'hold',   kind: 'stock' },
      { ticker: 'HLT',  name: 'Hilton',                   weight: 0.128, valueMln: 1733, change: 'hold',   kind: 'stock' },
      { ticker: 'HHH',  name: 'Howard Hughes Holdings',   weight: 0.111, valueMln: 1502, change: 'hold',   kind: 'stock' },
      { ticker: 'NKE',  name: 'Nike',                     weight: 0.084, valueMln: 1133, change: 'add',    kind: 'stock' },
      { ticker: 'CP',   name: 'Canadian Pacific Kansas',  weight: 0.077, valueMln: 1041, change: 'hold',   kind: 'stock' },
      { ticker: 'GOOGL',name: 'Alphabet',                 weight: 0.052, valueMln: 706,  change: 'hold',   kind: 'stock' },
      { ticker: 'GOOG', name: 'Alphabet (C)',             weight: 0.025, valueMln: 339,  change: 'hold',   kind: 'stock' },
      { ticker: 'SEG',  name: 'Seaport Entertainment',    weight: 0.005, valueMln: 65,   change: 'new',    kind: 'stock' },
    ],
  },
  {
    slug: 'scion-burry',
    name: 'Scion Asset Management',
    manager: '마이클 버리 (빅쇼트 주인공)',
    cik: '0001649339',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 70,
    positionCount: 14,
    tagline: '서브프라임 위기를 예측한 그 인물. 자주 매매 회전.',
    philosophy: '경기 변동에 베팅. 시장 정점에 인버스/숏 포지션.',
    topHoldings: [
      { ticker: 'BABA', name: 'Alibaba',                  weight: 0.165, valueMln: 12,   change: 'add',    kind: 'stock' },
      { ticker: 'JD',   name: 'JD.com',                   weight: 0.121, valueMln: 8.5,  change: 'add',    kind: 'stock' },
      { ticker: 'BIDU', name: 'Baidu',                    weight: 0.098, valueMln: 6.9,  change: 'hold',   kind: 'stock' },
      { ticker: 'PDD',  name: 'PDD Holdings (Temu)',      weight: 0.094, valueMln: 6.6,  change: 'add',    kind: 'stock' },
      { ticker: 'BTU',  name: 'Peabody Energy',           weight: 0.072, valueMln: 5.0,  change: 'new',    kind: 'stock' },
      { ticker: 'TLN',  name: 'Talen Energy',             weight: 0.063, valueMln: 4.4,  change: 'new',    kind: 'stock' },
      { ticker: 'CVS',  name: 'CVS Health',               weight: 0.054, valueMln: 3.8,  change: 'hold',   kind: 'stock' },
      { ticker: 'MOS',  name: 'Mosaic',                   weight: 0.043, valueMln: 3.0,  change: 'hold',   kind: 'stock' },
      { ticker: 'BIIB', name: 'Biogen',                   weight: 0.039, valueMln: 2.7,  change: 'hold',   kind: 'stock' },
      { ticker: 'GOLF', name: 'Acushnet (Titleist)',      weight: 0.030, valueMln: 2.1,  change: 'new',    kind: 'stock' },
    ],
  },
  {
    slug: 'duquesne-druckenmiller',
    name: 'Duquesne Family Office',
    manager: '스탠리 드러켄밀러',
    cik: '0001536411',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 3400,
    positionCount: 75,
    tagline: '30년간 단 한 해도 마이너스 없는 전설의 매크로 트레이더.',
    philosophy: '큰 그림을 보고 확신이 들 때 강하게 베팅.',
    topHoldings: [
      { ticker: 'NTRA', name: 'Natera',                   weight: 0.069, valueMln: 234, change: 'hold',   kind: 'stock' },
      { ticker: 'PHIN', name: 'PHINIA',                   weight: 0.055, valueMln: 187, change: 'hold',   kind: 'stock' },
      { ticker: 'KGC',  name: 'Kinross Gold',             weight: 0.052, valueMln: 177, change: 'add',    kind: 'stock' },
      { ticker: 'TEVA', name: 'Teva Pharmaceutical',      weight: 0.049, valueMln: 166, change: 'hold',   kind: 'stock' },
      { ticker: 'WBD',  name: 'Warner Bros. Discovery',   weight: 0.045, valueMln: 153, change: 'hold',   kind: 'stock' },
      { ticker: 'COHR', name: 'Coherent',                 weight: 0.041, valueMln: 139, change: 'hold',   kind: 'stock' },
      { ticker: 'WDAY', name: 'Workday',                  weight: 0.038, valueMln: 129, change: 'add',    kind: 'stock' },
      { ticker: 'KVUE', name: 'Kenvue',                   weight: 0.035, valueMln: 119, change: 'add',    kind: 'stock' },
      { ticker: 'INSM', name: 'Insmed',                   weight: 0.032, valueMln: 109, change: 'add',    kind: 'stock' },
      { ticker: 'AMZN', name: 'Amazon',                   weight: 0.029, valueMln: 99,  change: 'hold',   kind: 'stock' },
    ],
  },
  {
    slug: 'baupost',
    name: 'Baupost Group',
    manager: '세스 클라만',
    cik: '0001061768',
    quarter: '2024 Q4',
    filedAt: '2025-02-14',
    totalValueMln: 4800,
    positionCount: 33,
    tagline: '버크셔에 가려졌지만 헤지펀드 가치투자의 거장.',
    philosophy: '안전마진. 본질가치 대비 30% 이상 싸야 산다.',
    topHoldings: [
      { ticker: 'LBTYK', name: 'Liberty Global',           weight: 0.110, valueMln: 528, change: 'hold',   kind: 'stock' },
      { ticker: 'SATS',  name: 'EchoStar',                 weight: 0.098, valueMln: 470, change: 'add',    kind: 'stock' },
      { ticker: 'GOOGL', name: 'Alphabet',                 weight: 0.094, valueMln: 451, change: 'hold',   kind: 'stock' },
      { ticker: 'WSC',   name: 'WillScot',                 weight: 0.083, valueMln: 398, change: 'hold',   kind: 'stock' },
      { ticker: 'IAC',   name: 'IAC Inc',                  weight: 0.071, valueMln: 341, change: 'hold',   kind: 'stock' },
      { ticker: 'CRH',   name: 'CRH plc',                  weight: 0.064, valueMln: 307, change: 'hold',   kind: 'stock' },
      { ticker: 'GFL',   name: 'GFL Environmental',        weight: 0.058, valueMln: 278, change: 'hold',   kind: 'stock' },
      { ticker: 'FNF',   name: 'Fidelity National Financial', weight: 0.052, valueMln: 250, change: 'hold', kind: 'stock' },
      { ticker: 'DBRG',  name: 'DigitalBridge Group',      weight: 0.045, valueMln: 216, change: 'hold',   kind: 'stock' },
      { ticker: 'CBRE',  name: 'CBRE Group',               weight: 0.040, valueMln: 192, change: 'add',    kind: 'stock' },
    ],
  },
];

export function getWhaleBySlug(slug: string): WhalePortfolio | undefined {
  return WHALE_PORTFOLIOS.find(w => w.slug === slug);
}

export const CHANGE_LABEL: Record<NonNullable<WhaleHolding['change']>, { label: string; tone: 'good' | 'warn' | 'neutral' }> = {
  new:    { label: '신규',     tone: 'good' },
  add:    { label: '추가매수', tone: 'good' },
  reduce: { label: '감소',     tone: 'warn' },
  hold:   { label: '유지',     tone: 'neutral' },
  exit:   { label: '매도',     tone: 'warn' },
};
