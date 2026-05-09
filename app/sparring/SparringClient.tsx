'use client';

import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import SparringActiveCard from '@/components/sparring/SparringActiveCard';
import SparringPastCard from '@/components/sparring/SparringPastCard';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
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
    <AppShell active="sparring" wide>
      <main className={styles.page}>
        <header className={styles.header}>
          <h1>스파링</h1>
          <p>재테크 결정, 토론으로 검증해요</p>
        </header>

        <section className={styles.activeGrid} aria-label="진행중 스파링">
          {activeSparrings.map(sparring => (
            <SparringActiveCard key={sparring.id} sparring={sparring} />
          ))}
        </section>

        <section className={styles.pastSection}>
          <div className={styles.pastHead}>
            <h2>지난 스파링 {pastSparrings.length}</h2>
            <button
              className={styles.sortButton}
              type="button"
              onClick={() => setSortMode(sortMode === 'default' ? 'comments' : 'default')}
            >
              <ArrowDownUp size={15} />
              {sortMode === 'default' ? '기본순' : '토론 수'}
            </button>
          </div>

          <div className={styles.chips} aria-label="카테고리">
            {['전체', ...CATEGORY_DEFINITIONS.map(item => item.key)].map(item => (
              <button
                key={item}
                className={category === item ? styles.chipOn : ''}
                type="button"
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

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
