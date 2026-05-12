/**
 * 포트폴리오 진단 인사이트 (rule-based).
 *
 * 가중평균 보수, 위험 등급, 환노출, 섹터 중복도, 한줄평을 계산.
 * 모든 항목은 비중 기준 — 종목 수가 아니라 자산 규모.
 */

import type { EtfInfo } from '@/lib/etfs';
import { buildEtfRisk } from '@/lib/etfRisk';
import { buildSectorBreakdown } from '@/lib/etfBreakdown';

export type WeightedHolding = {
  etf: EtfInfo;
  weight: number; // 0~1
};

export type PortfolioInsight = {
  weightedFee: number;              // 가중평균 총보수 (%)
  weightedRisk: number;             // 가중평균 위험 (1~5, 소수)
  riskLabel: string;                // '낮음' / '보통' / '높음' 등
  riskTone: 'good' | 'neutral' | 'warn';
  fxExposure: number;               // 환 노출 비중 0~1
  fxExposureLabel: string;          // '낮음' / '중간' / '높음'
  fxTone: 'good' | 'neutral' | 'warn';
  topSector: { label: string; weight: number } | null;
  sectorConcentration: number;      // HHI 0~1 (1 = 한 섹터에 집중)
  concentrationLabel: string;
  concentrationTone: 'good' | 'neutral' | 'warn';
  issuerCount: number;
  oneLiner: string;                 // 한줄평
  warnings: string[];               // 주의 포인트
  highlights: string[];             // 잘된 포인트
};

