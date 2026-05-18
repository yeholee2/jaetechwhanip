/**
 * ETF 유사 추천 + 운용사 정보.
 *
 * 점수 기반 유사 ETF:
 *   같은 추종 국가 + 3
 *   같은 카테고리 + 2
 *   같은 테마 + 2
 *   같은 운용사 + 1
 *   같은 추종 지수 + 4 (가장 강한 시그널 — 사실상 거의 동일 ETF)
 */

import type { EtfInfo } from '@/lib/etfs';

export type SimilarResult = {
  etf: EtfInfo;
  score: number;
  reasons: string[];
};

export type IssuerSummary = {
  name: string;
  totalCount: number;
  topEtfs: EtfInfo[];        // AUM 큰 순 (없으면 이름순) 5개
  categories: { label: string; count: number }[];
};

function aumNumeric(aum?: string): number {
  if (!aum) return 0;
  const t = aum.replace(/,/g, '');
  let total = 0;
  const tri = t.match(/(\d+(?:\.\d+)?)\s*조/);
  if (tri) total += parseFloat(tri[1]) * 1e12;
  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) total += parseFloat(eok[1]) * 1e8;
  return total;
}

/** 유사 ETF 점수 매기기 + 상위 N */
export function findSimilarEtfs(target: EtfInfo, pool: EtfInfo[], limit = 6): SimilarResult[] {
  const tUC = (target.underlyingCountry || 'KR').toUpperCase();
  const tCat = target.category || '';
  const tTheme = target.theme || '';
  const tIssuer = target.issuer || '';
  const tIndex = (target.trackingIndex || '').trim();

  // 레버리지/인버스 ETF는 유사 추천에서 제외 (단, target 자체가 레버리지면 포함)
  const targetIsLeverage = /레버리지|인버스|곱버스/i.test(target.name);
  const isLeverage = (e: EtfInfo) => /레버리지|인버스|곱버스/i.test(e.name);

  const results: SimilarResult[] = [];
  for (const e of pool) {
    if (e.code === target.code || e.slug === target.slug || e.name === target.name) continue;
    if (!targetIsLeverage && isLeverage(e)) continue;
    let score = 0;
    const reasons: string[] = [];

    // 같은 추종 지수 — 가장 강한 시그널
    if (tIndex && e.trackingIndex && e.trackingIndex.trim() === tIndex) {
      score += 4;
      reasons.push('같은 추종 지수');
    }
    // 같은 추종 국가 — 양쪽 다 명시된 경우에만 점수
    if (target.underlyingCountry && e.underlyingCountry &&
        e.underlyingCountry.toUpperCase() === tUC) {
      score += 3;
      reasons.push(`같은 추종 국가`);
    }
    // 같은 카테고리
    if (tCat && e.category === tCat) {
      score += 2;
      reasons.push('같은 카테고리');
    }
    // 같은 테마
    if (tTheme && e.theme === tTheme) {
      score += 2;
      reasons.push('같은 테마');
    }
    // 같은 운용사
    if (tIssuer && tIssuer !== '기타' && e.issuer === tIssuer) {
      score += 1;
      reasons.push('같은 운용사');
    }
    // 같은 상장 시장 (KRX vs US) — 0.5 (호환성 시그널)
    const targetCountry = (target.country || 'KR').toUpperCase();
    const eCountry = (e.country || 'KR').toUpperCase();
    if (targetCountry === eCountry) {
      score += 0.5;
    }

    if (score >= 3) {
      results.push({ etf: e, score, reasons: reasons.slice(0, 2) });
    }
  }

  // 점수 내림차순 + AUM 큰 순
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return aumNumeric(b.etf.aum) - aumNumeric(a.etf.aum);
  });

  return results.slice(0, limit);
}

/** 같은 운용사 정보 요약 */
export function buildIssuerSummary(target: EtfInfo, pool: EtfInfo[]): IssuerSummary | null {
  const issuer = target.issuer;
  if (!issuer || issuer === '기타' || issuer === '운용사') return null;

  const sameIssuer = pool.filter(e => e.issuer === issuer && e.code !== target.code);
  if (sameIssuer.length === 0) return null;

  // 카테고리 분포
  const catMap = new Map<string, number>();
  for (const e of sameIssuer) {
    const c = e.category || '기타';
    catMap.set(c, (catMap.get(c) || 0) + 1);
  }
  const categories = Array.from(catMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // TOP — AUM 큰 순으로 5개
  const topEtfs = [...sameIssuer]
    .sort((a, b) => aumNumeric(b.aum) - aumNumeric(a.aum))
    .slice(0, 5);

  return {
    name: issuer,
    totalCount: sameIssuer.length + 1, // 자기 자신 포함
    topEtfs,
    categories,
  };
}
