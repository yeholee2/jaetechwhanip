'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import SparringActiveCard from '@/components/sparring/SparringActiveCard';
import SparringPastCard from '@/components/sparring/SparringPastCard';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import type { Sparring } from '@/lib/sparring';
import { Section, Chip } from '@/components/ui';
import { TickerScroller } from '@/app/etf/TickerScroller';
import styles from './SparringPage.module.css';

type SortMode = 'default' | 'comments';

export default function SparringClient({ sparrings }: { sparrings: Sparring[] }) {
  const [category, setCategory] = useState('전체');
  const [sortMode, setSortMode] = useState<SortMode>('default');

  const activeSparrings = useMemo(
    () => sparrings.filter(item => item.status === 'active'),
    [sparrings],
  );
  const pastSparrings = useMemo(() => {
    const filtered = sparrings.filter(item => item.status !== 'active');
    const byCategory = category === '전체'
      ? filtered
      : filtered.filter(item => item.category === category);

    return [...byCategory].sort((a, b) => {
      if (sortMode === 'comments') return b.stats.comment_count - a.stats.comment_count;
      return b.round_number - a.round_number;
    });
  }, [category, sortMode, sparrings]);

  // 진행중 스파링 3개 초과 시 가로 스크롤(화살표 토글) — 시장 지수 ticker 패턴
  const useScroller = activeSparrings.length > 2;

  return (
    <AppShell active="sparring" wide hideSlogan>
      <main className={styles.page}>
        <Section title="진행중 스파링" sub={`${activeSparrings.length}개`}>
          {useScroller ? (
            <TickerScroller>
              {activeSparrings.map(sparring => (
                <div key={sparring.id} className={styles.activeScrollItem}>
                  <SparringActiveCard sparring={sparring} />
                </div>
              ))}
            </TickerScroller>
          ) : (
            <div className={styles.activeGrid} aria-label="진행중 스파링">
              {activeSparrings.map(sparring => (
                <SparringActiveCard key={sparring.id} sparring={sparring} />
              ))}
            </div>
          )}
        </Section>

        <Section title="지난 스파링" sub={`${pastSparrings.length}개`} className={styles.pastSection}>
          <div className={styles.filterRow}>
            <div className={styles.chips} aria-label="카테고리">
              {['전체', ...CATEGORY_DEFINITIONS.map(item => item.key)].map(item => (
                <Chip
                  key={item}
                  active={category === item}
                  size="sm"
                  onClick={() => setCategory(item)}
                >
                  {item === '전체' ? item : getCategoryLabel(item)}
                </Chip>
              ))}
            </div>
            <button
              className={styles.sortButton}
              type="button"
              onClick={() => setSortMode(sortMode === 'default' ? 'comments' : 'default')}
            >
              {sortMode === 'default' ? '기본순' : '토론 수'} ↑↓
            </button>
          </div>

          <div className={styles.pastList}>
            {pastSparrings.map(sparring => (
              <SparringPastCard key={sparring.id} sparring={sparring} />
            ))}
          </div>
        </Section>
      </main>
    </AppShell>
  );
}
