/**
 * 대가들의 포트폴리오 템플릿.
 *
 * 비로그인 사용자도 둘러볼 수 있는 "이거 따라하면 어때요" 카탈로그.
 * 우리가 시드한 미국 상장 ETF 티커로만 구성 (DB에 모두 존재).
 * 1Y 백테스트는 Yahoo Finance 일별 종가로 즉석 계산.
 */

export type TemplateAllocation = {
  /** 미국 상장 ETF 티커 (DB에 존재해야 함) */
  ticker: string;
  /** 사용자가 보는 짧은 한글명 */
  label: string;
  /** 0~1 비중 */
  weight: number;
  /** 역할 (예: "미국 주식 코어", "장기채") */
  role: string;
  /** 국내 상장 대체 ETF — KRX 6자리 코드 + 짧은 이름 */
  krAlternative?: { code: string; name: string };
};

export type PortfolioTemplate = {
  slug: string;
  name: string;
  author: string;
  tagline: string;
  description: string;
  /** 누구한테 좋음 */
  fitFor: string;
  /** 위험 등급 1~5 */
  risk: 1 | 2 | 3 | 4 | 5;
  allocations: TemplateAllocation[];
  /** Toss 톤: 누구나 이해하는 한 줄 강점 */
  strength: string;
  /** 주의 */
  caution: string;
  /** 출처 — 책/공식 인터뷰. 신뢰 표시 */
  source: string;
};

