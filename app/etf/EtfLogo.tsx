/**
 * ETF 로고 — 종목코드 기반 실제 로고 이미지 (토스인베스트 CDN).
 * 이미지 로드 실패 시 운용사 컬러 원형 fallback.
 */
'use client';

import { useState } from 'react';
import { getEtfBrand } from '@/lib/etfBrand';

const TOSS_CDN = 'https://thumb.tossinvest.com/image/resized/96x0/https%3A%2F%2Fstatic.toss.im%2Fpng-icons%2Fsecurities%2Ficn-sec-fill-';

type Props = {
  name: string;
  code?: string;
  size?: number;
  className?: string;
};

export function EtfLogo({ name, code, size = 36, className }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const brand = getEtfBrand(name);

  const sharedStyle: React.CSSProperties = {
    flexShrink: 0,
    width: size,
    height: size,
    borderRadius: '50%',
  };

  if (code && !imgFailed) {
    return (
      <img
        src={`${TOSS_CDN}${code}.png`}
        alt={name}
        className={className}
        style={{ ...sharedStyle, objectFit: 'cover', display: 'block' }}
        onError={() => setImgFailed(true)}
        aria-hidden="true"
      />
    );
  }

  return (
    <span
      className={className}
      style={{
        ...sharedStyle,
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
