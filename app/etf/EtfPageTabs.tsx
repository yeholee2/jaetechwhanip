'use client';

/**
 * ETF 페이지 상단 탭.
 * 홈은 오늘 흐름, 조건검색은 스크리너로 분리한다.
 */
import Link from 'next/link';
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
