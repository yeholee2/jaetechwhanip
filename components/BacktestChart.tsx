/**
 * 백테스트 누적 수익률 라인 차트.
 * 서버에서 받은 BacktestResult를 SVG로 그림.
 */

import styles from './BacktestChart.module.css';
import type { BacktestPoint } from '@/lib/backtest';

type Props = {
  points: BacktestPoint[];
  benchmark?: { totalReturn: number };
  height?: number;
};

export function BacktestChart({ points, height = 200 }: Props) {
  if (points.length < 2) return null;

  const W = 600;
  const H = height;
  const P = 8;

  const values = points.map(p => p.cumulative);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.01;

  const xStep = (W - 2 * P) / (points.length - 1);

  const xy = points.map((p, i) => {
    const x = P + i * xStep;
    const y = H - P - ((p.cumulative - min) / range) * (H - 2 * P);
    return { x, y };
  });

  const linePath = 'M ' + xy.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
  const areaPath = linePath + ` L ${xy[xy.length - 1].x.toFixed(1)},${H - P} L ${xy[0].x.toFixed(1)},${H - P} Z`;

  return (
    <div className={styles.wrap}>
      <div className={styles.chart}>
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} preserveAspectRatio="none">
          <path d={areaPath} className={styles.area} />
          <path d={linePath} className={styles.line} />
          {/* 1.0 기준선 */}
          {(() => {
            const baseY = H - P - ((1 - min) / range) * (H - 2 * P);
            if (baseY < P || baseY > H - P) return null;
            return (
              <line x1={P} y1={baseY} x2={W - P} y2={baseY}
                stroke="var(--rw-border)" strokeWidth="1" strokeDasharray="2 4" />
            );
          })()}
        </svg>
      </div>
      <div className={styles.legend}>
        <span className={`${styles.legendItem} ${styles.legendPortfolio}`}>
          포트폴리오 수익률
        </span>
        <span className={styles.legendItem}>
          첫날 가격 (1.00 기준)
        </span>
      </div>
    </div>
  );
}
