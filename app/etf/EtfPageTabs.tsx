'use client';

/**
 * RW 페이지 상단 탭 — 발견 / 관심 / 진단 / 피드.
 * 관심 탭에는 등록 개수 뱃지가 자동으로 붙음.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listWatchedEtfCodes, subscribeWatchChanges } from '@/lib/etfWatch';
import styles from './EtfPageTabs.module.css';

export type EtfPageTab = 'discover' | 'watch' | 'diagnostic' | 'feed';

const TABS: { key: EtfPageTab; label: string; href: string; dot?: boolean }[] = [
  { key: 'discover', label: '발견', href: '/etf' },
  { key: 'watch', label: '관심', href: '/etf?tab=watch' },
  { key: 'diagnostic', label: '진단', href: '/etf?tab=diagnostic' },
  { key: 'feed', label: '피드', href: '/etf?tab=feed', dot: true },
];

export function EtfPageTabs({ active = 'discover' }: { active?: EtfPageTab }) {
  const [watchCount, setWatchCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatchCount(listWatchedEtfCodes().length);
    return subscribeWatchChanges(codes => setWatchCount(codes.length));
  }, []);

  return (
    <nav className={styles.tabs} aria-label="ETF 섹션">
      {TABS.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={`${styles.tab} ${active === t.key ? styles.active : ''}`}
        >
          {t.label}
          {t.key === 'watch' && mounted && watchCount > 0 && (
            <span className={styles.count}>{watchCount}</span>
          )}
          {t.dot && <span className={styles.dot} aria-hidden="true" />}
        </Link>
      ))}
    </nav>
  );
}
