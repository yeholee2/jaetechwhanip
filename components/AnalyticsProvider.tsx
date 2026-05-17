'use client';

/**
 * PostHog 분석 — 사용자 행동 + 페이지뷰 자동 추적.
 *
 * 활성 조건: NEXT_PUBLIC_POSTHOG_KEY 환경변수 존재 시만.
 * 키 없으면 NOP (베타 기간 또는 dev).
 */

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 초기화
  useEffect(() => {
    if (!KEY) return;
    if (initialized) return;
    if (typeof window === 'undefined') return;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false, // 수동 (App Router 라우팅에 맞게)
      capture_pageleave: true,
      person_profiles: 'identified_only',
      autocapture: {
        // 민감 정보 자동 캡처 방지
        element_attribute_ignorelist: ['data-private'],
      },
    });
    initialized = true;
  }, []);

  // 페이지뷰 추적
  useEffect(() => {
    if (!KEY || !initialized) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

/** 외부에서 이벤트 추적 시 사용 */
export function track(event: string, props?: Record<string, any>) {
  if (!KEY || !initialized) return;
  posthog.capture(event, props);
}

export function identify(userId: string, traits?: Record<string, any>) {
  if (!KEY || !initialized) return;
  posthog.identify(userId, traits);
}

export function reset() {
  if (!KEY || !initialized) return;
  posthog.reset();
}
