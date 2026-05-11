/**
 * 분절 해소: ETF 코드/키워드를 매개로 4페이지(홈/ETF/피드/스파링)를 연결.
 *
 * 데이터에 명시적 ETF 태그가 없으므로 키워드 기반 매칭으로 시작.
 * 각 ETF에서 키워드 사전을 만들고, 임의 텍스트에 키워드가 포함되면 연관으로 판단.
 */

import { etfs, type EtfInfo } from '@/lib/etfs';
import type { Sparring } from '@/lib/sparring';
import type { HanipArticle } from '@/lib/feed';

export type RelatedQuestion = {
  slug: string;
  title: string;
  category?: string;
  ans?: number;
  body?: string;
};

/**
 * ETF에서 매칭 키워드 추출.
 * - code (360750 같은 6자리)
 * - shortName 토큰 (TIGER, S&P500, ETF 등)
 * - tags (S&P500, 미국, ETF, 분할매수 등)
 * - theme 토큰
 */
export function getEtfKeywords(etf: EtfInfo): string[] {
  const tokens = new Set<string>();
  tokens.add(etf.code);
  // shortName/name에서 의미 있는 토큰 추출
  for (const source of [etf.shortName, etf.name, etf.theme]) {
    if (!source) continue;
    // 공백/구분자 기준 토큰화
    for (const t of source.split(/[\s·,\-/()]+/)) {
      const trimmed = t.trim();
      if (trimmed.length >= 2 && !/^(ETF|미국|한국)$/i.test(trimmed)) tokens.add(trimmed);
    }
  }
  for (const tag of etf.tags || []) {
    const trimmed = tag.trim();
    if (trimmed.length >= 2) tokens.add(trimmed);
  }
  return Array.from(tokens);
}

/**
 * 텍스트에 ETF 키워드가 포함되어 있는지 검사.
 * 매칭된 키워드 수가 많을수록 우선.
 */
function scoreEtfForText(etf: EtfInfo, text: string): number {
  const keywords = getEtfKeywords(etf);
  let score = 0;
  for (const kw of keywords) {
    if (!kw) continue;
    // code 매칭은 가중치 ↑
    if (/^\d{6}$/.test(kw)) {
      if (text.includes(kw)) score += 5;
    } else {
      // 대소문자 무시 부분일치
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (re.test(text)) score += 1;
    }
  }
  return score;
}

/**
 * 임의 텍스트(질문, 스파링, 칼럼 등)에서 언급된 ETF 찾기.
 */
export function findEtfsForText(text: string, limit = 3): EtfInfo[] {
  if (!text) return [];
  const scored = etfs
    .map(etf => ({ etf, score: scoreEtfForText(etf, text) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.etf);
}

/**
 * 특정 ETF와 연관된 질문 찾기.
 * sampleQuestions의 title+body+tags에서 ETF 키워드 매칭.
 */
export function findRelatedQuestionsForEtf<Q extends RelatedQuestion & { title: string; body?: string; tags?: string[] }>(
  etf: EtfInfo,
  questions: Q[],
  limit = 3,
): Q[] {
  const scored = questions
    .map(q => {
      const text = [q.title, q.body || '', (q.tags || []).join(' ')].join(' ');
      return { q, score: scoreEtfForText(etf, text) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.q);
}

/**
 * 특정 ETF와 연관된 스파링 찾기.
 */
export function findRelatedSparringsForEtf(etf: EtfInfo, sparrings: Sparring[], limit = 2): Sparring[] {
  const scored = sparrings
    .map(s => {
      const text = [s.title, s.body || '', s.category, s.side_a_label, s.side_b_label].join(' ');
      return { s, score: scoreEtfForText(etf, text) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.s);
}

/**
 * 특정 ETF와 연관된 한입 칼럼 찾기.
 */
export function findRelatedArticlesForEtf(etf: EtfInfo, articles: HanipArticle[], limit = 3): HanipArticle[] {
  const scored = articles
    .map(a => {
      const text = [a.title, a.description, (a.tags || []).join(' '), a.category].join(' ');
      return { a, score: scoreEtfForText(etf, text) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(x => x.a);
}
