'use client';

/**
 * 페이지 하단 floating CTA 띠.
 * - 비로그인 사용자에게만 노출
 * - X 누르면 sessionStorage 에 dismiss 저장 (세션 동안 다시 안 뜸)
 * - 모바일: bottomNav 위로 띄움 (safe-area 고려)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './BottomPromoBar.module.css';

const DISMISS_KEY = 'etfhanip:bottom-promo-dismissed';

export function BottomPromoBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 세션 내 닫은 적 있으면 안 띄움
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === '1') return;
    } catch { /* ignore */ }

    // 비로그인일 때만 띄움
    if (!hasSupabase()) {
      setShow(true);
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) setShow(true);
    });
  }, []);

  const dismiss = () => {
    try { window.sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.bar} role="complementary" aria-label="가입 안내">
      <div className={styles.inner}>
        <p className={styles.copy}>
          <strong>주식 시작이 겁난다면,</strong>
          <span>ETF로 한입씩 건강하게 시작해보세요.</span>
        </p>
        <Link href="/auth" className={styles.cta}>
          ETF한입 무료 시작 →
        </Link>
        <button
          type="button"
          className={styles.close}
          onClick={dismiss}
          aria-label="닫기"
          title="이 세션 동안 다시 보지 않기"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
