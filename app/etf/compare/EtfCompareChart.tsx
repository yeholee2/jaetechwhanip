'use client';

import { useMemo, useState } from 'react';
import type { EtfInfo } from '@/lib/etfs';
import styles from './EtfCompareChart.module.css';

type Period = '1M' | '3M' | '6M' | '1Y' | '5Y';

const PERIODS: { key: Period; label: string; points: number; stepDays: number }[] = [
  { key: '1M', label: '1개월', points: 22, stepDays: 1 },
  { key: '3M', label: '3개월', points: 64, stepDays: 1 },
  { key: '6M', label: '6개월', points: 128, stepDays: 1 },
  { key: '1Y', label: '1년', points: 250, stepDays: 1 },
  { key: '5Y', label: '5년', points: 60, stepDays: 30 },
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/** 누적 수익률 % 시리즈 + 날짜 */
function mockReturns(
  seed: string,
  points: number,
  stepDays: number,
  tone: 'up' | 'down' | 'flat',
): { date: string; value: number }[] {
  let h = hashSeed(seed);
  const rand = () => {
    h = (h * 1664525 + 1013904223) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
  const drift = tone === 'up' ? 0.0028 : tone === 'down' ? -0.0028 : 0;

  const values: number[] = [];
  let acc = 0;
  for (let i = 0; i < points; i++) {
    const step = (rand() - 0.5) * 0.022 + drift;
    acc += step;
    values.push(acc * 100);
  }

  const now = new Date();
  return values.map((v, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (points - 1 - i) * stepDays);
    return {
      date: d.toISOString().slice(0, 10),
      value: parseFloat(v.toFixed(2)),
    };
  });
}

function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtDate(d: string) {
  const date = new Date(d);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

function fmtTooltipDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function EtfCompareChart({ etfA, etfB }: { etfA: EtfInfo; etfB: EtfInfo }) {
  const [period, setPeriod] = useState<Period>('3M');
  const cfg = PERIODS.find(p => p.key === period)!;

  const seriesA = useMemo(
    () => mockReturns(`${etfA.code}-${period}`, cfg.points, cfg.stepDays, etfA.changeTone),
    [etfA.code, etfA.changeTone, period, cfg],
  );
  const seriesB = useMemo(
    () => mockReturns(`${etfB.code}-${period}`, cfg.points, cfg.stepDays, etfB.changeTone),
    [etfB.code, etfB.changeTone, period, cfg],
  );

  // SVG geometry
  const W = 720;
  const H = 260;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const allVals = [...seriesA.map(p => p.value), ...seriesB.map(p => p.value), 0];
  let gMin = Math.min(...allVals);
  let gMax = Math.max(...allVals);
  const pad = (gMax - gMin) * 0.1 || 1;
  gMin -= pad;
  gMax += pad;

  // y축 nice tick
  const range = gMax - gMin;
  const rough = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let step = mag * 5;
  if (norm < 1.5) step = mag;
  else if (norm < 3) step = mag * 2;
  else if (norm < 7) step = mag * 5;
  const niceMin = Math.floor(gMin / step) * step;
  const niceMax = Math.ceil(gMax / step) * step;
  const ticks: number[] = [];
  for (let t = niceMin; t <= niceMax + 0.0001; t += step) ticks.push(t);

  const xAt = (i: number) => padL + (i / Math.max(1, seriesA.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - (v - niceMin) / (niceMax - niceMin)) * plotH;

  const pathA = seriesA.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.value).toFixed(2)}`).join(' ');
  const pathB = seriesB.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p.value).toFixed(2)}`).join(' ');

  const finalA = seriesA[seriesA.length - 1].value;
  const finalB = seriesB[seriesB.length - 1].value;
  const winner = finalA > finalB ? 'a' : finalB > finalA ? 'b' : 'tie';

  // 호버
  const [hover, setHover] = useState<{ x: number; idx: number } | null>(null);
  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const svg = event.currentTarget.closest('svg') as SVGSVGElement | null;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const relX = (event.clientX - rect.left) * scaleX;
    const ratio = Math.max(0, Math.min(1, (relX - padL) / plotW));
    const idx = Math.round(ratio * (seriesA.length - 1));
    setHover({ x: xAt(idx), idx });
  };

  const hoverA = hover ? seriesA[hover.idx] : null;
  const hoverB = hover ? seriesB[hover.idx] : null;

  const xLabelIdxs = seriesA.length <= 5
    ? seriesA.map((_, i) => i)
    : [0, Math.floor(seriesA.length / 4), Math.floor(seriesA.length / 2), Math.floor((seriesA.length * 3) / 4), seriesA.length - 1];

  return (
    <section className={styles.wrap} aria-label="ETF 수익률 비교 차트">
      <div className={styles.head}>
        <div className={styles.legend}>
          <span className={`${styles.swatch} ${styles.swatchA}`} />
          <strong>{etfA.shortName}</strong>
          <em className={finalA >= 0 ? styles.up : styles.down}>{fmtPct(finalA)}</em>
        </div>
        <div className={styles.legend}>
          <span className={`${styles.swatch} ${styles.swatchB}`} />
          <strong>{etfB.shortName}</strong>
          <em className={finalB >= 0 ? styles.up : styles.down}>{fmtPct(finalB)}</em>
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

      <div className={styles.canvas}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-hidden="true">
          {ticks.map(t => {
            const y = yAt(t);
            const isZero = Math.abs(t) < 0.001;
            return (
              <g key={t}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke={isZero ? 'var(--rw-gray30)' : 'var(--rw-hairline)'}
                  strokeDasharray={isZero ? undefined : '3 3'}
                />
                <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" className={styles.yLabel}>
                  {fmtPct(t)}
                </text>
              </g>
            );
          })}

          {xLabelIdxs.map(i => (
            <text key={i} x={xAt(i)} y={H - 8} textAnchor="middle" className={styles.xLabel}>
              {fmtDate(seriesA[i].date)}
            </text>
          ))}

          <path d={pathB} fill="none" stroke="var(--rw-down)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
          <path d={pathA} fill="none" stroke="var(--rw-up)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />

          {hover && (
            <g>
              <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + plotH} stroke="var(--rw-gray30)" strokeDasharray="2 4" />
              <circle cx={hover.x} cy={yAt(seriesA[hover.idx].value)} r={5} fill="#fff" stroke="var(--rw-up)" strokeWidth={2} />
              <circle cx={hover.x} cy={yAt(seriesB[hover.idx].value)} r={5} fill="#fff" stroke="var(--rw-down)" strokeWidth={2} />
            </g>
          )}

          <rect
            x={padL}
            y={padT}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'crosshair' }}
          />
        </svg>

        {hover && hoverA && hoverB && (
          <div
            className={styles.tooltip}
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: '6%',
            }}
          >
            <div className={styles.tooltipDate}>{fmtTooltipDate(hoverA.date)}</div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.swatch} ${styles.swatchA}`} />
              <span>{etfA.shortName}</span>
              <strong className={hoverA.value >= 0 ? styles.up : styles.down}>{fmtPct(hoverA.value)}</strong>
            </div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.swatch} ${styles.swatchB}`} />
              <span>{etfB.shortName}</span>
              <strong className={hoverB.value >= 0 ? styles.up : styles.down}>{fmtPct(hoverB.value)}</strong>
            </div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        {winner !== 'tie' && (
          <p>
            <strong>{winner === 'a' ? etfA.shortName : etfB.shortName}</strong>이 {cfg.label}간 더 좋았어요
            ({(Math.abs(finalA - finalB)).toFixed(2)}%p 차이).
          </p>
        )}
        <p className={styles.notice}>※ 수익률은 추정치이며 실제와 다를 수 있습니다.</p>
      </div>
    </section>
  );
}
