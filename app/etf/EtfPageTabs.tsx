'use client';

/**
 * ETF 페이지 상단 탭 — 콘텐츠 위주: 발견 / 테마·전략 / 뉴스 / 전체 검색.
 * 유틸리티(비교/관심/진단) 는 발견 페이지 안 도구 행으로 이동.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listWatchedEtfCodes, subscribeWatchChanges } from '@/lib/etfWatch';
import styles from './EtfPageTabs.module.css';

export type EtfPageTab = 'discover' | 'themes' | 'news' | 'all'
  // legacy 호환 (소비처에서 active 로 넘어올 수 있음)
  | 'compare' | 'watch' | 'diagnostic' | 'feed';

const TABS: { key: EtfPageTab; label: string; href: string }[] = [
  { key: 'discover', label: '발견',     href: '/etf' },
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
        </Link>
      ))}
    </nav>
  );
}

/** 유틸리티 도구 행 — 비교/관심/진단 (발견 페이지 안에서 사용) */
export function EtfUtilityRow() {
  const [watchCount, setWatchCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    setWatchCount(listWatchedEtfCodes().length);
    return subscribeWatchChanges(codes => setWatchCount(codes.length));
  }, []);
  return (
    <div className={styles.utilRow} role="group" aria-label="ETF 도구">
      <Link href="/etf/compare" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">⚖️</span>
        <span className={styles.utilLabel}>
          <strong>ETF 비교</strong>
          <span>두 ETF 나란히</span>
        </span>
      </Link>
      <Link href="/etf?tab=watch" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">❤️</span>
        <span className={styles.utilLabel}>
          <strong>관심 ETF{mounted && watchCount > 0 ? ` (${watchCount})` : ''}</strong>
          <span>등록한 종목 추적</span>
        </span>
      </Link>
      <Link href="/portfolio" className={styles.util}>
        <span className={styles.utilIcon} aria-hidden="true">📊</span>
        <span className={styles.utilLabel}>
          <strong>포트폴리오 진단</strong>
          <span>섹터·환·보수 분석</span>
        </span>
      </Link>
    </div>
  );
}
