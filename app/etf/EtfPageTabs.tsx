'use client';

/**
 * ETF 페이지 상단 탭.
 * 홈은 오늘 흐름, 조건검색은 스크리너로 분리한다.
 */
import Link from 'next/link';
import { FaIcon } from '@/components/FaIcon';
import styles from './EtfPageTabs.module.css';

export type EtfPageTab = 'discover' | 'screener' | 'themes' | 'trending' | 'news' | 'all'
  // legacy 호환 (소비처에서 active 로 넘어올 수 있음)
  | 'compare' | 'watch' | 'diagnostic' | 'feed';

const TABS: { key: EtfPageTab; label: string; href: string; badge?: string }[] = [
  { key: 'discover', label: '오늘', href: '/etf' },
  { key: 'screener', label: '스크리너', href: '/etf/screener' },
  { key: 'watch', label: '저장', href: '/etf?tab=watch' },
  { key: 'compare', label: '비교', href: '/etf/compare' },
  { key: 'news', label: '뉴스', href: '/etf/news' },
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

/** 유틸리티 도구 행 — 오늘 흐름에서 바로 이어지는 핵심 도구. */
export function EtfUtilityRow() {
  return (
    <div className={styles.utilRow} role="group" aria-label="ETF 도구">
      <Link href="/etf/screener" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">
          <FaIcon name="magnifying-glass" size={15} />
        </span>
        <span className={styles.utilLabel}>
          <strong>스크리너</strong>
          <span>조건으로 ETF 찾기</span>
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
