/**
 * 운용사 정보 카드 — 같은 운용사 ETF Top 5 + 카테고리 분포.
 *
 * Toss 스타일: "미래에셋자산운용이 운용하는 ETF 209개 →"
 */

import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import type { IssuerSummary } from '@/lib/etfSimilar';
import styles from './IssuerCard.module.css';

type Props = {
  summary: IssuerSummary;
  currentCode: string;
};

export function IssuerCard({ summary, currentCode }: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.title}>
          <strong>{summary.name}</strong>
        </div>
        <span className={styles.count}>ETF {summary.totalCount}개 운용</span>
      </div>

      {summary.categories.length > 0 && (
        <div className={styles.cats}>
          {summary.categories.map(c => (
            <span key={c.label} className={styles.cat}>{c.label} {c.count}</span>
          ))}
        </div>
      )}

      <ul className={styles.list}>
        {summary.topEtfs
          .filter(e => e.code !== currentCode)
          .slice(0, 5)
          .map(e => (
            <li key={e.slug}>
              <Link className={styles.row} href={etfPath(e.slug)}>
                <div className={styles.rowMain}>
                  <span className={styles.rowName}>{e.shortName}</span>
                  <span className={styles.rowMeta}>
                    {e.code} · {e.aum || '—'}
                    {e.fee && ` · 보수 ${e.fee}`}
                  </span>
                </div>
                <div className={styles.rowRight}>
                  <div>{e.price || '—'}</div>
                  <div className={e.changeTone === 'down' ? styles.down : styles.up}>
                    {e.change || ''}
                  </div>
                </div>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