function parseFeePercent(fee: string): number {
  const m = (fee || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function isFxExposed(etf: EtfInfo): boolean {
  const h = etf.hedge || '';
  // 명시적 헤지 표시가 있으면 환노출 X
  if (/헤지\(H\)|환헤지|H\)/i.test(h) && !/언헤지|미.*헤지/i.test(h)) return false;
  // 원화 자산
  if (/원화|국내|코스피|코스닥|KRW/i.test(h)) return false;
  // 카테고리·이름에 해외 키워드면 환노출
  const probe = `${etf.name} ${etf.category} ${etf.theme}`;
  if (/미국|S&P500|나스닥|일본|중국|유럽|글로벌|신흥|해외|USD|달러/i.test(probe)) return true;
  // 명시적 언헤지
  if (/언헤지|미.*헤지|no hedge/i.test(h)) return true;
  return false;
}

export function buildPortfolioInsight(holdings: WeightedHolding[]): PortfolioInsight | null {
  if (holdings.length === 0) return null;

  // 1) 가중평균 보수
  let weightedFee = 0;
  let weightedRisk = 0;
  let fxExposure = 0;

  // 2) 섹터 가중합 — 각 ETF의 sectorBreakdown × weight
  const sectorMap = new Map<string, number>();
  // 3) 운용사 unique
  const issuers = new Set<string>();

  holdings.forEach(({ etf, weight }) => {
    weightedFee += parseFeePercent(etf.fee) * weight;

    const risk = buildEtfRisk(etf);
    weightedRisk += risk.level * weight;

    if (isFxExposed(etf)) {
      fxExposure += weight;
    }

    const sectors = buildSectorBreakdown(etf.holdings);
    sectors.forEach(seg => {
      const cur = sectorMap.get(seg.label) || 0;
      sectorMap.set(seg.label, cur + (seg.value / 100) * weight);
    });

    issuers.add(etf.issuer || '기타');
  });

  // 섹터 정규화 (보유 ETF 비중 합이 1이 안 될 수도 있어 normalize)
  const sectorTotal = Array.from(sectorMap.values()).reduce((a, b) => a + b, 0);
  const sectors = Array.from(sectorMap.entries())
    .map(([label, raw]) => ({
      label,
      weight: sectorTotal > 0 ? raw / sectorTotal : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  const topSector = sectors[0] || null;

  // HHI (Herfindahl-Hirschman Index) 정규화
  // 1 종목 집중 = 1.0, 균등 분산일수록 0에 가까움
  const hhi = sectors.reduce((s, x) => s + x.weight * x.weight, 0);

  // 라벨링
  const riskLabel =
    weightedRisk < 1.7 ? '낮음' :
    weightedRisk < 2.4 ? '다소 낮음' :
    weightedRisk < 3.2 ? '보통' :
    weightedRisk < 4.0 ? '다소 높음' : '높음';
  const riskTone: 'good' | 'neutral' | 'warn' =
    weightedRisk < 2.4 ? 'good' : weightedRisk < 3.5 ? 'neutral' : 'warn';

  const fxExposureLabel =
    fxExposure < 0.2 ? '낮음' :
    fxExposure < 0.6 ? '중간' : '높음';
  const fxTone: 'good' | 'neutral' | 'warn' =
    fxExposure < 0.2 ? 'good' : fxExposure < 0.7 ? 'neutral' : 'warn';

  const concentrationLabel =
    hhi < 0.25 ? '잘 분산' :
    hhi < 0.45 ? '보통 분산' :
    hhi < 0.65 ? '편중' : '심하게 편중';
  const concentrationTone: 'good' | 'neutral' | 'warn' =
    hhi < 0.25 ? 'good' : hhi < 0.5 ? 'neutral' : 'warn';

  // 한줄평 + 강조점 / 경고
  const highlights: string[] = [];
  const warnings: string[] = [];

  if (weightedFee > 0 && weightedFee <= 0.25) {
    highlights.push(`가중평균 총보수 ${weightedFee.toFixed(2)}% — 장기 보유 비용이 가벼워요.`);
  } else if (weightedFee > 0.6) {
    warnings.push(`가중평균 총보수 ${weightedFee.toFixed(2)}% — 장기 누적 비용 부담이 큰 편이에요.`);
  }

  if (hhi >= 0.5 && topSector) {
    warnings.push(`${topSector.label} 섹터에 ${(topSector.weight * 100).toFixed(0)}% 쏠려 있어요. 다른 섹터로 분산 고려.`);
  } else if (hhi < 0.25) {
    highlights.push('섹터가 잘 분산돼 있어요.');
  }

  if (fxExposure >= 0.7) {
    warnings.push(`환 노출이 ${(fxExposure * 100).toFixed(0)}%로 높아요. 달러 약세에 손익이 크게 흔들릴 수 있어요.`);
  } else if (fxExposure < 0.2 && holdings.length > 1) {
    highlights.push('환 위험이 거의 없어요 (원화 자산 중심).');
  }

  if (issuers.size === 1) {
    warnings.push(`운용사가 1곳에 집중돼 있어요. 운용사 분산도 함께 보세요.`);
  } else if (issuers.size >= 3) {
    highlights.push(`운용사 ${issuers.size}곳에 분산됐어요.`);
  }

  if (weightedRisk >= 4) {
    warnings.push('전체 위험도가 높아요. 단기 변동성에 대비하세요.');
  } else if (weightedRisk <= 2) {
    highlights.push('전체 위험도가 낮은 편이에요.');
  }

  // 한줄평 우선순위
  let oneLiner: string;
  if (warnings.length === 0 && highlights.length >= 2) {
    oneLiner = '균형 잡힌 코어 포트폴리오예요. 지금 페이스 유지!';
  } else if (warnings.length >= 2) {
    oneLiner = '몇 가지 불균형 신호가 보여요. 아래 주의 포인트를 확인해보세요.';
  } else if (fxExposure >= 0.7) {
    oneLiner = '해외 자산 비중이 높아요 — 환율 영향이 큰 포트폴리오예요.';
  } else if (hhi >= 0.5 && topSector) {
    oneLiner = `${topSector.label} 비중이 압도적이에요. 한 섹터 사이클에 손익이 크게 좌우돼요.`;
  } else if (weightedFee <= 0.2) {
    oneLiner = '저비용 패시브 위주로 잘 짜여진 포트폴리오예요.';
  } else {
    oneLiner = '평이한 구성이에요. 아래 항목별 진단을 확인해보세요.';
  }

  return {
    weightedFee,
    weightedRisk,
    riskLabel,
    riskTone,
    fxExposure,
    fxExposureLabel,
    fxTone,
    topSector,
    sectorConcentration: hhi,
    concentrationLabel,
    concentrationTone,
    issuerCount: issuers.size,
    oneLiner,
    warnings: warnings.slice(0, 4),
    highlights: highlights.slice(0, 4),
  };
}
