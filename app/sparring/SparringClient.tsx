'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import SparringActiveCard from '@/components/sparring/SparringActiveCard';
import SparringPastCard from '@/components/sparring/SparringPastCard';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import type { Sparring } from '@/lib/sparring';
import { PageHero, Section, Chip, Badge } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
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
      <main className="pc-layout">
        <div className="pc-layout-main">
        <PageHero
          eyebrow="머니 스파링"
          title="결정하기 전에, 찬반으로 먼저 검증해요"
          lead="ETF·세금·보험 — 헷갈리는 선택을 라운드로 가린 뒤 모두의 의견을 들어봐요."
          aside={<Badge tone="primary">{activeSparrings.length}개 진행중</Badge>}
        />

        <Section title="진행중 스파링" sub={`${activeSparrings.length}개`}>
          <div className={styles.activeGrid} aria-label="진행중 스파링">
            {activeSparrings.map(sparring => (
              <SparringActiveCard key={sparring.id} sparring={sparring} />
            ))}
          </div>
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
        </div>
        <PageSidebar widgets={['watch', 'help']} />
      </main>
    </AppShell>
  );
}
