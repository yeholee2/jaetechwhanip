/**
 * ETF 로고 — 운용사 색상 원형 + 약자.
 * RiskWeather 종목 로고 패턴 모방.
 */
import { getEtfBrand } from '@/lib/etfBrand';

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export function EtfLogo({ name, size = 36, className }: Props) {
  const brand = getEtfBrand(name);
  return (
    <span
      className={className}
      style={{
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        background: brand.bg,
        color: brand.color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 800,
        letterSpacing: '-0.5px',
      }}
      aria-hidden="true"
    >
      {brand.letter}
    </span>
  );
}
