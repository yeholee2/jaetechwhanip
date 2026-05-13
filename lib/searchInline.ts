/**
 * 검색 popup 인라인 (instant) 결과 빌더.
 *
 * 4 카테고리 통합:
 *  - ETF (이름·코드·운용사·테마)
 *  - 질문 (Q&A 제목·본문·태그)
 *  - 대가 포트폴리오 템플릿 (이름·작가·tagline)
 *  - 대가 펀드 (실시간 13F — 매니저·펀드명)
 */

import { etfs, type EtfInfo } from '@/lib/etfs';
import { sampleQuestions } from '@/lib/sampleData';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { WHALE_PORTFOLIOS } from '@/lib/portfolioWhales';

export type InlineSearchHit =
  | { kind: 'etf'; etf: EtfInfo }
  | { kind: 'question'; slug: string; title: string; category: string }
  | { kind: 'template'; slug: string; name: string; author: string; tagline: string }
  | { kind: 'whale'; slug: string; manager: string; fund: string };

export function searchInline(query: string, limit = 8): InlineSearchHit[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return [];

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

  const etfHits: InlineSearchHit[] = etfs
    .filter(e =>
      norm(e.name).includes(q) ||
      norm(e.shortName).includes(q) ||
      e.code.includes(q) ||
      norm(e.issuer).includes(q) ||
      norm(e.theme || '').includes(q) ||
      (e.tags || []).some(t => norm(t).includes(q)),
    )
    .slice(0, 4)
    .map(etf => ({ kind: 'etf' as const, etf }));

  const qHits: InlineSearchHit[] = sampleQuestions
    .filter(qn =>
      norm(qn.title).includes(q) ||
      norm(qn.body || '').includes(q) ||
      (qn.tags || []).some((t: string) => norm(t).includes(q)),
    )
    .slice(0, 2)
    .map(qn => ({
      kind: 'question' as const,
      slug: qn.slug,
      title: qn.title,
      category: qn.cat,
    }));

  const tplHits: InlineSearchHit[] = PORTFOLIO_TEMPLATES
    .filter(t =>
      norm(t.name).includes(q) ||
      norm(t.author).includes(q) ||
      norm(t.tagline).includes(q),
    )
    .slice(0, 2)
    .map(t => ({
      kind: 'template' as const,
      slug: t.slug,
      name: t.name,
      author: t.author,
      tagline: t.tagline,
    }));

  const whHits: InlineSearchHit[] = WHALE_PORTFOLIOS
    .filter(w =>
      norm(w.manager).includes(q) ||
      norm(w.name).includes(q),
    )
    .slice(0, 2)
    .map(w => ({
      kind: 'whale' as const,
      slug: w.slug,
      manager: w.manager,
      fund: w.name,
    }));

  return [...etfHits, ...tplHits, ...whHits, ...qHits].slice(0, limit);
}
