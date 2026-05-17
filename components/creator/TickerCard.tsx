'use client';

/**
 * 본문 안에 들어가는 종목 미니 카드.
 *
 * 클라이언트에서 /api/quote/{code} 페치 → 가격·등락률 표시.
 * 등락 색: 한국 증시 관습 (상승 = 빨강, 하락 = 파랑).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './TickerCard.module.css';

type Quote = {
  symbol: string;
  name?: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  source: string;
  delayed: boolean;
  fetchedAt: string;
};

type Props = {
  code: string;
  editable?: boolean;
  onRemove?: () => void;
};

export function TickerCard({ code, editable = false, onRemove }: Props) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    (async () => {
      try {
        const r = await fetch(`/api/quote/${encodeURIComponent(code)}`);
        if (!r.ok) {
          if (!cancelled) setErr('시세 불러오기 실패');
          return;
        }
        const j = (await r.json()) as Quote;
        if (!cancelled) setQuote(j);
      } catch {
        if (!cancelled) setErr('네트워크 에러');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const isKr = /^[0-9]{6}$/.test(code);
  const stockHref = `/stock/${encodeURIComponent(code)}`;

  if (!code) {
    return (
      <div className={`${styles.card} ${styles.error}`}>
        <span>종목 코드가 비었어요</span>
        {editable && onRemove && (
          <button type="button" className={styles.remove} onClick={onRemove} aria-label="제거">×</button>
        )}
      </div>
    );
  }

  const up = (quote?.change ?? 0) > 0;
  const down = (quote?.change ?? 0) < 0;
  const sign = up ? '+' : down ? '' : '';

  return (
    <Link
      href={stockHref}
      className={styles.card}
      target={editable ? undefined : '_blank'}
      rel="noopener noreferrer"
      onClick={editable ? (e) => e.preventDefault() : undefined}
    >
      <div className={styles.left}>
        <span className={styles.flag} aria-hidden>{isKr ? '🇰🇷' : '🇺🇸'}</span>
        <div className={styles.info}>
          <strong className={styles.code}>{code}</strong>
          {quote?.name && <span className={styles.name}>{quote.name}</span>}
        </div>
      </div>
      <div className={styles.right}>
        {loading ? (
          <span className={styles.loading}>로딩…</span>
        ) : err ? (
          <span className={styles.errText}>{err}</span>
        ) : quote ? (
          <>
            <span className={styles.price}>
              {quote.currency === 'KRW'
                ? `${Math.round(quote.price).toLocaleString()}원`
                : `$${quote.price.toFixed(2)}`}
            </span>
            <span
              className={`${styles.change} ${up ? styles.up : down ? styles.down : ''}`}
            >
              {sign}{quote.change.toFixed(2)} ({sign}{(quote.changePercent * 100).toFixed(2)}%)
            </span>
            {quote.delayed && <span className={styles.delayed}>지연</span>}
          </>
        ) : null}
      </div>
      {editable && onRemove && (
        <button
          type="button"
          className={styles.remove}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
          aria-label="종목 카드 제거"
        >
          ×
        </button>
      )}
    </Link>
  );
}
