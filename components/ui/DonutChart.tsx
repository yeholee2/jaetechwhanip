'use client';

/**
 * SVG 도넛 차트 — ETF 섹터·지역·종목 비중 시각화.
 * 토스 / FunETF 스타일: 부드러운 segment + 호버 시 강조 + 가운데 총합.
 */

import { useState } from 'react';
import styles from './DonutChart.module.css';

export type DonutSegment = {
  label: string;
  value: number; // 비중 (%) 또는 절대값
  color?: string;
};

const DEFAULT_COLORS = [
  'var(--rw-primary)',
  '#4593fc',
  '#7e57c2',
  '#03b26c',
  '#ffa927',
  '#e42939',
  '#6b7684',
  '#15c47e',
  '#fe9800',
  '#b0b8c1',
];

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 200,
  thickness = 32,
  formatValue = (n: number) => `${n.toFixed(1)}%`,
}: {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  thickness?: number;
  formatValue?: (n: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const total = segments.reduce((acc, s) => acc + s.value, 0) || 1;
  const r = size / 2;
  const innerR = r - thickness;
  const circumference = 2 * Math.PI * (r - thickness / 2);

  // segment를 stroke-dasharray로 표현 (시계방향)
  let cumulativeAngle = -90; // 12시 방향 시작
  const arcs = segments.map((seg, i) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;
    const color = seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return { seg, startAngle, endAngle, color, idx: i };
  });

  // SVG 호 path 생성
  function describeArc(cx: number, cy: number, radius: number, startDeg: number, endDeg: number) {
    const start = polarToCartesian(cx, cy, radius, startDeg);
    const end = polarToCartesian(cx, cy, radius, endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M${start.x} ${start.y} A${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }
  function polarToCartesian(cx: number, cy: number, radius: number, deg: number) {
    const rad = ((deg - 0) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  const cx = r;
  const cy = r;
  const arcRadius = r - thickness / 2;

  return (
    <div className={styles.wrap}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        {arcs.map(({ seg, startAngle, endAngle, color, idx }) => {
          // 한 segment 가 360° 일 때 풀 원으로 그림
          if (segments.length === 1) {
            return (
              <circle
                key={idx}
                cx={cx}
                cy={cy}
                r={arcRadius}
                fill="none"
                stroke={color}
                strokeWidth={thickness}
              />
            );
          }
          return (
            <path
              key={idx}
              d={describeArc(cx, cy, arcRadius, startAngle, endAngle - 0.3 /* gap */)}
              stroke={color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
              opacity={hovered === null || hovered === idx ? 1 : 0.35}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer', transition: 'opacity .15s' }}
            />
          );
        })}

        {/* 가운데 텍스트 */}
        {hovered !== null ? (
          <g>
            <text x={cx} y={cy - 8} textAnchor="middle" className={styles.centerLabel}>
              {segments[hovered].label}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" className={styles.centerValue}>
              {formatValue(segments[hovered].value)}
            </text>
          </g>
        ) : (
          <g>
            {centerLabel && (
              <text x={cx} y={cy - 8} textAnchor="middle" className={styles.centerLabel}>
                {centerLabel}
              </text>
            )}
            {centerValue && (
              <text x={cx} y={cy + 16} textAnchor="middle" className={styles.centerValue}>
                {centerValue}
              </text>
            )}
          </g>
        )}
      </svg>

      {/* 범례 */}
      <ul className={styles.legend}>
        {arcs.map(({ seg, color, idx }) => (
          <li
            key={idx}
            className={`${styles.legendItem} ${hovered === idx ? styles.legendItemActive : ''}`}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className={styles.swatch} style={{ background: color }} />
            <span className={styles.legendLabel}>{seg.label}</span>
            <span className={styles.legendValue}>{formatValue(seg.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
