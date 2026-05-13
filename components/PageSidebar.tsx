'use client';

/**
 * PC 페이지 우측 사이드바 — 페이지별 컨텍스트 위젯.
 *
 * 사용 예:
 *   <PageSidebar widgets={['watch', 'etf-nav', 'sparring']} />
 *
 * 위젯 종류:
 * - 'watch'      : 내 관심 ETF (HomeWatchWidget)
 * - 'etf-nav'    : ETF 영역 내부 네비 (발견/관심/진단/테마/뉴스/검색/비교)
 * - 'sparring'   : 진행 중 핫 스파링 (SparringMiniCard)
 * - 'help'       : 검색·질문 도움말
 */

import Link from 'next/link';
import { HomeWatchWidget } from './HomeWatchWidget';
import SparringMiniCard from './sparring/SparringMiniCard';
import type { Sparring } from '@/lib/sparring';
import styles from './PageSidebar.module.css';

export type SidebarWidget = 'watch' | 'etf-nav' | 'sparring' | 'help';

export function PageSidebar({
  widgets,
  featuredSparring,
}: {
  widgets: SidebarWidget[];
  featuredSparring?: Sparring | null;
}) {
  return (
    <aside className="pc-layout-side">
      {widgets.includes('sparring') && featuredSparring !== undefined && (
        <SparringMiniCard sparring={featuredSparring} />
      )}
      {widgets.includes('watch') && <HomeWatchWidget />}
      {widgets.includes('etf-nav') && <EtfNavWidget />}
      {widgets.includes('help') && <HelpWidget />}
    </aside>
  );
}

function EtfNavWidget() {
  return (
    <div className={styles.widget}>
      <div className={styles.head}>ETF 메뉴</div>
      <ul className={styles.navList}>
        <li><Link href="/etf">발견</Link></li>
        <li><Link href="/etf?tab=watch">관심 ETF</Link></li>
        <li><Link href="/etf?tab=diagnostic">포트폴리오 진단</Link></li>
        <li><Link href="/etf/all">전체 검색</Link></li>
        <li><Link href="/etf/compare">ETF 비교</Link></li>
        <li><Link href="/etf/themes">테마 · 전략</Link></li>
        <li><Link href="/etf/news">뉴스</Link></li>
      </ul>
    </div>
  );
}

function HelpWidget() {
  return (
    <div className={styles.widget}>
      <div className={styles.head}>도움이 필요해요?</div>
      <p className={styles.helpBody}>
        ETF가 처음이거나 헷갈리는 게 있다면 질문으로 남겨보세요.
      </p>
      <Link href="/?ask=1" className={styles.helpCta}>질문하기 →</Link>
    </div>
  );
}
