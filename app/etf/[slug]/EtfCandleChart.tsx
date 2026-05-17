'use client';

/**
 * ETF 캔들 차트 — ChartBlock 래퍼 + 그림 도구 토글.
 * /etf/[slug] 페이지에서 사용. (EtfChart 는 수익률 % 비교용 별도 컴포넌트)
 */

import { useState } from 'react';
import { ChartBlock, type Drawing } from '@/components/creator/ChartBlock';

export function EtfCandleChart({ code }: { code: string }) {
  const [drawMode, setDrawMode] = useState(false);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [tf, setTf] = useState<'5m' | '1d' | '1w' | '1mo' | '1y'>('1d');
  const [showMA, setShowMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  return (
    <section style={{ marginBottom: 20 }} aria-label="가격 차트">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: 'var(--rw-text-strong)', letterSpacing: '-0.3px' }}>
          가격 차트
        </h2>
        <button
          type="button"
          onClick={() => setDrawMode(m => !m)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 800,
            border: '1px solid var(--rw-border)',
            borderRadius: 8,
            background: drawMode ? 'var(--rw-primary-bg)' : 'transparent',
            color: drawMode ? 'var(--rw-primary)' : 'var(--rw-text-muted)',
            cursor: 'pointer',
          }}
          title="좌측에 그림 도구 툴바를 표시해요"
        >
          {drawMode ? '✓ 그림 도구' : '✏️ 그림 그리기'}
        </button>
      </div>
      <ChartBlock
        data={{ code, tf, type: 'candle', drawings, showMA, showVolume }}
        editable={drawMode}
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
