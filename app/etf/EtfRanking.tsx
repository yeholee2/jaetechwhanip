/**
 * ETFCheck식 랭킹 TOP 10.
 * Phase B 현재: 정적 시드. Phase F에서 실시간 데이터 연결.
 */
import Link from 'next/link';
import { etfPath, etfs } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import styles from './EtfRanking.module.css';

const SORT_OPTIONS = ['수익률', '거래량', '자금유입', '순자산총액', '투자자'] as const;
const CATEGORY_OPTIONS = ['전체', '주식', '채권', '원자재'] as const;

export function EtfRanking() {
  // 시드: 기존 etfs에서 상위 5개를 랭킹 형식으로 노출
  const ranked = etfs.slice(0, 5);

  return (
    <section className={styles.section} aria-label="ETF 랭킹 TOP 10">
      <div className={styles.head}>
        <h3 className={styles.title}>랭킹 TOP 10</h3>
        <span className={styles.range}>당일 · 전일</span>
      </div>

      <div className={styles.sortRow}>
        {SORT_OPTIONS.map((opt, i) => (
          <span
            key={opt}
            className={`${styles.sortChip} ${i === 0 ? styles.sortActive : ''}`}
          >
            {opt}
          </span>
        ))}
      </div>

      <div className={styles.catRow}>
        {CATEGORY_OPTIONS.map((cat, i) => (
          <span
            key={cat}
            className={`${styles.catChip} ${i === 0 ? styles.catActive : ''}`}
          >
            {cat}
          </span>
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

      <Link className={styles.more} href={`${'/etf'}?view=ranking`}>
        TOP 10 더보기 →
      </Link>
    </section>
  );
}
