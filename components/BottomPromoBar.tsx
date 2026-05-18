'use client';

/**
 * 페이지 하단 floating CTA 띠.
 * - 비로그인 사용자에게만 노출
 * - X 누르면 localStorage에 timestamp 저장 (7일 동안 다시 안 뜸)
 * - ETF 상세·질문 상세·마이페이지 등 콘텐츠 페이지에선 미노출 (방해 방지)
 * - 첫 진입 3초 뒤 슬며시 등장 (첫인상 방해 최소화)
 * - 모바일: bottomNav 위로 띄움 (safe-area 고려)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './BottomPromoBar.module.css';

/** 이 경로 패턴에선 banner 안 띄움 */
const SUPPRESS_ON: RegExp[] = [
  /^\/etf\/[^/]+$/,     // ETF 상세
  /^\/q\/[^/]+$/,        // 질문 상세
  /^\/mypage/,           // 마이페이지
  /^\/admin/,            // 어드민
  /^\/auth/,             // 로그인
  /^\/sparring\/[^/]+$/, // 스파링 상세
];

const DISMISS_KEY = 'etfhanip:bottom-promo-dismissed-at';
const DISMISS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7일

export function BottomPromoBar() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 콘텐츠 페이지에선 띄우지 않음
    if (pathname && SUPPRESS_ON.some(re => re.test(pathname))) return;

    // 닫은 지 7일 이내면 안 띄움 (localStorage라 브라우저 닫아도 유지)
    try {
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || '0');
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_EXPIRY_MS) return;
    } catch { /* ignore */ }

    // 비로그인일 때만 띄움 (3초 뒤 슬며시 — 첫인상 방해 최소화)
    const showLater = () => setTimeout(() => setShow(true), 3000);
    if (!hasSupabase()) { showLater(); return; }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) showLater();
    });
  }, [pathname]);

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.bar} role="complementary" aria-label="가입 안내">
      <div className={styles.inner}>
        <p className={styles.copy}>
          <strong>재테크 고민이 있다면,</strong>
          <span>질문하고, ETF 찾고, 포트폴리오까지 한 곳에서.</span>
        </p>
        <Link href="/auth" className={styles.cta}>
          재테크한입 무료 시작 →
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
