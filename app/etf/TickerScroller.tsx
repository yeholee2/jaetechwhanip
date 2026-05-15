'use client';

/**
 * Ticker 가로 스크롤 + 좌/우 화살표.
 * - 끝까지 가면 해당 방향 버튼 자동 숨김
 * - children 으로 ticker item 받아서 그대로 렌더
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './MarketTicker.module.css';

const NUDGE = 260; // px per click

export function TickerScroller({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateEdges = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = wrapRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges]);

  const nudge = (dir: -1 | 1) => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * NUDGE, behavior: 'smooth' });
  };

  return (
    <div className={styles.scrollerHost}>
      {canLeft && (
        <button
          type="button"
          aria-label="왼쪽으로"
          className={`${styles.navBtn} ${styles.navBtnL}`}
          onClick={() => nudge(-1)}
        >
          ‹
        </button>
      )}
      <div ref={wrapRef} className={styles.scrollWrap}>
        <div className={styles.row}>{children}</div>
      </div>
      {canRight && (
        <button
          type="button"
          aria-label="오른쪽으로"
          className={`${styles.navBtn} ${styles.navBtnR}`}
          onClick={() => nudge(1)}
        >
          ›
        </button>
      )}
    </div>
  );
}
