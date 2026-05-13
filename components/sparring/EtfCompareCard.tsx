import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { Tooltip } from '@/components/ui';
import styles from './EtfCompareCard.module.css';

type Props = {
  etfA: EtfInfo | undefined;
  etfB: EtfInfo | undefined;
  sideALabel?: string;
  sideBLabel?: string;
};

type Row = {
  label: string;
  a: string;
  b: string;
  tip: { title: string; body: React.ReactNode };
  /** 어느 쪽이 더 유리한가 — winner 칩 노출 */
  betterIs?: 'lower' | 'higher' | 'equal';
};

/** 문자열에서 첫 숫자 추출 ("0.07%" / "1.2조" / "300억" 모두 처리) */
function num(s: string | undefined): number | null {
  if (!s) return null;
  const m = String(s).match(/-?[\d.]+/);
  if (!m) return null;
  const v = parseFloat(m[0]);
  if (Number.isNaN(v)) return null;
  if (/조/.test(s)) return v * 10000;
  return v;
}

/**
 * 스파링 ETF 비교 모드: A vs B를 한눈에.
 * 라벨 hover → 용어 툴팁, 유리한 쪽엔 "유리" 칩.
 */
export function EtfCompareCard({ etfA, etfB, sideALabel, sideBLabel }: Props) {
  if (!etfA || !etfB) return null;

  const rows: Row[] = [
    {
      label: '현재가', a: etfA.price, b: etfB.price,
      tip: { title: '현재가', body: '시장에서 거래되는 1주당 가격. 매수·매도 시 기준이 돼요.' },
    },
    {
      label: '변동', a: etfA.change, b: etfB.change,
      tip: { title: '일일 변동', body: '전일 종가 대비 가격 변화율. 단기 흐름은 변동성에 좌우돼요.' },
    },
    {
      label: '순자산', a: etfA.aum, b: etfB.aum,
      tip: { title: '순자산 (AUM)', body: <>ETF에 모인 총 자산. <strong>클수록 유동성·안정성</strong> ↑.</> },
      betterIs: 'higher',
    },
    {
      label: '총보수', a: etfA.fee, b: etfB.fee,
      tip: { title: '총보수', body: <>매년 자동으로 떼가는 수수료. <strong>낮을수록 유리</strong>해요.</> },
      betterIs: 'lower',
    },
    {
      label: '분배금', a: etfA.distribution, b: etfB.distribution,
      tip: { title: '분배금', body: '보유 종목의 배당을 모아 투자자에게 지급하는 비율. 분배 주기도 다양해요.' },
    },
    {
      label: '환헤지', a: etfA.hedge, b: etfB.hedge,
      tip: { title: '환헤지', body: <><strong>환헤지(H)</strong>는 환율 영향 차단, 환 노출은 그대로 반영.</> },
    },
  ];

  const winnerOf = (row: Row): 'a' | 'b' | null => {
    if (!row.betterIs) return null;
    const na = num(row.a);
    const nb = num(row.b);
    if (na == null || nb == null || na === nb) return null;
    if (row.betterIs === 'lower') return na < nb ? 'a' : 'b';
    return na > nb ? 'a' : 'b';
  };

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
          {rows.map(r => {
            const winner = winnerOf(r);
            return (
              <tr key={r.label}>
                <td className={`${styles.aCell} ${winner === 'a' ? styles.winnerCell : ''}`}>
                  {r.a}
                  {winner === 'a' && <span className={styles.winnerChip}>유리</span>}
                </td>
                <th className={styles.labelCell}>
                  <span className={styles.labelInner}>
                    {r.label}
                    <Tooltip label={`${r.label} 설명`} title={r.tip.title}>
                      {r.tip.body}
                    </Tooltip>
                  </span>
                </th>
                <td className={`${styles.bCell} ${winner === 'b' ? styles.winnerCell : ''}`}>
                  {winner === 'b' && <span className={styles.winnerChip}>유리</span>}
                  {r.b}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.foot}>
        <Link href={etfPath(etfA.slug)}>{etfA.shortName} 상세 →</Link>
        <Link href={etfPath(etfB.slug)}>{etfB.shortName} 상세 →</Link>
      </div>
    </section>
  );
}
