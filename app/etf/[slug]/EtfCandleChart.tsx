'use client';

/**
 * ETF 캔들 차트 — ChartBlock 래퍼. 업비트/빗썸 스타일 — 그림 도구 toolbar 항상 표시.
 * /etf/[slug] 페이지에서 사용. (EtfChart 는 수익률 % 비교용 별도 컴포넌트)
 */

import { useEffect, useState } from 'react';
import { ChartBlock, type Drawing } from '@/components/creator/ChartBlock';

export function EtfCandleChart({ code }: { code: string }) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tf, setTf] = useState<'5m' | '1d' | '1w' | '1mo' | '1y'>('1d');
  const [showMA, setShowMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  // drawings localStorage 영속화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(`chart-drawings:${code}`);
      if (raw) setDrawings(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [code]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (drawings.length > 0) localStorage.setItem(`chart-drawings:${code}`, JSON.stringify(drawings));
      else localStorage.removeItem(`chart-drawings:${code}`);
    } catch { /* ignore */ }
  }, [drawings, code]);

  return (
    <section style={{ marginBottom: 20 }} aria-label="가격 차트">
      <h2 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 900, color: 'var(--rw-text-strong)', letterSpacing: '-0.3px' }}>
        가격 차트
      </h2>
      <ChartBlock
        data={{ code, tf, type: 'candle', drawings, showMA, showVolume }}
        editable
        onChange={next => {
          if (next.tf) setTf(next.tf);
          if (next.showMA !== undefined) setShowMA(next.showMA);
          if (next.showVolume !== undefined) setShowVolume(next.showVolume);
          setDrawings(next.drawings);
        }}
      />
    </section>
  );
}
