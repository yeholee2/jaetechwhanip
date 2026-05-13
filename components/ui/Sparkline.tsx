/**
 * 미니 가격 차트 (SVG sparkline).
 *
 * 입력: number[] (시간순). 양수/음수 모두 가능.
 * 영역 채우기 그라디언트 + 마지막 점 강조.
 */

type Props = {
  data: number[];
  tone?: 'up' | 'down' | 'flat';
  width?: number;
  height?: number;
  className?: string;
};

export function Sparkline({
  data,
  tone = 'up',
  width = 320,
  height = 96,
  className,
}: Props) {
  if (!data || data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padX = 4;
  const padY = 6;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const step = data.length > 1 ? w / (data.length - 1) : 0;

  const points = data.map((v, i) => {
    const x = padX + i * step;
    const y = padY + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  const pathD = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaD = `${pathD} L${points[points.length - 1][0]},${padY + h} L${points[0][0]},${padY + h} Z`;
  const lastPoint = points[points.length - 1];

  const color = tone === 'down' ? 'var(--rw-down)' : tone === 'flat' ? 'var(--rw-text-muted)' : 'var(--rw-up)';
  const gradientId = `spark-grad-${tone}-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label="가격 추이 미니 차트"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} stroke="none" />
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r={3} fill={color} />
    </svg>
  );
}
