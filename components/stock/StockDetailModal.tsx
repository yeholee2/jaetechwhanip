'use client';

/**
 * 종목 상세 모달 — ETF 구성종목 클릭 시 뜸.
 * 본체는 StockDetailView 재사용.
 */

import { useEffect } from 'react';
import { StockDetailView } from './StockDetailView';
import styles from './StockDetailModal.module.css';

export function StockDetailModal({
  symbol,
  displayName,
  onClose,
}: {
  symbol: string;
  displayName?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">×</button>
        <StockDetailView
          symbol={symbol}
          displayName={displayName}
          onLinkClick={onClose}
          showShareLink
        />
      </div>
    </div>
  );
}
