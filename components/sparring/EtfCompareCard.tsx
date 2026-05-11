import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import styles from './EtfCompareCard.module.css';

type Props = {
  etfA: EtfInfo | undefined;
  etfB: EtfInfo | undefined;
  sideALabel?: string;
  sideBLabel?: string;
};

/**
 * 스파링 ETF 비교 모드: A vs B를 한눈에.
 * 양쪽 모두 etfs 라이브러리에 있을 때만 노출.
 */
export function EtfCompareCard({ etfA, etfB, sideALabel, sideBLabel }: Props) {
  if (!etfA || !etfB) return null;

  const rows: Array<{ label: string; a: string; b: string }> = [
    { label: '현재가', a: etfA.price, b: etfB.price },
    { label: '변동', a: etfA.change, b: etfB.change },
    { label: '순자산', a: etfA.aum, b: etfB.aum },
    { label: '총보수', a: etfA.fee, b: etfB.fee },
    { label: '분배금', a: etfA.distribution, b: etfB.distribution },
    { label: '환헤지', a: etfA.hedge, b: etfB.hedge },
  ];

  return (
    <section className={styles.compare} aria-label="ETF 비교">
      <h3>ETF 비교</h3>
      <div className={styles.head}>
        <Link href={etfPath(etfA.slug)} className={styles.sideHead}>
          {sideALabel && <span className={styles.sideTag}>A · {sideALabel}</span>}
          <strong>{etfA.shortName}</strong>
          <em>{etfA.code} · {etfA.issuer}</em>
        </Link>
        <span className={styles.vs}>VS</span>
        <Link href={etfPath(etfB.slug)} className={styles.sideHead}>
          {sideBLabel && <span className={styles.sideTag}>B · {sideBLabel}</span>}
          <strong>{etfB.shortName}</strong>
          <em>{etfB.code} · {etfB.issuer}</em>
        </Link>
      </div>

      <table className={styles.table}>
        <tbody>
          {rows.map(r => (
            <tr key={r.label}>
              <td className={styles.aCell}>{r.a}</td>
              <th className={styles.labelCell}>{r.label}</th>
              <td className={styles.bCell}>{r.b}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.foot}>
        <Link href={etfPath(etfA.slug)}>{etfA.shortName} 상세 →</Link>
        <Link href={etfPath(etfB.slug)}>{etfB.shortName} 상세 →</Link>
      </div>
    </section>
  );
}
