'use client';

/**
 * ETFCheck식 랭킹 TOP 10. 정렬·카테고리 칩 클릭으로 활성 상태 전환.
 */
import { useState } from 'react';
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import { Chip, Badge } from '@/components/ui';
import sec from './sectionStyles.module.css';
import styles from './EtfRanking.module.css';

const SORT_OPTIONS = ['수익률', '거래량', '자금유입', '순자산총액', '투자자'] as const;
const CATEGORY_OPTIONS = ['전체', '주식', '채권', '원자재'] as const;
type SortKey = typeof SORT_OPTIONS[number];
type CategoryKey = typeof CATEGORY_OPTIONS[number];

export function EtfRanking() {
  const [sort, setSort] = useState<SortKey>('수익률');
  const [category, setCategory] = useState<CategoryKey>('전체');

  // Phase F: sort/category 기반 실제 정렬·필터. 지금은 상위 5개 시드 노출.
  const ranked = etfs.slice(0, 5);

  return (
    <section className={sec.card} aria-label="ETF 랭킹 TOP 10">
      <div className={sec.head}>
        <h3 className={sec.title}>랭킹 TOP 10</h3>
        <Badge tone="neutral">샘플</Badge>
      </div>

      <div className={`${sec.bleedScroller} ${styles.chipRow}`}>
        {SORT_OPTIONS.map(opt => (
          <Chip
            key={opt}
            active={opt === sort}
            size="sm"
            onClick={() => setSort(opt)}
          >
            {opt}
          </Chip>
        ))}
      </div>

      <div className={`${sec.bleedScroller} ${styles.chipRow}`}>
        {CATEGORY_OPTIONS.map(cat => (
          <Chip
            key={cat}
            active={cat === category}
            subtle
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat}
          </Chip>
        ))}
      </div>

      <ol className={styles.list}>
        {ranked.map((etf, idx) => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <span className={styles.rank}>{idx + 1}</span>
              <EtfLogo name={etf.shortName} size={36} className={styles.logo} />
              <div className={styles.info}>
                <strong>{etf.shortName}</strong>
                <span>{etf.price} <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em></span>
              </div>
              <span className={styles.bookmark} aria-hidden="true">☆</span>
            </Link>
          </li>
        ))}
      </ol>

      <Link className={styles.more} href="/etf/all?sort=ranking">
        TOP 10 더보기 →
      </Link>
    </section>
  );
}
