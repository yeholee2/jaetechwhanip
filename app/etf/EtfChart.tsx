'use client';

import { useMemo, useState } from 'react';
import { Sparkline } from '@/components/ui/Sparkline';
import styles from './EtfChart.module.css';

type Period = '1M' | '3M' | '6M' | '1Y' | '5Y';

const PERIODS: { key: Period; label: string; points: number }[] = [
  { key: '1M', label: '1M', points: 22 },
  { key: '3M', label: '3M', points: 64 },
  { key: '6M', label: '6M', points: 128 },
  { key: '1Y', label: '1Y', points: 250 },
  { key: '5Y', label: '5Y', points: 60 },
];

/**
 * Mock 가격 시리즈 생성 (seeded random walk).
 * Phase F: KRX 일별가격 API 결과로 대체.
 */
function generateMockSeries(seed: string, points: number, endPrice: number, tone: 'up' | 'down' | 'flat'): number[] {
  // 간단한 hash → seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  const rand = () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const drift = tone === 'up' ? 0.002 : tone === 'down' ? -0.002 : 0;
  // 끝점에서부터 역산
  const series: number[] = new Array(points);
  let v = endPrice;
  series[points - 1] = v;
  for (let i = points - 2; i >= 0; i--) {
    const change = (rand() - 0.5) * 0.04 - drift;
    v = v / (1 + change);
    series[i] = v;
  }
  return series;
}

function parsePrice(str: string): number {
  const m = str.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
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
  const [period, setPeriod] = useState<Period>('1M');

  const endPrice = useMemo(() => parsePrice(price), [price]);
  const points = PERIODS.find(p => p.key === period)?.points ?? 22;
  const series = useMemo(
    () => generateMockSeries(`${code}-${period}`, points, endPrice, changeTone),
    [code, period, points, endPrice, changeTone],
  );

  const startPrice = series[0];
  const periodChange = endPrice - startPrice;
  const periodPct = startPrice > 0 ? (periodChange / startPrice) * 100 : 0;
  const periodTone: 'up' | 'down' | 'flat' = periodChange > 0 ? 'up' : periodChange < 0 ? 'down' : 'flat';

  return (
    <section className={styles.chart} aria-label="가격 차트">
      <div className={styles.head}>
        <div>
          <span className={styles.label}>{period} 변동</span>
          <span className={periodTone === 'down' ? styles.down : periodTone === 'up' ? styles.up : styles.flat}>
            {periodChange >= 0 ? '+' : ''}{periodPct.toFixed(2)}%
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
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className={styles.canvas}>
        <Sparkline data={series} tone={periodTone} width={720} height={140} />
      </div>
      <p className={styles.notice}>
        ※ 차트는 시연용 임시 데이터예요. 실제 일별가격은 곧 KRX 데이터로 연결됩니다.
      </p>
    </section>
  );
}
