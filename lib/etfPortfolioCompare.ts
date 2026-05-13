/**
 * 내 포트폴리오 vs 대가 포트폴리오 — 항목별 비교 계산.
 *
 * 비교 차원:
 * - 위험 등급 (가중평균)
 * - 환노출 비중
 * - 섹터 집중도 (HHI)
 * - 운용사 분산
 * - 가중평균 보수
 */

import type { EtfInfo } from '@/lib/etfs';
import type { PortfolioTemplate, TemplateAllocation } from '@/lib/portfolioTemplates';
import { buildPortfolioInsight, type WeightedHolding, type PortfolioInsight } from '@/lib/etfPortfolioInsights';

export type SideBySide = {
  myInsight: PortfolioInsight | null;
  templateInsight: PortfolioInsight | null;
  /** 코어 차이점 — 이건 매니저보다 좋은/나쁜 면을 가리는 짧은 평가 */
  diffSummary: string[];
};

/**
 * 템플릿(allocations)을 EtfInfo 처럼 변환한 후 buildPortfolioInsight 호출.
 * 단 EtfInfo 가 일부 필드(category·theme·underlyingCountry·issuer)를 요구.
 * 대가 템플릿은 미국 상장 ETF + role 정보만 있어 dummy 채워서 보내는 게 가장 쉬움.
 */
function templateToWeighted(
  template: PortfolioTemplate,
  resolveTickerToEtf: (ticker: string) => EtfInfo | undefined,
): WeightedHolding[] {
  return template.allocations
    .map((a: TemplateAllocation): WeightedHolding | null => {
      const etf = resolveTickerToEtf(a.ticker);
      if (!etf) return null;
      return { etf, weight: a.weight };
    })
    .filter((x): x is WeightedHolding => !!x);
}

export function buildComparison(
  myWeighted: WeightedHolding[],
  template: PortfolioTemplate,
  pool: EtfInfo[],
): SideBySide {
  const myInsight = buildPortfolioInsight(myWeighted);

  const findEtf = (ticker: string) => pool.find(p => p.code === ticker);
  const tplWeighted = templateToWeighted(template, findEtf);
  const templateInsight = buildPortfolioInsight(tplWeighted);

  const diff: string[] = [];

  if (myInsight && templateInsight) {
    const riskDelta = myInsight.weightedRisk - templateInsight.weightedRisk;
    if (Math.abs(riskDelta) > 0.5) {
      diff.push(
        riskDelta > 0
          ? `내 포트가 ${template.name}보다 위험 ${riskDelta.toFixed(1)}단계 더 높음`
          : `내 포트가 ${template.name}보다 위험 ${Math.abs(riskDelta).toFixed(1)}단계 더 낮음`,
      );
    }
    const fxDelta = myInsight.fxExposure - templateInsight.fxExposure;
    if (Math.abs(fxDelta) > 0.15) {
      diff.push(
        fxDelta > 0
          ? `환노출 +${Math.round(fxDelta * 100)}%p 더 높음 (달러 영향 큼)`
          : `환노출 ${Math.round(fxDelta * 100)}%p 더 낮음 (원화 비중 큼)`,
      );
    }
    const feeDelta = myInsight.weightedFee - templateInsight.weightedFee;
    if (Math.abs(feeDelta) > 0.1) {
      diff.push(
        feeDelta > 0
          ? `가중평균 보수 +${feeDelta.toFixed(2)}%p 더 비쌈`
          : `가중평균 보수 ${feeDelta.toFixed(2)}%p 더 저렴`,
      );
    }
    const concDelta = myInsight.sectorConcentration - templateInsight.sectorConcentration;
    if (Math.abs(concDelta) > 0.15) {
      diff.push(
        concDelta > 0
          ? `섹터 집중도가 더 높음 (한 섹터 비중 큼)`
          : `섹터가 더 잘 분산됨`,
      );
    }
  }

  if (diff.length === 0) {
    diff.push(`${template.name}과 매우 유사한 성격이에요.`);
  }

  return { myInsight, templateInsight, diffSummary: diff };
}
