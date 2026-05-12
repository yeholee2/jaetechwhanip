'use client';

import { useMemo, useState } from 'react';
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

/**
 * 끝점에서 역산한 seeded random walk + 날짜 부여.
 * Phase F: KRX 일별가격 API 결과로 대체.
 */
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
    return {
      date: d.toISOString().slice(0, 10),
      value: Math.round(value),
    };
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
  const cfg = PERIODS.find(p => p.key === period)!;

  const endPrice = useMemo(() => parsePrice(price), [price]);
  const series = useMemo(
    () => generateMockSeries(`${code}-${period}`, cfg.points, cfg.stepDays, endPrice, changeTone),
    [code, period, cfg.points, cfg.stepDays, endPrice, changeTone],
  );

  const startPrice = series[0].value;
  const periodChange = endPrice - startPrice;
  const periodPct = startPrice > 0 ? (periodChange / startPrice) * 100 : 0;
  const periodTone: 'up' | 'down' | 'flat' = periodChange > 0 ? 'up' : periodChange < 0 ? 'down' : 'flat';

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
        ※ 시연용 임시 데이터예요. KRX 일별가격 API 연결 후 자동 전환됩니다.
      </p>
    </section>
  );
}
