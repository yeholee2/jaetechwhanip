/**
 * ETF 일별 가격 + 기간별 수익률.
 * Yahoo Finance — 미국 ETF는 ticker 그대로, KRX ETF는 ticker.KS suffix.
 */

export type PricePoint = { date: string; close: number };

export type PeriodReturn = {
  label: string;       // '1주', '1개월', ...
  key: string;         // 'w1', 'm1', 'm3', 'm6', 'ytd', 'y1', 'y3', 'y5', 'inception'
  pct: number | null;  // null = 데이터 부족
};

/**
 * Yahoo 심볼 변환.
 * - 6자리 숫자 → 000000.KS (한국 거래소)
 * - 그 외 → 그대로 (미국 등)
 */
function toYahooSymbol(code: string): string {
  if (/^[0-9]{6}$/.test(code)) return `${code}.KS`;
  return code;
}

/** 가격 시계열 max range fetch (서버 캐시 1일) */
export async function fetchMaxHistory(code: string): Promise<PricePoint[]> {
  const symbol = toYahooSymbol(code);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=max`;
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return [];
    const ts: number[] = result.timestamp || [];
    const close: (number | null)[] = result.indicators?.quote?.[0]?.close || [];
    const out: PricePoint[] = [];
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

/** 특정 날짜 이전의 마지막 가격 찾기 */
function priceAtOrBefore(points: PricePoint[], targetDate: Date): PricePoint | null {
  const t = targetDate.getTime();
  for (let i = points.length - 1; i >= 0; i--) {
    const d = new Date(points[i].date).getTime();
    if (d <= t) return points[i];
  }
  return null;
}

/** 기간별 수익률 계산 — 7개 구간 */
export function computePeriodReturns(points: PricePoint[]): PeriodReturn[] {
  if (points.length < 2) {
    return [
      { key: 'w1', label: '1주', pct: null },
      { key: 'm1', label: '1개월', pct: null },
      { key: 'm3', label: '3개월', pct: null },
      { key: 'm6', label: '6개월', pct: null },
      { key: 'ytd', label: '연초후', pct: null },
      { key: 'y1', label: '1년', pct: null },
      { key: 'y3', label: '3년', pct: null },
      { key: 'y5', label: '5년', pct: null },
      { key: 'inception', label: '상장 후', pct: null },
    ];
  }

  const last = points[points.length - 1];
  const lastDate = new Date(last.date);
  const lastPrice = last.close;

  const ago = (days: number) => {
    const d = new Date(lastDate);
    d.setDate(d.getDate() - days);
    return d;
  };

  const firstOfYear = (() => {
    const d = new Date(lastDate);
    d.setMonth(0, 1);
    return d;
  })();

  const ranges = [
    { key: 'w1', label: '1주', date: ago(7) },
    { key: 'm1', label: '1개월', date: ago(30) },
    { key: 'm3', label: '3개월', date: ago(90) },
    { key: 'm6', label: '6개월', date: ago(180) },
    { key: 'ytd', label: '연초후', date: firstOfYear },
    { key: 'y1', label: '1년', date: ago(365) },
    { key: 'y3', label: '3년', date: ago(365 * 3) },
    { key: 'y5', label: '5년', date: ago(365 * 5) },
  ];

  const results: PeriodReturn[] = ranges.map(r => {
    const ref = priceAtOrBefore(points, r.date);
    if (!ref) return { key: r.key, label: r.label, pct: null };
    // 최초 시점이 너무 가까우면 (해당 range에 데이터 부족) null
    const refDate = new Date(ref.date);
    const daysFromFirst = (refDate.getTime() - new Date(points[0].date).getTime()) / 86400000;
    if (daysFromFirst < -5) return { key: r.key, label: r.label, pct: null };
    return {
      key: r.key,
      label: r.label,
      pct: (lastPrice - ref.close) / ref.close,
    };
  });

  // 상장 후 (전체)
  results.push({
    key: 'inception',
    label: '상장 후',
    pct: (lastPrice - points[0].close) / points[0].close,
  });

  return results;
}
