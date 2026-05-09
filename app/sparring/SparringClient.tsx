'use client';

import { useMemo, useState } from 'react';
import { BarChart3, MessageCircle, Swords, Timer } from 'lucide-react';
import { AppShell, UnifiedFilterBar } from '@/components/AppShell';
import { SparringCard } from '@/components/SparringCard';
import { CATEGORY_FILTERS, SPARRING_TABS } from '@/lib/ia';
import type { Sparring } from '@/lib/sparrings';
import styles from './SparringPage.module.css';

export default function SparringClient({ initialSparrings }: { initialSparrings: Sparring[] }) {
  const [activeTab, setActiveTab] = useState('ongoing');
  const [activeCategory, setActiveCategory] = useState('전체');

  const filtered = useMemo(() => {
    return initialSparrings.filter(item => {
      const tabMatch = activeTab === 'ongoing'
        ? item.status === 'active'
        : activeTab === 'closed'
          ? item.status === 'closed'
          : item.status === 'active';
      const categoryMatch = activeCategory === '전체' || item.category === activeCategory;
      return tabMatch && categoryMatch;
    });
  }, [activeCategory, activeTab, initialSparrings]);

  const totals = useMemo(() => {
    return initialSparrings.reduce((acc, item) => {
      acc.votes += item.stats.votesA + item.stats.votesB;
      acc.comments += item.stats.commentsA + item.stats.commentsB;
      if (item.status === 'active') acc.active += 1;
      return acc;
    }, { active: 0, votes: 0, comments: 0 });
  }, [initialSparrings]);

  return (
    <AppShell active="sparring">
      <section className={styles.header}>
        <div>
          <span className={styles.eyebrow}><Swords size={15} /> 스파링</span>
          <h1>돈 결정, 바로 지르기 전에 한 판 붙어보기</h1>
          <p>찬성 쪽과 반대 쪽을 같이 세워두고, 내가 놓친 리스크를 먼저 확인해요.</p>
        </div>
      </section>

      <UnifiedFilterBar
        tabs={SPARRING_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        categories={CATEGORY_FILTERS}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <section className={styles.summary} aria-label="스파링 현황">
        <div>
          <Timer size={18} />
          <span>진행중</span>
          <strong>{totals.active}</strong>
        </div>
        <div>
          <BarChart3 size={18} />
          <span>누적 투표</span>
          <strong>{totals.votes}</strong>
        </div>
        <div>
          <MessageCircle size={18} />
          <span>토론 의견</span>
          <strong>{totals.comments}</strong>
        </div>
      </section>

      <section className={styles.cardGrid} aria-label="스파링 라운드">
        {filtered.map(sparring => (
          <SparringCard key={sparring.id} sparring={sparring} />
        ))}
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <strong>아직 열린 라운드가 없어요.</strong>
            <p>다른 카테고리나 진행중 탭에서 스파링을 확인해 보세요.</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
