import Link from 'next/link';
import styles from './EtfTabs.module.css';

export type EtfTab = 'browse' | 'portfolio' | 'alerts' | 'ai';

const TABS: { key: EtfTab; label: string; href: string }[] = [
  { key: 'browse', label: '둘러보기', href: '/etf' },
  { key: 'portfolio', label: '내 포트폴리오', href: '/etf?tab=portfolio' },
  { key: 'alerts', label: '알림·캘린더', href: '/etf?tab=alerts' },
  { key: 'ai', label: 'AI 인사이트', href: '/etf?tab=ai' },
];

export function EtfTabs({ active }: { active: EtfTab }) {
  return (
    <nav className={styles.tabs} aria-label="ETF 섹션">
      {TABS.map(tab => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`${styles.tab} ${active === tab.key ? styles.active : ''}`}
          aria-current={active === tab.key ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

export function parseEtfTab(searchParams?: Record<string, string | string[] | undefined>): EtfTab {
  const raw = searchParams?.tab;
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (val === 'portfolio' || val === 'alerts' || val === 'ai') return val;
  return 'browse';
}
