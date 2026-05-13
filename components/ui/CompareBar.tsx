'use client';

/**
 * 동종 비교 bar (Toss 스타일).
 * 현재 ETF 값 vs 카테고리 평균 / min / max 를 가로 막대로 표시.
 *
 * Phase F: 비교 데이터(category min/avg/max) 가 동적이면 props 로 받음.
 */

import styles from './CompareBar.module.css';

type Props = {
  label: string;          // '총보수'
  current: number;        // 현재 ETF 값
  min: number;            // 카테고리 최저
  max: number;            // 카테고리 최고
  avg: number;            // 카테고리 평균
  unit?: string;          // '%' 등
  /** 낮을수록 좋은 지표 (총보수 등). 높을수록 좋은 지표면 false. */
  lowerIsBetter?: boolean;
  formatValue?: (n: number) => string;
};

export function CompareBar({
  label,
  current,
  min,
  max,
  avg,
  unit = '%',
  lowerIsBetter = true,
  formatValue,
}: Props) {
  const fmt = formatValue || ((n: number) => `${n.toFixed(2)}${unit}`);

  const range = max - min || 1;
  const currentPos = ((current - min) / range) * 100;
  const avgPos = ((avg - min) / range) * 100;

  // 좋음·나쁨 판정
  const betterThanAvg = lowerIsBetter ? current < avg : current > avg;
  const tone: 'good' | 'neutral' | 'warn' = betterThanAvg
    ? 'good'
    : Math.abs(current - avg) / avg < 0.1
    ? 'neutral'
    : 'warn';

  const toneText = tone === 'good' ? '낮은 편' : tone === 'warn' ? '높은 편' : '평균';
  const toneColor = tone === 'good' ? 'var(--rw-green50)' : tone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-muted)';

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.tone} style={{ color: toneColor }}>
          {lowerIsBetter ? toneText : (tone === 'good' ? '높은 편' : tone === 'warn' ? '낮은 편' : '평균')}
        </span>
      </div>

      <div className={styles.bar} aria-hidden="true">
        {/* 평균 마커 */}
        <span
          className={styles.avgMarker}
          style={{ left: `${avgPos}%` }}
          aria-label="카테고리 평균"
          title={`평균 ${fmt(avg)}`}
        />
        {/* 현재 값 dot */}
        <span
          className={styles.currentDot}
          style={{ left: `${currentPos}%`, background: toneColor }}
          aria-label={`현재 값 ${fmt(current)}`}
        />
      </div>

      <div className={styles.scale}>
        <span>{fmt(min)}</span>
        <span className={styles.avgScale}>평균 {fmt(avg)}</span>
        <span>{fmt(max)}</span>
      </div>

      <div className={styles.summary}>
        <strong style={{ color: toneColor }}>{fmt(current)}</strong>
        <span>· 평균보다 {Math.abs(((current - avg) / avg) * 100).toFixed(1)}% {current < avg ? '낮음' : current > avg ? '높음' : '같음'}</span>
      </div>
    </div>
  );
}
