'use client';

import { useEffect, useMemo, useState } from 'react';
import { PriceChart, type ChartPoint } from '@/components/ui';
import styles from './EtfChart.module.css';

type Period = '1M' | '3M' | '6M' | '1Y' | '5Y';

const PERIODS: { key: Period; label: string; points: number; stepDays: number }[] = [
  { key: '1M', label: '1개월', points: 22, stepDays: 1 },
  { key: '3M', label: '3개월', points: 64, stepDays: 1 },
  { key: '6M', label: '6개월', points: 128, stepDays: 1 },
  { key: '1Y', label: '1년', points: 250, stepDays: 1 },
  { key: '5Y', label: '5년', points: 60, stepDays: 30 },
];

/** 실데이터 없을 때 fallback: seeded random walk */
function generateMockSeries(
  seed: string,
  points: number,
  stepDays: number,
  endPrice: number,
  tone: 'up' | 'down' | 'flat',
): ChartPoint[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const drift = tone === 'up' ? 0.0018 : tone === 'down' ? -0.0018 : 0;
  const values: number[] = new Array(points);
  let v = endPrice;
  values[points - 1] = v;
  for (let i = points - 2; i >= 0; i--) {
    const change = (rand() - 0.5) * 0.03 - drift;
    v = v / (1 + change);
    values[i] = v;
  }
  const now = new Date();
  return values.map((value, i) => {
    const d = new Date(now);
    const daysBack = (points - 1 - i) * stepDays;
    d.setDate(d.getDate() - daysBack);
    return { date: d.toISOString().slice(0, 10), value: Math.round(value) };
  });
}

function parsePrice(str: string): number {
  const m = str.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function formatKRW(n: number): string {
  return n.toLocaleString('ko-KR') + '원';
}

function formatDateLabel(d: string): string {
  const date = new Date(d);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function EtfChart({
  code,
  price,
  changeTone,
}: {
  code: string;
  price: string;
  changeTone: 'up' | 'down' | 'flat';
}) {
  const [period, setPeriod] = useState<Period>('3M');
  const [liveSeries, setLiveSeries] = useState<ChartPoint[] | null>(null);
  const [liveSource, setLiveSource] = useState<'cache' | 'api' | 'fallback' | null>(null);
  const [loading, setLoading] = useState(false);

  const cfg = PERIODS.find(p => p.key === period)!;
  const endPrice = useMemo(() => parsePrice(price), [price]);

  // 기간 변경 시 /api/etf/history fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLiveSeries(null);
    setLiveSource(null);
    fetch(`/api/etf/history?code=${code}&period=${period}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled) return;
        if (data?.items && Array.isArray(data.items) && data.items.length > 5) {
          const pts: ChartPoint[] = data.items
            .filter((it: any) => typeof it.close === 'number')
            .map((it: any) => ({ date: it.date, value: Math.round(Number(it.close)) }));
          if (pts.length > 5) {
            setLiveSeries(pts);
            setLiveSource(data.source || 'api');
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [code, period]);

  const series = useMemo(() => {
    if (liveSeries && liveSeries.length > 5) return liveSeries;
    return generateMockSeries(`${code}-${period}`, cfg.points, cfg.stepDays, endPrice, changeTone);
  }, [liveSeries, code, period, cfg, endPrice, changeTone]);

  const startPrice = series[0].value;
  const lastPrice = series[series.length - 1].value;
  const periodChange = lastPrice - startPrice;
  const periodPct = startPrice > 0 ? (periodChange / startPrice) * 100 : 0;
  const periodTone: 'up' | 'down' | 'flat' = periodChange > 0 ? 'up' : periodChange < 0 ? 'down' : 'flat';

  const isLive = liveSeries !== null && (liveSource === 'cache' || liveSource === 'api');

  return (
    <section className={styles.chart} aria-label="가격 차트">
      <div className={styles.head}>
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>{cfg.label} 변동</span>
          <strong className={periodTone === 'down' ? styles.down : periodTone === 'up' ? styles.up : styles.flat}>
            {periodChange >= 0 ? '+' : ''}{periodPct.toFixed(2)}%
          </strong>
          <span className={periodTone === 'down' ? styles.downSmall : periodTone === 'up' ? styles.upSmall : styles.flatSmall}>
            {periodChange >= 0 ? '+' : ''}{formatKRW(Math.round(Math.abs(periodChange)))}
          </span>
        </div>
        <div className={styles.periodRow} role="tablist">
          {PERIODS.map(p => (
            <button
              key={p.key}
              role="tab"
              aria-selected={p.key === period}
              className={`${styles.periodBtn} ${p.key === period ? styles.periodActive : ''}`}
              onClick={() => setPeriod(p.key)}
              type="button"
            >
              {p.key}
            </button>
          ))}
        </div>
      </div>

      <PriceChart
        data={series}
        tone={periodTone}
        height={240}
        valueFormat={formatKRW}
        dateFormat={formatDateLabel}
      />

      <p className={styles.notice}>
        {loading
          ? '※ 데이터를 불러오는 중...'
          : isLive
            ? `※ KRX 일별가격 (${liveSource === 'cache' ? '캐시' : '실시간'}) · ${series.length}일치`
            : '※ 시연용 임시 데이터예요. KRX API 키 등록 시 자동으로 실데이터 차트.'}
      </p>
    </section>
  );
}
