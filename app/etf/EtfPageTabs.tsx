/**
 * RW 페이지 상단 탭 — 발견 / 관심 / 진단 / 피드.
 * 클릭 시 페이지 내 섹션 이동 또는 별도 라우트 (Phase 추가 시).
 */
import Link from 'next/link';
import styles from './EtfPageTabs.module.css';

export type EtfPageTab = 'discover' | 'watch' | 'diagnostic' | 'feed';

const TABS: { key: EtfPageTab; label: string; href: string; dot?: boolean }[] = [
  { key: 'discover', label: '발견', href: '/etf' },
  { key: 'watch', label: '관심', href: '/etf?tab=watch' },
  { key: 'diagnostic', label: '진단', href: '/etf?tab=diagnostic' },
  { key: 'feed', label: '피드', href: '/etf?tab=feed', dot: true },
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
          {t.dot && <span className={styles.dot} aria-hidden="true" />}
        </Link>
      ))}
    </nav>
  );
}
