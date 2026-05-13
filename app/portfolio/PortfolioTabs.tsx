'use client';

/**
 * MY 포트폴리오 — 3개 탭 네비.
 *   build : 직접 포트폴리오 만들기 (진단)
 *   copy  : 대가의 포트폴리오 만들기 (템플릿/13F)
 *   lab   : 실험실 (백테스트·시뮬레이션 — 베타)
 *
 * URL 쿼리스트링으로 상태 유지 (서버 렌더와 호환).
 */

import Link from 'next/link';
import styles from './PortfolioTabs.module.css';

export type PortfolioTab = 'build' | 'copy' | 'lab';

const TABS: { key: PortfolioTab; label: string; sub: string; href: string; beta?: boolean }[] = [
  { key: 'build', label: '직접 만들기',   sub: '내 ETF 입력 · 진단',    href: '/portfolio' },
  { key: 'copy',  label: '대가 따라하기', sub: '버핏 · 달리오 · 13F',   href: '/portfolio?tab=copy' },
  { key: 'lab',   label: '실험실',        sub: '백테스트 · 시뮬레이션', href: '/portfolio?tab=lab', beta: true },
];

export function PortfolioTabs({ active }: { active: PortfolioTab }) {
  return (
    <nav className={styles.tabs} aria-label="MY 포트폴리오 섹션">
      {TABS.map(t => (
        <Link
          key={t.key}
          href={t.href}
          className={`${styles.tab} ${active === t.key ? styles.active : ''}`}
          aria-current={active === t.key ? 'page' : undefined}
        >
          <span className={styles.tabHead}>
            {t.label}
            {t.beta && <span className={styles.beta}>β</span>}
          </span>
          <span className={styles.tabSub}>{t.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
