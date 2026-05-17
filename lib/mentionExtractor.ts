/**
 * 글 본문 → 종목/ETF 멘션 자동 추출.
 *
 * 소스:
 *  1. chart_node   : TipTap 의 <div data-chart="AAPL"> 등 (가장 강한 시그널)
 *  2. ticker       : 본문 텍스트의 $AAPL, $005930 패턴
 *  3. stock_name   : 한국어 종목명 사전 매칭 (삼성전자 → 005930)
 *  4. etf_code     : 본문 텍스트의 6자리 코드 단독 등장 (069500 등)
 *
 * weight = 본문 등장 횟수 (랭킹 + 본인 글 표시 우선순위).
 */

import { findStocksByName, KR_ETF_DICT, KR_STOCK_DICT } from '@/lib/stockDictionary';

export type Mention = {
  symbol: string;
  kind: 'stock' | 'etf';
  source: 'chart_node' | 'ticker' | 'stock_name' | 'etf_code';
  weight: number;
};

function normalize(s: string) { return s.toUpperCase().replace(/[.\-_\s]/g, ''); }

const KR_STOCK_CODES = new Set([
  ...KR_STOCK_DICT.map(s => s.code),
]);
const KR_ETF_CODES = new Set([
  ...KR_ETF_DICT.map(e => e.code),
]);

/** HTML 에서 ChartNode 의 data-chart 추출 */
function extractChartNodes(html: string): string[] {
  const out: string[] = [];
  const re = /<div\b[^>]*\bdata-chart="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

/** HTML 에서 텍스트만 (간단 strip) */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

/**
 * 본문에서 모든 멘션 추출.
 */
export function extractMentions(body: string): Mention[] {
  const counts = new Map<string, Mention>();
  const add = (symbol: string, kind: 'stock' | 'etf', source: Mention['source'], inc = 1) => {
    if (!symbol) return;
    const cur = counts.get(symbol);
    if (cur) {
      cur.weight += inc;
      // 더 강한 시그널로 source 업그레이드
      const prio: Record<string, number> = { etf_code: 1, ticker: 2, stock_name: 3, chart_node: 4 };
      if (prio[source] > prio[cur.source]) cur.source = source;
    } else {
      counts.set(symbol, { symbol, kind, source, weight: inc });
    }
  };

  const isHtml = /<[a-z]/i.test(body);
  const text = isHtml ? htmlToText(body) : body;

  // 1) ChartNode (가장 강한 시그널)
  if (isHtml) {
    for (const raw of extractChartNodes(body)) {
      const norm = normalize(raw);
      const isKr = /^[0-9]{6}$/.test(norm);
      const kind: 'stock' | 'etf' = KR_ETF_CODES.has(norm) ? 'etf' : (isKr ? 'stock' : 'stock');
      add(norm, kind, 'chart_node');
    }
  }

  // 2) $TICKER (미국 종목 컨벤션)
  const tickerRe = /\$([A-Za-z]{1,5}(?:\.[A-Z])?)\b/g;
  let m: RegExpExecArray | null;
  while ((m = tickerRe.exec(text)) !== null) {
    add(normalize(m[1]), 'stock', 'ticker');
  }
  // $005930 (한국 컨벤션 일부)
  const krTickerRe = /\$([0-9]{6})\b/g;
  while ((m = krTickerRe.exec(text)) !== null) {
    const code = m[1];
    const kind = KR_ETF_CODES.has(code) ? 'etf' : 'stock';
    add(code, kind, 'ticker');
  }

  // 3) 한국어 종목명 사전
  for (const hit of findStocksByName(text)) {
    add(hit.code, hit.kind, 'stock_name', hit.count);
  }

  // 4) 단독 6자리 코드 (069500 처럼 단독 등장)
  // 다른 숫자 시퀀스(가격, 수익률, 연도 등)와 혼동 피하려고 단어 경계 + ETF 사전에 있는 것만
  const codeRe = /(?<![\d.])([0-9]{6})(?![\d.])/g;
  while ((m = codeRe.exec(text)) !== null) {
    const code = m[1];
    if (KR_ETF_CODES.has(code)) add(code, 'etf', 'etf_code');
    // stock 코드는 너무 false positive 많아서 (가격 같은 6자리 숫자) 사전 매칭만
  }

  // 최대 20개 (이상 등장 시)
  return Array.from(counts.values())
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20);
}
