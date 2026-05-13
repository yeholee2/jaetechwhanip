/**
 * ETF 코드 → 이 ETF를 포함한 대가 템플릿 목록.
 * 미국 티커 + 국내 대체 코드 둘 다 검색.
 */
import { PORTFOLIO_TEMPLATES, type PortfolioTemplate } from './portfolioTemplates';

export type TemplateMention = {
  template: PortfolioTemplate;
  weight: number;
  role: string;
  /** 매칭이 미국 티커 직접 매칭이면 'us', 국내 대체 매칭이면 'kr' */
  via: 'us' | 'kr';
};

export function findTemplatesByEtfCode(code: string): TemplateMention[] {
  const out: TemplateMention[] = [];
  for (const t of PORTFOLIO_TEMPLATES) {
    for (const a of t.allocations) {
      if (a.ticker === code) {
        out.push({ template: t, weight: a.weight, role: a.role, via: 'us' });
        break;
      }
      if (a.krAlternative?.code === code) {
        out.push({ template: t, weight: a.weight, role: a.role, via: 'kr' });
        break;
      }
    }
  }
  // 비중 큰 순
  out.sort((a, b) => b.weight - a.weight);
  return out;
}
