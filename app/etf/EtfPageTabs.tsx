'use client';

/**
 * ETF 페이지 상단 탭 — 콘텐츠 위주: 발견 / 테마·전략 / 뉴스 / 전체 검색.
 * 유틸리티(비교/관심/진단) 는 발견 페이지 안 도구 행으로 이동.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaIcon } from '@/components/FaIcon';
import { listWatchedEtfCodes, subscribeWatchChanges } from '@/lib/etfWatch';
import { listRecentEtfSlugs } from '@/lib/recentActivity';
import styles from './EtfPageTabs.module.css';

export type EtfPageTab = 'discover' | 'themes' | 'trending' | 'news' | 'all'
  // legacy 호환 (소비처에서 active 로 넘어올 수 있음)
  | 'compare' | 'watch' | 'diagnostic' | 'feed';

const TABS: { key: EtfPageTab; label: string; href: string; badge?: string }[] = [
  { key: 'discover', label: '발견',     href: '/etf' },
  { key: 'watch',    label: '저장',     href: '/etf?tab=watch' },
  { key: 'trending', label: '핫한 ETF', href: '/etf/trending', badge: 'AI' },
  { key: 'themes',   label: '테마·전략', href: '/etf/themes' },
  { key: 'news',     label: '뉴스',     href: '/etf/news' },
  { key: 'all',      label: '전체 검색', href: '/etf/all' },
];

export function EtfPageTabs({ active = 'discover' }: { active?: EtfPageTab }) {
  return (
    <nav className={styles.tabs} aria-label="ETF 섹션">
      {TABS.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={`${styles.tab} ${active === t.key ? styles.active : ''}`}
        >
          {t.label}
          {t.badge && <span className={styles.tabBadge}>{t.badge}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** 유틸리티 도구 행 — 찾기/비교 2개. 최근·관심은 우측 사이드, 진단은 MY포트폴리오로 통합. */
export function EtfUtilityRow() {
  return (
    <div className={styles.utilRow} role="group" aria-label="ETF 도구">
      <Link href="/etf/all" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">
          <FaIcon name="magnifying-glass" size={15} />
        </span>
        <span className={styles.utilLabel}>
          <strong>ETF 찾기</strong>
          <span>코드·테마 검색</span>
        </span>
      </Link>
      <Link href="/etf/compare" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">
          <FaIcon name="scale-balanced" size={15} />
        </span>
        <span className={styles.utilLabel}>
          <strong>비교</strong>
          <span>보수·순자산</span>
        </span>
      </Link>
    </div>
  );
}
