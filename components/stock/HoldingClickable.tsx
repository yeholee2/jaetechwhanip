'use client';

/**
 * ETF holding row 클릭 → 종목 상세 모달.
 *
 * 서버에서 렌더한 holdings 리스트의 각 row 를 이걸로 감싸기만 하면 됨.
 */

import { useState } from 'react';
import { StockDetailModal } from './StockDetailModal';
import styles from './HoldingClickable.module.css';

export function HoldingClickable({
  symbol,
  displayName,
  className,
  children,
}: {
  symbol: string;
  displayName?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${styles.btn} ${className || ''}`}
        aria-label={`${displayName || symbol} 상세 보기`}
      >
        {children}
      </button>
      {open && <StockDetailModal symbol={symbol} displayName={displayName} onClose={() => setOpen(false)} />}
    </>
  );
}
