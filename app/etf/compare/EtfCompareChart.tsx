'use client';

import { useMemo, useState } from 'react';
import type { EtfInfo } from '@/lib/etfs';
import styles from './EtfCompareChart.module.css';

type Period = '1M' | '3M' | '6M' | '1Y' | '5Y';

const PERIODS: { key: Period; label: string; points: number }[] = [
  { key: '1M', label: '1M', points: 22 },
  { key: '3M', label: '3M', points: 64 },
  { key: '6M', label: '6M', points: 128 },
  { key: '1Y', label: '1Y', points: 250 },
  { key: '5Y', label: '5Y', points: 60 },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function mockReturns(seed: string, points: number, tone: 'up' | 'down' | 'flat'): number[] {
  // 누적 수익률 (%) 시리즈를 0%에서 시작해 random walk로 생성
  let h = hashSeed(seed);
  const rand = () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const drift = tone === 'up' ? 0.003 : tone === 'down' ? -0.003 : 0;
  const series: number[] = [];
  let acc = 0;
  for (let i = 0; i < points; i++) {
    const step = (rand() - 0.5) * 0.025 + drift;
    acc += step;
    series.push(acc * 100); // %
  }
  return series;
}

function buildPath(values: number[], width: number, height: number, gMin: number, gMax: number): string {
  const padX = 8;
  const padY = 12;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const range = gMax - gMin || 1;
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = padX + i * step;
      const y = padY + h - ((v - gMin) / range) * h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildZeroLine(width: number, height: number, gMin: number, gMax: number): number {
  const padY = 12;
  const h = height - padY * 2;
  const range = gMax - gMin || 1;
  return padY + h - ((0 - gMin) / range) * h;
}

export function EtfCompareChart({ etfA, etfB }: { etfA: EtfInfo; etfB: EtfInfo }) {
  const [period, setPeriod] = useState<Period>('3M');
  const points = PERIODS.find(p => p.key === period)?.points ?? 64;

  const seriesA = useMemo(
    () => mockReturns(`${etfA.code}-${period}`, points, etfA.changeTone),
    [etfA.code, etfA.changeTone, period, points],
  );
  const seriesB = useMemo(
    () => mockReturns(`${etfB.code}-${period}`, points, etfB.changeTone),
    [etfB.code, etfB.changeTone, period, points],
  );

  const width = 720;
  const height = 220;

  const all = [...seriesA, ...seriesB, 0];
  const gMin = Math.min(...all);
  const gMax = Math.max(...all);

  const pathA = buildPath(seriesA, width, height, gMin, gMax);
  const pathB = buildPath(seriesB, width, height, gMin, gMax);
  const zeroY = buildZeroLine(width, height, gMin, gMax);

  const finalA = seriesA[seriesA.length - 1] ?? 0;
  const finalB = seriesB[seriesB.length - 1] ?? 0;
  const winner = finalA > finalB ? 'a' : finalB > finalA ? 'b' : 'tie';

  return (
    <section className={styles.wrap} aria-label="ETF 수익률 비교 차트">
      <div className={styles.head}>
        <div className={styles.legend}>
          <span className={`${styles.swatch} ${styles.swatchA}`} />
          <strong>{etfA.shortName}</strong>
          <em className={finalA >= 0 ? styles.up : styles.down}>
            {finalA >= 0 ? '+' : ''}{finalA.toFixed(2)}%
          </em>
        </div>
        <div className={styles.legend}>
          <span className={`${styles.swatch} ${styles.swatchB}`} />
          <strong>{etfB.shortName}</strong>
          <em className={finalB >= 0 ? styles.up : styles.down}>
            {finalB >= 0 ? '+' : ''}{finalB.toFixed(2)}%
          </em>
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
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-hidden="true">
          {/* 0% 가이드 라인 */}
          <line x1={8} x2={width - 8} y1={zeroY} y2={zeroY} stroke="var(--rw-hairline)" strokeDasharray="4 4" />

          {/* B line */}
          <path d={pathB} fill="none" stroke="var(--rw-down)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

          {/* A line */}
          <path d={pathA} fill="none" stroke="var(--rw-up)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>

      <div className={styles.footer}>
        {winner !== 'tie' && (
          <p>
            <strong>{winner === 'a' ? etfA.shortName : etfB.shortName}</strong>이 {period}간 더 좋았어요
            ({(Math.abs(finalA - finalB)).toFixed(2)}%p 차이).
          </p>
        )}
        <p className={styles.notice}>※ 시연용 임시 데이터. KRX 일별가격 연결 후 실제 데이터로 교체됩니다.</p>
      </div>
    </section>
  );
}
