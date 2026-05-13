/**
 * ETF 분배금 히스토리 (seeded mock).
 *
 * 실제 KRX API 등록 후 fetchDistributionHistory(code) 로 교체 예정.
 * 지금은 ETF의 (분배 주기 + AUM + 보수) 기반으로 결정적 가짜 데이터를 만든다.
 *
 * 핵심: 같은 ETF는 항상 같은 결과 (페이지 새로고침해도 안 변함).
 */

import type { EtfInfo } from '@/lib/etfs';

export type DistributionPoint = {
  label: string;     // '25Q1', '4월' 등
  value: number;     // 1주당 원
  date: string;      // YYYY-MM-DD
};

export type DistributionHistory = {
  period: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'none';
  points: DistributionPoint[];
  perShareSum: number;       // 표시 구간 총 분배금 (1주당)
  yieldPercent: number;      // 연환산 분배수익률 (대략)
};

/** 결정적 PRNG */
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCode(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parsePrice(price: string): number {
  const m = price.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function detectPeriod(distribution: string): DistributionHistory['period'] {
  const d = distribution || '';
  if (/없|미실시|TR/i.test(d)) return 'none';
  if (/월/.test(d)) return 'monthly';
  if (/분기/.test(d)) return 'quarterly';
  if (/반기/.test(d)) return 'semiannual';
  if (/연/.test(d)) return 'annual';
  return 'quarterly';
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * ETF 정보를 받아 결정적 분배금 히스토리를 만든다.
 * - 표시 길이: monthly=12, quarterly=8, semi=6, annual=5
 * - 1주당 분배금 베이스 = 현재가 × 연수익률 / 회차
 */
export function buildDistributionHistory(etf: EtfInfo): DistributionHistory {
  const period = detectPeriod(etf.distribution);
  if (period === 'none') {
    return { period, points: [], perShareSum: 0, yieldPercent: 0 };
  }

  const price = parsePrice(etf.price) || 10_000;
  const rng = mulberry32(hashCode(etf.code));

  // 카테고리/태그로 연 분배수익률 대략 추정
  const probe = `${etf.name} ${etf.theme} ${etf.tags.join(' ')}`;
  let annualYield = 0.02; // 기본 2%
  if (/리츠|REIT|배당|커버드콜|월배당/i.test(probe)) annualYield = 0.06;
  else if (/채권|국고채|회사채/i.test(probe)) annualYield = 0.035;
  else if (/S&P500|나스닥|미국|코스피200|코스닥150/i.test(probe)) annualYield = 0.015;
  // ±0.4% 결정적 변동
  annualYield += (rng() - 0.5) * 0.008;

  const config = {
    monthly:     { count: 12, perYear: 12, labelFmt: (d: Date) => `${d.getMonth() + 1}월` },
    quarterly:   { count: 8,  perYear: 4,  labelFmt: (d: Date) => `${String(d.getFullYear()).slice(2)}Q${Math.floor(d.getMonth() / 3) + 1}` },
    semiannual:  { count: 6,  perYear: 2,  labelFmt: (d: Date) => `${String(d.getFullYear()).slice(2)}H${d.getMonth() < 6 ? 1 : 2}` },
    annual:      { count: 5,  perYear: 1,  labelFmt: (d: Date) => `${d.getFullYear()}` },
  }[period];

  const perPeriodBase = (price * annualYield) / config.perYear;

  // 오늘 기준으로 과거 N회차 (역순 생성 후 뒤집기)
  // 한 회차당 개월 수
  const monthsPerStep = 12 / config.perYear;
  const now = new Date('2026-05-01'); // 결정적 기준일 (SSR/CSR mismatch 방지)

  const points: DistributionPoint[] = [];
  for (let i = config.count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i * monthsPerStep);
    // ±18% 결정적 변동
    const wobble = 1 + (rng() - 0.5) * 0.36;
    const value = Math.round(perPeriodBase * wobble);
    points.push({
      label: config.labelFmt(d),
      value,
      date: ymd(d),
    });
  }

  const perShareSum = points.reduce((a, b) => a + b.value, 0);
  // 연환산 수익률 (표시 구간 평균 × perYear / 현재가)
  const avgPer = perShareSum / points.length;
  const yieldPercent = ((avgPer * config.perYear) / price) * 100;

  return { period, points, perShareSum, yieldPercent };
}
