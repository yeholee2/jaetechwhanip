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
  diffSummary: string[];
  /** 자산 갭 — 비교 시각화용 */
  assetGap: {
    /** 내가 갖고 있고 템플릿에도 있는 종목 (코드 매칭) */
    overlap: { code: string; name: string; myWeight: number; tplWeight: number }[];
    /** 내가 갖고 있는데 템플릿엔 없음 */
    onlyMine: { code: string; name: string; myWeight: number }[];
    /** 템플릿엔 있는데 내가 안 갖고 있음 — 추천 후보 */
    onlyTpl: { code: string; name: string; tplWeight: number }[];
  };
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

  // 자산 갭 계산 — 미국 티커 기준 + 국내 대체 코드도 같이 비교
  const myCodes = new Map<string, { name: string; weight: number }>();
  for (const m of myWeighted) {
    myCodes.set(m.etf.code, { name: m.etf.shortName, weight: m.weight });
  }
  const tplCodes = new Map<string, { name: string; weight: number }>();
  for (const a of template.allocations) {
    // 미국 티커 + 국내 대체 두 코드 모두 매칭 시도
    const codes: string[] = [a.ticker];
    if (a.krAlternative) codes.push(a.krAlternative.code);
    for (const c of codes) {
      const existing = tplCodes.get(c);
      tplCodes.set(c, {
        name: a.label,
        weight: a.weight + (existing?.weight || 0),
      });
    }
  }

  const overlap: SideBySide['assetGap']['overlap'] = [];
  const onlyMine: SideBySide['assetGap']['onlyMine'] = [];
  const onlyTpl: SideBySide['assetGap']['onlyTpl'] = [];

  const matchedTplCodes = new Set<string>();
  for (const [code, my] of myCodes) {
    if (tplCodes.has(code)) {
      const tplEntry = tplCodes.get(code)!;
      overlap.push({ code, name: my.name, myWeight: my.weight, tplWeight: tplEntry.weight });
      matchedTplCodes.add(code);
    } else {
      onlyMine.push({ code, name: my.name, myWeight: my.weight });
    }
  }
  for (const [code, tpl] of tplCodes) {
    if (!matchedTplCodes.has(code)) {
      // 같은 자산이 미국·국내 둘 다 매핑된 경우 한 번만 표시 — 가중 더 큰 쪽 우선
      const dupe = onlyTpl.find(o => o.name === tpl.name);
      if (!dupe) onlyTpl.push({ code, name: tpl.name, tplWeight: tpl.weight });
    }
  }
  overlap.sort((a, b) => b.tplWeight - a.tplWeight);
  onlyMine.sort((a, b) => b.myWeight - a.myWeight);
  onlyTpl.sort((a, b) => b.tplWeight - a.tplWeight);

  return {
    myInsight,
    templateInsight,
    diffSummary: diff,
    assetGap: { overlap, onlyMine, onlyTpl },
  };
}
