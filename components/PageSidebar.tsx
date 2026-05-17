'use client';

/**
 * PC 페이지 우측 사이드바 — 페이지별 컨텍스트 위젯.
 *
 * 사용 예:
 *   <PageSidebar widgets={['watch', 'sparring']} />
 *
 * 위젯 종류:
 * - 'watch'      : 내 관심 ETF (HomeWatchWidget)
 * - 'sparring'   : 진행 중 핫 스파링 (SparringMiniCard)
 * - 'help'       : 검색·질문 도움말
 */

import Link from 'next/link';
import { HomeWatchWidget } from './HomeWatchWidget';
import SparringMiniCard from './sparring/SparringMiniCard';
import type { Sparring } from '@/lib/sparring';
import styles from './PageSidebar.module.css';

export type SidebarWidget = 'watch' | 'sparring' | 'help';

export function PageSidebar({
  widgets,
  featuredSparring,
}: {
  widgets: SidebarWidget[];
  featuredSparring?: Sparring | null;
}) {
  return (
    <aside className="pc-layout-side">
      {widgets.map(w => {
        if (w === 'sparring') {
          return featuredSparring !== undefined
            ? <SparringMiniCard key="sparring" sparring={featuredSparring} />
            : null;
        }
        if (w === 'watch') return <HomeWatchWidget key="watch" />;
        if (w === 'help') return <HelpWidget key="help" />;
        return null;
      })}
    </aside>
  );
}

// EtfNavWidget 제거 — 상단 탭 (발견/비교/관심/진단) 에 통합됨

function HelpWidget() {
  return (
    <div className={styles.widget}>
      <div className={styles.head}>도움이 필요해요?</div>
      <p className={styles.helpBody}>
        ETF가 처음이거나 헷갈리는 게 있다면 질문으로 남겨보세요.
      </p>
      <Link href="/questions/create" className={styles.helpCta}>질문하기 →</Link>
    </div>
  );
}
