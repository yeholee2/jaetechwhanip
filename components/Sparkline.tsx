/**
 * 미니 라인 차트 컴포넌트 (SVG). 라이브러리 없이 가벼움.
 *
 * 시장 지수·ETF 가격 추이 등에 재사용.
 */

export type SparklineProps = {
  series: number[];
  up?: boolean;
  width?: number;
  height?: number;
  color?: string;
  /** area fill 표시 여부 */
  fill?: boolean;
  className?: string;
};

export function Sparkline({
  series,
  up = true,
  width = 60,
  height = 24,
  color,
  fill = true,
  className,
}: SparklineProps) {
  if (!series || series.length < 2) {
    return <span style={{ display: 'inline-block', width, height }} aria-hidden="true" />;
  }

  const padY = 3;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stride = (width - 2) / (series.length - 1);

  const points = series.map((v, i) => {
    const x = 1 + i * stride;
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return [x, y] as [number, number];
  });

  const path = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${path} L${points[points.length - 1][0]},${height} L${points[0][0]},${height} Z`;

  const strokeColor = color || (up ? '#e42939' : '#3182f6');
  const gradId = `sl-${up ? 'u' : 'd'}-${series.length}-${Math.round((series[0] || 0) * 1000)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      {fill && (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={areaPath} fill={`url(#${gradId})`} stroke="none" />}
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
