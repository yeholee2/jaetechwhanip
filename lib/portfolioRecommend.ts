/**
 * 맞춤 포트폴리오 추천 — TDF (Target Date Fund) 스타일 자산 배분.
 *
 * 입력: 나이 / 은퇴 시점 / 위험성향 / 한국·미국 비중 / 월 적립금
 * 출력: 자산 배분 % + 카테고리별 추천 ETF + 예상 수익률·변동성
 *
 * 알고리즘: 110 - age = 기본 주식 비중 (현대 글라이드 패스)
 *  + 위험성향 가감 (-10 / 0 / +10)
 *  + 은퇴 5년 이내 안전 마진
 */

export type RiskProfile = 'conservative' | 'neutral' | 'aggressive';

export type RecommendInput = {
  age: number;         // 현재 나이
  retireAge: number;   // 은퇴 목표 나이
  risk: RiskProfile;
  krWeight: number;    // 0-100, 주식 안에서 한국 비중 (나머지는 미국)
  monthlySave: number; // 원
};

export type EtfPick = {
  code: string;
  name: string;
  reason: string;
  fee?: string;
};

export type AllocationBucket = {
  key: 'kr-equity' | 'us-equity' | 'bond' | 'alt';
  label: string;
  value: number;       // %
  color: string;
  description: string;
  etfs: EtfPick[];
};

export type Recommendation = {
  buckets: AllocationBucket[];
  equityPct: number;
  bondPct: number;
  altPct: number;
  expectedReturn: number;       // 연평균 % (대략 추정)
  expectedVolatility: number;   // 연 표준편차 % (대략 추정)
  yearsToRetire: number;
  summary: string;              // 한 줄 설명
  glidePath: { age: number; equity: number }[]; // 60세까지 5년 단위
};

// 카테고리별 추천 ETF (보수 낮은 + 순자산 큰 코어 중심)
const KR_EQUITY: EtfPick[] = [
  { code: '069500', name: 'KODEX 200', reason: '코스피 대표 — 한국 핵심', fee: '연 0.15%' },
  { code: '229200', name: 'KODEX 코스닥150', reason: '코스닥 성장주', fee: '연 0.25%' },
];

const US_EQUITY: EtfPick[] = [
  { code: '360750', name: 'TIGER 미국S&P500', reason: '미국 대형주 — 글로벌 핵심', fee: '연 0.07%' },
  { code: '379810', name: 'KODEX 미국나스닥100TR', reason: '미국 빅테크 성장 (TR)', fee: '연 0.05%' },
];

const BOND: EtfPick[] = [
  { code: '152380', name: 'KODEX 국고채10년', reason: '국채 — 변동성 방어', fee: '연 0.15%' },
  { code: '273130', name: 'KODEX 종합채권(AA-이상)액티브', reason: '신용 + 국채 분산', fee: '연 0.05%' },
];

const ALT: EtfPick[] = [
  { code: '132030', name: 'KODEX 골드선물(H)', reason: '금 — 인플레/위기 헤지', fee: '연 0.68%' },
  { code: '352560', name: 'TIGER 부동산인프라고배당', reason: '리츠 — 분배 + 성장', fee: '연 0.29%' },
];

export function recommendPortfolio(input: RecommendInput): Recommendation {
  const yearsToRetire = Math.max(0, input.retireAge - input.age);

  // 1) 주식 비중 — 110 - age 글라이드
  let equityPct = 110 - input.age;
  if (input.risk === 'aggressive') equityPct += 10;
  if (input.risk === 'conservative') equityPct -= 10;
  // 은퇴 5년 이내면 안전 마진
  if (yearsToRetire <= 5) equityPct = Math.min(equityPct, 50);
  // 클램프
  equityPct = Math.max(25, Math.min(95, equityPct));

  // 2) 대체자산 — 위험성향별 비중 (안정 10% / 중립 8% / 공격 5%)
  const altPct = input.risk === 'conservative' ? 10 : input.risk === 'aggressive' ? 5 : 8;

  // 3) 채권 — 나머지
  const bondPct = Math.max(0, 100 - equityPct - altPct);

  // 4) 주식 안에서 한국 vs 미국
  const krEquity = equityPct * (input.krWeight / 100);
  const usEquity = equityPct - krEquity;

  // 5) 예상 수익률 (단순 가중: 한국 7% / 미국 9% / 채권 4% / 대체 5%)
  const expectedReturn =
    (krEquity * 0.07 + usEquity * 0.09 + bondPct * 0.04 + altPct * 0.05) / 100 * 100;

  // 6) 예상 변동성 (단순 가중: 주식 18% / 채권 5% / 대체 12%)
  const expectedVolatility =
    (equityPct * 0.18 + bondPct * 0.05 + altPct * 0.12) / 100 * 100;

  // 7) 글라이드 패스 — 현재부터 60세까지 5년 단위
  const glidePath: { age: number; equity: number }[] = [];
  for (let a = input.age; a <= 60; a += 5) {
    let eq = 110 - a;
    if (input.risk === 'aggressive') eq += 10;
    if (input.risk === 'conservative') eq -= 10;
    const yrs = Math.max(0, input.retireAge - a);
    if (yrs <= 5) eq = Math.min(eq, 50);
    glidePath.push({ age: a, equity: Math.max(25, Math.min(95, eq)) });
  }

  const buckets: AllocationBucket[] = [
    {
      key: 'kr-equity',
      label: '한국 주식',
      value: krEquity,
      color: '#3182F6',
      description: '국내 대표 지수 + 성장 섹터',
      etfs: KR_EQUITY,
    },
    {
      key: 'us-equity',
      label: '미국 주식',
      value: usEquity,
      color: '#1B64DA',
      description: 'S&P500·나스닥 — 글로벌 코어',
      etfs: US_EQUITY,
    },
    {
      key: 'bond',
      label: '채권',
      value: bondPct,
      color: '#7E57C2',
      description: '국채·우량 회사채 — 변동성 방어',
      etfs: BOND,
    },
    {
      key: 'alt',
      label: '대체 자산',
      value: altPct,
      color: '#FFA927',
      description: '금·리츠 — 분산 + 인플레 헤지',
      etfs: ALT,
    },
  ];

  // 8) 한 줄 요약
  const ageBracket = input.age < 30 ? '20대' : input.age < 40 ? '30대' : input.age < 50 ? '40대' : input.age < 60 ? '50대' : '60대';
  const riskLabel = input.risk === 'aggressive' ? '공격형' : input.risk === 'conservative' ? '안정형' : '중립형';
  const summary = `${ageBracket} ${riskLabel} — 주식 ${equityPct.toFixed(0)}% · 채권 ${bondPct.toFixed(0)}% · 대체 ${altPct.toFixed(0)}% 구성`;

  return {
    buckets,
    equityPct,
    bondPct,
    altPct,
    expectedReturn,
    expectedVolatility,
    yearsToRetire,
    summary,
    glidePath,
  };
}
