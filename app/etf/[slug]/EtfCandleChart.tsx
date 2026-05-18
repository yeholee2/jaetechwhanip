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
  // 그리기 모드 — 기본 OFF (일반 사용자에게 11개 그리기 도구는 노이즈)
  const [drawMode, setDrawMode] = useState(false);

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '0 0 8px',
        gap: 12,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 17,
          fontWeight: 900,
          color: 'var(--rw-text-strong)',
          letterSpacing: '-0.3px',
        }}>
          가격 차트
        </h2>
        <button
          type="button"
          onClick={() => setDrawMode(v => !v)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            borderRadius: 999,
            border: drawMode ? '1.5px solid var(--rw-primary)' : '1px solid var(--rw-hairline)',
            background: drawMode ? 'var(--rw-primary-bg)' : 'transparent',
            color: drawMode ? 'var(--rw-primary)' : 'var(--rw-text-muted)',
            cursor: 'pointer',
            transition: 'all .12s',
          }}
          title={drawMode ? '그리기 종료' : '추세선·하이라이트 그리기'}
        >
          {drawMode ? '✓ 그리기 모드' : '✏️ 그리기'}
        </button>
      </div>
      <ChartBlock
        data={{ code, tf, type: 'candle', drawings, showMA, showVolume }}
        editable={drawMode}
        showCode={false}
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
