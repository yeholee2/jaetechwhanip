'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

/**
 * 페이지뷰 자동 트래킹.
 * Next.js App Router에서 usePathname 변경 시마다 발화.
 * app/layout.tsx 에 한 번 mount.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    trackEvent({ kind: 'page_view', path: pathname });
  }, [pathname]);

  return null;
}