export const PORTFOLIO_TEMPLATES: PortfolioTemplate[] = [
  {
    slug: 'buffett-90-10',
    name: '버핏의 90/10',
    author: '워런 버핏',
    tagline: 'S&P500 90% + 단기국채 10%',
    description: '버핏이 본인 사망 후 부인에게 남길 자금 운용으로 추천한 단순한 구성. "전문가 펀드 매니저보다 인덱스가 낫다"는 그의 철학.',
    fitFor: '오래 묵힐 수 있는 장기 투자자. 단순함을 사랑하는 사람.',
    risk: 4,
    strength: '구성이 단순하고 비용이 매우 낮음. 50년 백테스트에서 우상향.',
    caution: '주식 비중 90%라 단기 변동성이 큼. 1년 -30%도 각오해야 함.',
    source: '버크셔 해서웨이 2013년 주주 서한',
    allocations: [
      {
        ticker: 'VOO', label: 'S&P 500', weight: 0.90, role: '미국 주식 코어',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'BIL', label: '초단기국채', weight: 0.10, role: '현금성',
        krAlternative: { code: '153130', name: 'KODEX 단기채권액티브' },
      },
    ],
  },
  {
    slug: 'all-weather',
    name: '올웨더',
    author: '레이 달리오',
    tagline: '경기 사이클 어느 국면이든 견디는 균형형',
    description: '브리지워터 창업자 레이 달리오의 대표 포트폴리오. 인플레이션·디플레이션·성장·침체 4국면 모두에서 손실 최소화가 설계 목표.',
    fitFor: '큰 하락이 무서운 보수적 투자자. 잠 잘 자고 싶은 사람.',
    risk: 2,
    strength: '2008·2020 폭락에서도 다른 포트보다 훨씬 적게 빠짐. 변동성 낮음.',
    caution: '강세장에서 수익률이 S&P500보다 한참 낮음. 인내 필요.',
    source: 'Tony Robbins 『MONEY: Master The Game』 + Dalio 공개 인터뷰',
    allocations: [
      {
        ticker: 'VTI', label: '미국 전체주식', weight: 0.30, role: '주식',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'TLT', label: '미국 장기국채', weight: 0.40, role: '장기 채권',
        krAlternative: { code: '304660', name: 'KODEX 미국채울트라30년선물(H)' },
      },
      {
        ticker: 'IEF', label: '미국 중기국채', weight: 0.15, role: '중기 채권',
        krAlternative: { code: '305080', name: 'TIGER 미국채10년선물' },
      },
      {
        ticker: 'GLD', label: '금', weight: 0.075, role: '인플레 헷지',
        krAlternative: { code: '132030', name: 'KODEX 골드선물(H)' },
      },
      {
        ticker: 'USO', label: '원유', weight: 0.075, role: '원자재',
        krAlternative: { code: '261220', name: 'KODEX WTI원유선물(H)' },
      },
    ],
  },
  {
    slug: 'bogleheads-3',
    name: '보글헤드 3펀드',
    author: '존 보글 (Vanguard 창업자)',
    tagline: '미국 + 해외 + 채권 단 3개',
    description: 'Vanguard 창업자 존 보글이 추천한 "단 3 ETF로 끝나는 분산". 인덱스 투자의 정석.',
    fitFor: '복잡한 거 싫고 간단하게 분산 투자 하고 싶은 사람.',
    risk: 3,
    strength: '관리 부담 0, 보수 매우 낮음, 글로벌 분산.',
    caution: '미국 비중이 60%로 여전히 미국 의존도 높음.',
    source: 'Bogleheads 공식 위키 (Three-fund portfolio)',
    allocations: [
      {
        ticker: 'VTI', label: '미국 전체주식', weight: 0.60, role: '미국 주식',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'VXUS', label: '미국 제외 해외주식', weight: 0.30, role: '해외 주식',
        krAlternative: { code: '195930', name: 'TIGER 유로스탁스50(합성 H)' },
      },
      {
        ticker: 'BND', label: '미국 종합채권', weight: 0.10, role: '채권',
        krAlternative: { code: '273130', name: 'KODEX 종합채권(AA-이상)액티브' },
      },
    ],
  },
  {
    slug: '60-40-classic',
    name: '60/40 클래식',
    author: '월가의 정석',
    tagline: 'S&P500 60% + 미국 종합채권 40%',
    description: '수십 년간 미국 연기금·재단의 표준 자산배분. 단순하지만 위기마다 검증된 구성.',
    fitFor: '균형감 있는 중장기 투자자.',
    risk: 3,
    strength: '주식 상승의 60%를 챙기되 채권이 하락을 완화. 검증된 클래식.',
    caution: '2022년처럼 주식·채권이 동시에 빠지는 해에는 둘 다 손실.',
    source: 'Markowitz 1952 현대포트폴리오이론 + 미국 연기금 표준 (Vanguard Balanced Index 기준)',
    allocations: [
      {
        ticker: 'VOO', label: 'S&P 500', weight: 0.60, role: '주식',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'AGG', label: '미국 종합채권', weight: 0.40, role: '채권',
        krAlternative: { code: '273130', name: 'KODEX 종합채권(AA-이상)액티브' },
      },
    ],
  },
  {
    slug: 'permanent-portfolio',
    name: '영구 포트폴리오',
    author: '해리 브라운',
    tagline: '주식·국채·금·현금 균등 25%',
    description: '4가지 자산을 25%씩 나눠 어떤 시장 환경에도 살아남는 것을 목표. 50년 가까이 검증된 단순 균형.',
    fitFor: '극도로 보수적인 투자자. 자산을 지키는 것이 최우선.',
    risk: 2,
    strength: '대공황·스태그플레이션 같은 극단 상황에서도 손실이 적음.',
    caution: '강세장에서는 수익률 평범. 현금 25%로 인플레 손실 가능.',
    source: 'Harry Browne 1981 『Why The Best-Laid Investment Plans Usually Go Wrong』',
    allocations: [
      {
        ticker: 'VTI', label: '미국 전체주식', weight: 0.25, role: '주식',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'TLT', label: '미국 장기국채', weight: 0.25, role: '장기 채권',
        krAlternative: { code: '304660', name: 'KODEX 미국채울트라30년선물(H)' },
      },
      {
        ticker: 'GLD', label: '금', weight: 0.25, role: '금',
        krAlternative: { code: '132030', name: 'KODEX 골드선물(H)' },
      },
      {
        ticker: 'BIL', label: '초단기국채', weight: 0.25, role: '현금성',
        krAlternative: { code: '153130', name: 'KODEX 단기채권액티브' },
      },
    ],
  },
  {
    slug: 'yale-endowment',
    name: '예일 모델',
    author: '데이비드 스웬슨 (Yale)',
    tagline: '주식·해외·신흥·리츠·국채·물가채',
    description: '예일대 기금을 운용하며 30년간 시장 평균을 압도한 스웬슨의 자산배분 개념을 ETF로 재구현.',
    fitFor: '깊은 분산을 원하는 투자자.',
    risk: 3,
    strength: '주식·해외·신흥국·부동산·채권까지 다층 분산.',
    caution: '구성이 복잡함. 리밸런싱 신경써야 함.',
    source: 'David Swensen 『Unconventional Success』 (개인투자자용 권장 비중)',
    allocations: [
      {
        ticker: 'VTI', label: '미국 주식', weight: 0.30, role: '미국 주식',
        krAlternative: { code: '360750', name: 'TIGER 미국S&P500' },
      },
      {
        ticker: 'VEA', label: '선진국 해외', weight: 0.15, role: '해외 주식',
        krAlternative: { code: '195930', name: 'TIGER 유로스탁스50(합성 H)' },
      },
      {
        ticker: 'VWO', label: '신흥국', weight: 0.05, role: '이머징',
        krAlternative: { code: '253160', name: 'TIGER 차이나CSI300' },
      },
      {
        ticker: 'VNQ', label: '미국 리츠', weight: 0.20, role: '부동산',
        krAlternative: { code: '351320', name: 'KODEX 미국부동산리츠(H)' },
      },
      {
        ticker: 'TLT', label: '장기국채', weight: 0.15, role: '장기 채권',
        krAlternative: { code: '304660', name: 'KODEX 미국채울트라30년선물(H)' },
      },
      {
        ticker: 'TIP', label: '물가연동채', weight: 0.15, role: '인플레 헷지',
        krAlternative: { code: '273130', name: 'KODEX 종합채권(AA-이상)액티브' },
      },
    ],
  },
];

export function getTemplateBySlug(slug: string): PortfolioTemplate | undefined {
  return PORTFOLIO_TEMPLATES.find(t => t.slug === slug);
}
