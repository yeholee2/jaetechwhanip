/**
 * 간단 백테스트 — Yahoo Finance 일별 종가로 비중 합산 수익률 계산.
 *
 * 사용:
 *   const result = await backtestTemplate(template, '1y');
 *   → { dates: [...], cumulative: [...], totalReturn, maxDrawdown, ... }
 */

import type { PortfolioTemplate } from './portfolioTemplates';

export type BacktestRange = '1y' | '5y' | '10y';

export type BacktestPoint = {
  date: string;       // YYYY-MM-DD
  cumulative: number; // 1.0 = 원금, 1.23 = +23%
};

export type BacktestResult = {
  points: BacktestPoint[];
  totalReturn: number;     // 0.23 = +23%
  annualizedReturn: number;
  maxDrawdown: number;     // -0.18 = -18%
  volatility: number;      // 연환산 표준편차
  /** 비교: S&P500 (VOO) */
  vsBenchmark?: { totalReturn: number; outperformance: number };
};

const RANGE_DAYS: Record<BacktestRange, number> = {
  '1y': 365,
  '5y': 1825,
  '10y': 3650,
};

async function fetchPriceHistory(ticker: string, range: BacktestRange): Promise<{ date: string; close: number }[]> {
  const yRange = range === '1y' ? '1y' : range === '5y' ? '5y' : '10y';
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=${yRange}`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 86400 }, // 1 day cache
    });
    if (!r.ok) return [];
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return [];
    const ts: number[] = result.timestamp || [];
    const close: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const out: { date: string; close: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = close[i];
      if (c == null || !Number.isFinite(c)) continue;
      const d = new Date(ts[i] * 1000);
      out.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        close: c,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function alignSeries(seriesList: { date: string; close: number }[][]): { dates: string[]; matrices: number[][] } {
  // 공통 날짜만 추림 (가장 짧은 시리즈 기준)
  if (seriesList.length === 0) return { dates: [], matrices: [] };
  // 각 시리즈를 date→close 맵으로
  const maps = seriesList.map(s => {
    const m = new Map<string, number>();
    for (const p of s) m.set(p.date, p.close);
    return m;
  });
  // 첫 시리즈 날짜를 기준으로 모든 시리즈에 존재하는 날만 남김
  const dates = (seriesList[0] || []).map(p => p.date).filter(d => maps.every(m => m.has(d)));
  const matrices = maps.map(m => dates.map(d => m.get(d)!));
  return { dates, matrices };
}

function computeWeightedReturns(matrices: number[][], weights: number[]): number[] {
  // 각 시리즈의 일별 수익률 → 비중 가중 합 → 누적 곱
  const n = matrices.length;
  if (n === 0) return [];
  const len = matrices[0].length;
  const cumulative: number[] = [1.0];
  for (let i = 1; i < len; i++) {
    let dayReturn = 0;
    for (let s = 0; s < n; s++) {
      const prev = matrices[s][i - 1];
      const cur = matrices[s][i];
      if (!prev || !cur) continue;
      const r = (cur - prev) / prev;
      dayReturn += r * weights[s];
    }
    cumulative.push(cumulative[i - 1] * (1 + dayReturn));
  }
  return cumulative;
}

function computeStats(cumulative: number[]): {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  volatility: number;
} {
  if (cumulative.length < 2) {
    return { totalReturn: 0, annualizedReturn: 0, maxDrawdown: 0, volatility: 0 };
  }
  const totalReturn = cumulative[cumulative.length - 1] - 1;
  const years = cumulative.length / 252;
  const annualizedReturn = years > 0 ? Math.pow(1 + totalReturn, 1 / years) - 1 : 0;

  // MDD
  let peak = cumulative[0];
  let mdd = 0;
  for (const v of cumulative) {
    if (v > peak) peak = v;
    const dd = (v - peak) / peak;
    if (dd < mdd) mdd = dd;
  }

  // 변동성: 일별 수익률 std × sqrt(252)
  const dailyReturns: number[] = [];
  for (let i = 1; i < cumulative.length; i++) {
    dailyReturns.push((cumulative[i] - cumulative[i - 1]) / cumulative[i - 1]);
  }
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  return { totalReturn, annualizedReturn, maxDrawdown: mdd, volatility };
}

export async function backtestTemplate(
  template: PortfolioTemplate,
  range: BacktestRange = '1y',
): Promise<BacktestResult | null> {
  const series = await Promise.all(
    template.allocations.map(a => fetchPriceHistory(a.ticker, range))
  );
  if (series.some(s => s.length === 0)) return null;

  const weights = template.allocations.map(a => a.weight);
  const { dates, matrices } = alignSeries(series);
  if (dates.length < 30) return null;

  const cumulative = computeWeightedReturns(matrices, weights);
  const stats = computeStats(cumulative);

  // 벤치마크: VOO 단독
  const voo = await fetchPriceHistory('VOO', range);
  let vsBenchmark: BacktestResult['vsBenchmark'];
  if (voo.length > 30) {
    const alignedVoo = alignSeries([voo, ...series]).matrices[0];
    const vooCum = computeWeightedReturns([alignedVoo], [1]);
    const vooStats = computeStats(vooCum);
    vsBenchmark = {
      totalReturn: vooStats.totalReturn,
      outperformance: stats.totalReturn - vooStats.totalReturn,
    };
  }

  // 차트용 포인트는 데이터 줄이기 (모든 점 X — 주 단위 sampling)
  const sampleEvery = Math.max(1, Math.floor(dates.length / 80));
  const points: BacktestPoint[] = [];
  for (let i = 0; i < dates.length; i += sampleEvery) {
    points.push({ date: dates[i], cumulative: cumulative[i] });
  }
  // 마지막 포인트 보장
  if (points[points.length - 1]?.date !== dates[dates.length - 1]) {
    points.push({ date: dates[dates.length - 1], cumulative: cumulative[cumulative.length - 1] });
  }

  return {
    points,
    totalReturn: stats.totalReturn,
    annualizedReturn: stats.annualizedReturn,
    maxDrawdown: stats.maxDrawdown,
    volatility: stats.volatility,
    vsBenchmark,
  };
}
