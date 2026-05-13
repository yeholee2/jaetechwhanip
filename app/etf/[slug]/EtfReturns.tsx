/**
 * 기간별 수익률 표 (서버) + 적립식 수익률 계산기 (클라이언트).
 *
 * 한 번의 Yahoo max range fetch로 둘 다 처리.
 */

import { fetchMaxHistory, computePeriodReturns, type PricePoint } from '@/lib/etfPriceHistory';
import { Card } from '@/components/ui';
import { ReturnsCalculator } from './ReturnsCalculator';
import styles from './EtfReturns.module.css';

const fmtPct = (n: number | null) => {
  if (n == null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(2)}%`;
};

const fmtClass = (n: number | null, styles: Record<string, string>) => {
  if (n == null) return styles.neutral;
  if (n > 0) return styles.up;
  if (n < 0) return styles.down;
  return styles.neutral;
};

type Props = { code: string; etfName: string; lastUpdated?: string; history?: PricePoint[] };

export async function EtfReturns({ code, etfName, lastUpdated, history: passed }: Props) {
  // 페이지에서 이미 fetch했으면 재사용, 아니면 직접 fetch
  const history = passed ?? await fetchMaxHistory(code);
  if (history.length < 30) {
    return null; // 데이터 너무 적으면 섹션 숨김
  }
  const returns = computePeriodReturns(history);

  // 최근 60개 종가를 클라이언트로 전달 (계산기용 — 너무 많으면 페이지 무거워짐)
  // 적립식 계산은 월별 매수라 일별보다 월별 종가가 더 자연스러움.
  const monthly = pickMonthlyPoints(history);

  return (
    <div className={styles.section}>
      <Card pad="lg">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--type-title)', fontWeight: 900, letterSpacing: '-0.3px' }}>
            기간별 수익률
          </h2>
          <span style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 700 }}>
            {lastUpdated || history[history.length - 1].date} 기준
          </span>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>구분</th>
                {returns.map(r => (
                  <th key={r.key}>{r.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>종가 (%)</td>
                {returns.map(r => (
                  <td key={r.key} className={fmtClass(r.pct, styles)}>
                    {fmtPct(r.pct)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <p className={styles.note}>
          <strong>참고</strong>
          시장가격(종가) 기준 누적 수익률입니다. 분배금 재투자는 미반영.
          기준가격(NAV)은 운용사 공시 데이터가 필요해 차후 제공 예정이에요.
          5년·3년 등 일부 기간은 상장일 이전이면 표시되지 않을 수 있어요.
        </p>
      </Card>

      <Card pad="lg">
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--type-title)', fontWeight: 900, letterSpacing: '-0.3px' }}>
            적립식 수익률 계산기
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--rw-text-muted)', fontWeight: 600 }}>
            매월 정액 매수했다면 지금 얼마가 됐을지 시뮬레이션.
          </p>
        </div>
        <ReturnsCalculator monthly={monthly} etfName={etfName} />
        <p className={styles.disclaim}>
          ※ 거래수수료·환차익·세금 등은 미반영. 과거 데이터 기반이라 미래 수익률을 보장하지 않아요.
        </p>
      </Card>
    </div>
  );
}

/** 일별 시계열 → 월별 종가 (매월 마지막 거래일) */
function pickMonthlyPoints(daily: PricePoint[]): PricePoint[] {
  const byMonth = new Map<string, PricePoint>();
  for (const p of daily) {
    const key = p.date.slice(0, 7); // YYYY-MM
    byMonth.set(key, p); // 같은 월 마지막 데이터로 덮음
  }
  return Array.from(byMonth.values());
}
