'use client';

import { useEffect } from 'react';
import { pushRecentEtfSlug } from '@/lib/recentActivity';

/**
 * ETF 상세 페이지 마운트 시 최근 본 ETF 목록에 slug 기록.
 * 서버 컴포넌트(/etf/[slug]/page.tsx)에서 한 줄로 마운트.
 */
export function RecordEtfView({ slug }: { slug: string }) {
  useEffect(() => {
    pushRecentEtfSlug(slug);
  }, [slug]);
  return null;
}
