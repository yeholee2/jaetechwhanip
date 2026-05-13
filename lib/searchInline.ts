/**
 * 검색 popup 인라인 (instant) 결과 빌더 — 클라이언트에서 빠르게.
 * 서버 round-trip 없이 etfs / sampleQuestions 시드로 즉시 매칭.
 *
 * Phase F: 추후 /api/search/instant 로 옮겨 Supabase fulltext 쓸 수 있음.
 */

import { etfs, type EtfInfo } from '@/lib/etfs';
import { sampleQuestions } from '@/lib/sampleData';

export type InlineSearchHit =
  | { kind: 'etf'; etf: EtfInfo }
  | { kind: 'question'; slug: string; title: string; category: string };

export function searchInline(query: string, limit = 6): InlineSearchHit[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, '');
  if (!q) return [];

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');

  // ETF 매칭 (이름·코드·운용사·테마·태그)
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

  // 질문 매칭
  const qHits: InlineSearchHit[] = sampleQuestions
    .filter(qn =>
      norm(qn.title).includes(q) ||
      norm(qn.body || '').includes(q) ||
      (qn.tags || []).some((t: string) => norm(t).includes(q)),
    )
    .slice(0, 3)
    .map(qn => ({
      kind: 'question' as const,
      slug: qn.slug,
      title: qn.title,
      category: qn.cat,
    }));

  return [...etfHits, ...qHits].slice(0, limit);
}
