'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import SparringActiveCard from '@/components/sparring/SparringActiveCard';
import SparringPastCard from '@/components/sparring/SparringPastCard';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import type { Sparring } from '@/lib/sparring';
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

  return (
    <AppShell active="sparring" wide hideSlogan>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>스파링</h1>
          <p>뜨거운 돈 논쟁에 대해 투표하고 토론하기</p>
        </header>

        <section className={styles.activeGrid} aria-label="진행중 스파링">
          {activeSparrings.map(sparring => (
            <SparringActiveCard key={sparring.id} sparring={sparring} />
          ))}
        </section>

        <section className={styles.pastSection}>
          <div className={styles.pastHead}>
            <h2>지난 스파링 {pastSparrings.length}</h2>
          </div>

          <div className={styles.chips} aria-label="카테고리">
            {['전체', ...CATEGORY_DEFINITIONS.map(item => item.key)].map(item => (
              <button
                key={item}
                className={category === item ? styles.chipOn : ''}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item === '전체' ? item : getCategoryLabel(item)}
              </button>
            ))}
          </div>
          <button
            className={styles.sortButton}
            type="button"
            onClick={() => setSortMode(sortMode === 'default' ? 'comments' : 'default')}
          >
            {sortMode === 'default' ? '기본순' : '토론 수'} ↑↓
          </button>

          <div className={styles.pastList}>
            {pastSparrings.map(sparring => (
              <SparringPastCard key={sparring.id} sparring={sparring} />
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
