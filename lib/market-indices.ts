/**
 * 실시간 시장 지수 (Yahoo Finance API)
 * 서버에서 호출 후 60초 ISR 캐시. 실패 시 마지막 fallback 데이터.
 */

export type MarketIndex = {
  name: string;
  val: string;
  chg: string;
  up: boolean;
  /** 당일 5분 간격 가격 series (sparkline용). 없으면 빈 배열. */
  series: number[];
};

const SYMBOLS = [
  { name: '코스피', symbol: '^KS11', decimals: 2 },
  { name: 'S&P500', symbol: '^GSPC', decimals: 2 },
  { name: '나스닥', symbol: '^IXIC', decimals: 2 },
  { name: '원달러', symbol: 'KRW=X', decimals: 1 },
];

const FALLBACK: MarketIndex[] = [
  { name: '코스피', val: '—', chg: '—', up: true, series: [] },
  { name: 'S&P500', val: '—', chg: '—', up: true, series: [] },
  { name: '나스닥', val: '—', chg: '—', up: true, series: [] },
  { name: '원달러', val: '—', chg: '—', up: true, series: [] },
];

function fmtNum(n: number, decimals: number): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

async function fetchOne(symbol: string, decimals: number): Promise<{ val: string; chg: string; up: boolean; series: number[] } | null> {
  try {
    // interval=5m + range=1d → sparkline용 ~78개 데이터 포인트 + 메타
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const price = meta?.regularMarketPrice;
    const prev = meta?.chartPreviousClose ?? meta?.previousClose;
    if (typeof price !== 'number' || typeof prev !== 'number') return null;
    const closes: any[] = result.indicators?.quote?.[0]?.close ?? [];
    const series = closes.filter((v: any): v is number => typeof v === 'number');
    const diff = price - prev;
    const pct = (diff / prev) * 100;
    return {
      val: fmtNum(price, decimals),
      chg: `${diff >= 0 ? '+' : ''}${pct.toFixed(2)}%`,
      up: diff >= 0,
      series,
    };
  } catch {
    return null;
  }
}

import { unstable_cache } from 'next/cache';

async function fetchMarketIndicesInner(): Promise<MarketIndex[]> {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async s => {
        const data = await fetchOne(s.symbol, s.decimals);
        if (!data) return { name: s.name, val: '—', chg: '—', up: true, series: [] };
        return { name: s.name, val: data.val, chg: data.chg, up: data.up, series: data.series };
      }),
    );
    return results;
  } catch {
    return FALLBACK;
  }
}

// 60초 캐시 — Yahoo Finance 외부 호출 비용 감소
export const fetchMarketIndices = unstable_cache(
  fetchMarketIndicesInner,
  ['market-indices-v1'],
  { revalidate: 60, tags: ['market-indices'] },
);
