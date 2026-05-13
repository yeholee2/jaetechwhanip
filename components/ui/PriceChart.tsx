'use client';

/**
 * 풀스펙 가격 차트 (SVG).
 *
 * 기능:
 * - y축 가격 라벨 (4-5단계)
 * - x축 날짜 라벨 (시작·중간·끝)
 * - 가로 그리드 라인
 * - 마우스 호버 시 crosshair + 가격·날짜 툴팁
 * - 영역 그라디언트 채우기
 * - 마지막 점 강조 dot
 * - 0% / 시작점 비교 옵션
 *
 * 데이터 포맷: { date: string, value: number }[]
 */

import { useMemo, useRef, useState } from 'react';
import styles from './PriceChart.module.css';

export type ChartPoint = { date: string; value: number };

type Props = {
  data: ChartPoint[];
  tone?: 'up' | 'down' | 'flat';
  height?: number;
  valueFormat?: (n: number) => string;
  dateFormat?: (d: string) => string;
  yAxisTicks?: number;
  className?: string;
  /** 보조 라인 (벤치마크 등). dash 스타일로 회색 표시. */
  overlay?: ChartPoint[];
};

const defaultValueFormat = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const defaultDateFormat = (d: string) => {
  try {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return d;
  }
};

export function PriceChart({
  data,
  tone = 'up',
  height = 220,
  valueFormat = defaultValueFormat,
  dateFormat = defaultDateFormat,
  yAxisTicks = 4,
  className,
  overlay,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; idx: number } | null>(null);

  // SVG viewport
  const W = 720;
  const H = height;
  const padL = 52;   // y축 라벨 공간
  const padR = 16;
  const padT = 16;
  const padB = 36;   // x축 라벨 공간
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const { min, max, niceMin, niceMax, ticks } = useMemo(() => {
    if (!data || data.length === 0) {
      return { min: 0, max: 1, niceMin: 0, niceMax: 1, ticks: [] as number[] };
    }
    const vs = [...data.map(d => d.value), ...(overlay?.map(o => o.value) || [])];
    let mn = Math.min(...vs);
    let mx = Math.max(...vs);
    if (mx === mn) { mx += 1; mn -= 1; }
    // 5% 여유 추가
    const pad = (mx - mn) * 0.08;
    mn -= pad;
    mx += pad;
    // 깔끔한 step 계산
    const range = mx - mn;
    const rough = range / yAxisTicks;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step = mag;
    if (norm < 1.5) step = mag;
    else if (norm < 3) step = mag * 2;
    else if (norm < 7) step = mag * 5;
    else step = mag * 10;
    const nMin = Math.floor(mn / step) * step;
    const nMax = Math.ceil(mx / step) * step;
    const tks: number[] = [];
    for (let t = nMin; t <= nMax + 0.0001; t += step) tks.push(t);
    return { min: mn, max: mx, niceMin: nMin, niceMax: nMax, ticks: tks };
  }, [data, overlay, yAxisTicks]);

  if (!data || data.length === 0) return null;

  const xAt = (i: number) => padL + (i / Math.max(1, data.length - 1)) * plotW;
  const yAt = (v: number) => padT + (1 - (v - niceMin) / (niceMax - niceMin)) * plotH;

  const points = data.map((d, i) => [xAt(i), yAt(d.value)] as const);
  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1][0]},${padT + plotH} L${points[0][0]},${padT + plotH} Z`;

  const colorVar = tone === 'down' ? 'var(--rw-down)' : tone === 'flat' ? 'var(--rw-text-muted)' : 'var(--rw-up)';
  const gradId = `pc-grad-${tone}-${Math.floor(Math.random() * 100000)}`;

  // 호버 핸들러
  const onMove = (event: React.MouseEvent<SVGRectElement>) => {
    const svg = (event.currentTarget.closest('svg') as SVGSVGElement | null);
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const relX = (event.clientX - rect.left) * scaleX;
    const ratio = Math.max(0, Math.min(1, (relX - padL) / plotW));
    const idx = Math.round(ratio * (data.length - 1));
    const [px, py] = points[idx];
    setHover({ x: px, y: py, idx });
  };
  const onLeave = () => setHover(null);

  const hoverPoint = hover ? data[hover.idx] : null;

  // x축 라벨: 시작, 1/4, 1/2, 3/4, 끝 (5개)
  const xLabelIdxs = data.length <= 5
    ? data.map((_, i) => i)
    : [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1];

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${className || ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="가격 차트">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorVar} stopOpacity={0.22} />
            <stop offset="100%" stopColor={colorVar} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* y축 그리드 + 라벨 */}
        {ticks.map(t => {
          const y = yAt(t);
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--rw-hairline)" strokeDasharray="3 3" />
              <text x={padL - 8} y={y} textAnchor="end" dominantBaseline="middle" className={styles.yLabel}>
                {valueFormat(t)}
              </text>
            </g>
          );
        })}

        {/* x축 라벨 */}
        {xLabelIdxs.map(i => {
          const x = xAt(i);
          return (
            <text key={i} x={x} y={H - padB / 2 + 4} textAnchor="middle" className={styles.xLabel}>
              {dateFormat(data[i].date)}
            </text>
          );
        })}

        {/* 영역 그라디언트 */}
        <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />

        {/* 벤치마크 overlay (대시 회색 라인) */}
        {overlay && overlay.length > 1 && (() => {
          const oPoints: [number, number][] = overlay.map((p, i) => {
            const x = padL + (i / (overlay.length - 1)) * plotW;
            const y = padT + ((niceMax - p.value) / (niceMax - niceMin)) * plotH;
            return [x, y];
          });
          const oPath = 'M ' + oPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ');
          return (
            <path
              d={oPath}
              fill="none"
              stroke="var(--rw-text-muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })()}

        {/* 라인 */}
        <path d={linePath} fill="none" stroke={colorVar} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />

        {/* 마지막 점 */}
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={3.5} fill={colorVar} />

        {/* 호버 crosshair + 점 */}
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + plotH} stroke="var(--rw-gray30)" strokeDasharray="2 4" />
            <circle cx={hover.x} cy={hover.y} r={5} fill="#fff" stroke={colorVar} strokeWidth={2} />
          </g>
        )}

        {/* 호버 캐처 (transparent rect) */}
        <rect
          x={padL}
          y={padT}
          width={plotW}
          height={plotH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ cursor: 'crosshair' }}
        />
      </svg>

      {/* 툴팁 */}
      {hover && hoverPoint && (
        <div
          className={styles.tooltip}
          style={{
            left: `${(hover.x / W) * 100}%`,
            top: `${((hover.y) / H) * 100}%`,
          }}
        >
          <div className={styles.tooltipDate}>{dateFormat(hoverPoint.date)}</div>
          <div className={styles.tooltipValue}>{valueFormat(hoverPoint.value)}</div>
        </div>
      )}
    </div>
  );
}
