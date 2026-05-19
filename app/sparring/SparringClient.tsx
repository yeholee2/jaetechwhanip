'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import SparringActiveCard from '@/components/sparring/SparringActiveCard';
import SparringPastCard from '@/components/sparring/SparringPastCard';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import type { Sparring } from '@/lib/sparring';
import { Section, Chip } from '@/components/ui';
import { TickerScroller } from '@/app/etf/TickerScroller';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './SparringPage.module.css';

type SortMode = 'default' | 'comments';

export default function SparringClient({ sparrings }: { sparrings: Sparring[] }) {
  const [category, setCategory] = useState('전체');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  // 운영자(admin) 여부 — 진행중 섹션 우측에 '+ 새 라운드' 버튼 노출
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('users').select('role').eq('id', user.id).maybeSingle()
        .then(({ data }) => setIsAdmin(data?.role === 'admin'));
    });
  }, []);

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
        <Section
          title="진행중 스파링"
          sub={`${activeSparrings.length}개`}
          actions={isAdmin ? (
            <Link
              href="/admin/sparring"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 800,
                borderRadius: 999,
                border: '1.5px solid var(--rw-primary)',
                background: 'var(--rw-primary-bg)',
                color: 'var(--rw-primary)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
              title="새 스파링 라운드 만들기 (관리자)"
            >
              + 새 라운드
            </Link>
          ) : undefined}
        >
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
