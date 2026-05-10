'use client';

import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
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
  const totalVotes = useMemo(
    () => sparrings.reduce((sum, item) => sum + item.stats.votes_total, 0),
    [sparrings],
  );
  const totalComments = useMemo(
    () => sparrings.reduce((sum, item) => sum + item.stats.comment_count, 0),
    [sparrings],
  );
  const latestRound = useMemo(
    () => sparrings.reduce((max, item) => Math.max(max, item.round_number), 0),
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
          <span className={styles.eyebrow}>머니 스파링</span>
          <h1>스파링</h1>
          <p>재테크 결정, 바로 고르기 전에 찬반 의견으로 먼저 검증해요.</p>
          <div className={styles.statLine} aria-label="스파링 현황">
            <span><strong>{activeSparrings.length}</strong>개 진행중</span>
            <span><strong>{totalVotes.toLocaleString('ko-KR')}</strong>표 누적</span>
            <span><strong>{totalComments.toLocaleString('ko-KR')}</strong>개 토론</span>
            <span><strong>{latestRound}</strong> 라운드</span>
          </div>
        </header>

        <div className={styles.sectionHead}>
          <div>
            <span>진행중 스파링</span>
            <h2>지금 의견이 갈리는 돈 결정</h2>
          </div>
          <p>투표한 뒤 댓글로 판단 근거를 남길 수 있어요.</p>
        </div>
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
              <FaIcon name="arrow-down-up-across-line" size={14} />
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
                {item === '전체' ? item : getCategoryLabel(item)}
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
