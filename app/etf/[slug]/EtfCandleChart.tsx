'use client';

/**
 * ETF 캔들 차트 — ChartBlock 래퍼. 깔끔한 차트 + 기간/MA/거래량 토글만.
 * 그리기 도구는 일반 사용자에게 노이즈라 제거 (admin 도구는 크리에이터 글 작성 페이지에서).
 * /etf/[slug] 페이지에서 사용. (EtfChart 는 수익률 % 비교용 별도 컴포넌트)
 */

import { useState } from 'react';
import { ChartBlock } from '@/components/creator/ChartBlock';

export function EtfCandleChart({ code }: { code: string }) {
  const [tf, setTf] = useState<'5m' | '1d' | '1w' | '1mo' | '1y'>('1d');
  const [showMA, setShowMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);

  return (
    <section style={{ marginBottom: 20 }} aria-label="가격 차트">
      <h2 style={{
        margin: '0 0 8px',
        fontSize: 17,
        fontWeight: 900,
        color: 'var(--rw-text-strong)',
        letterSpacing: '-0.3px',
      }}>
        가격 차트
      </h2>
      <ChartBlock
        data={{ code, tf, type: 'candle', drawings: [], showMA, showVolume }}
        editable={false}
        showCode={false}
        onChange={next => {
          if (next.tf) setTf(next.tf);
          if (next.showMA !== undefined) setShowMA(next.showMA);
          if (next.showVolume !== undefined) setShowVolume(next.showVolume);
        }}
      />
    </section>
  );
}
