'use client';

/**
 * 적립식 수익률 계산기.
 * 매월 N원씩 X개월 동안 매수했다면 → 지금 평가액·손익.
 *
 * 분수 주 매수 가정 (단순화). 실제는 정수 주만 매수 가능하지만 시뮬레이션 목적엔 충분.
 */

import { useMemo, useState } from 'react';
import type { PricePoint } from '@/lib/etfPriceHistory';
import styles from './EtfReturns.module.css';

type Props = { monthly: PricePoint[]; etfName: string };

const PERIOD_OPTIONS = [
  { label: '1개월', months: 1 },
  { label: '3개월', months: 3 },
  { label: '6개월', months: 6 },
  { label: '1년', months: 12 },
  { label: '3년', months: 36 },
  { label: '5년', months: 60 },
  { label: '전체', months: 9999 },
];

const AMOUNT_OPTIONS = [
  { label: '10만원', won: 100_000 },
  { label: '30만원', won: 300_000 },
  { label: '50만원', won: 500_000 },
  { label: '100만원', won: 1_000_000 },
  { label: '300만원', won: 3_000_000 },
];

export function ReturnsCalculator({ monthly }: Props) {
  const [periodIdx, setPeriodIdx] = useState(3); // 1년
  const [amountIdx, setAmountIdx] = useState(2); // 50만원

  const period = PERIOD_OPTIONS[periodIdx];
  const amount = AMOUNT_OPTIONS[amountIdx];

  const sim = useMemo(() => {
    if (monthly.length < 2) return null;
    const lastPrice = monthly[monthly.length - 1].close;

    // 매수 시점 — 최근 period.months 개월 (없으면 전체)
    const startIdx = Math.max(0, monthly.length - period.months);
    const buyPoints = monthly.slice(startIdx, monthly.length); // 마지막 시점도 매수에 포함

    let totalShares = 0;
    let totalCost = 0;
    for (const p of buyPoints) {
      const shares = amount.won / p.close;
      totalShares += shares;
      totalCost += amount.won;
    }
    const finalValue = totalShares * lastPrice;
    const pnl = finalValue - totalCost;
    const pnlPct = totalCost > 0 ? pnl / totalCost : 0;

    return { totalCost, finalValue, pnl, pnlPct, months: buyPoints.length };
  }, [monthly, period, amount]);

  if (!sim) return null;

  const tone = sim.pnl >= 0 ? styles.up : styles.down;
  const fmtKRW = (n: number) => `${Math.round(n).toLocaleString('ko-KR')} 원`;
  const fmtPct = (n: number) => `${n >= 0 ? '▲ ' : '▼ '}${Math.abs(n * 100).toFixed(2)}%`;

  return (
    <div className={styles.calc}>
      <div className={styles.calcInputs}>
        <div className={styles.calcRow}>
          <label htmlFor="rc-period">투자 기간</label>
          <select id="rc-period" value={periodIdx} onChange={e => setPeriodIdx(Number(e.target.value))}>
            {PERIOD_OPTIONS.map((p, i) => (
              <option key={p.label} value={i}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.calcRow}>
          <label htmlFor="rc-amount">매월 금액</label>
          <select id="rc-amount" value={amountIdx} onChange={e => setAmountIdx(Number(e.target.value))}>
            {AMOUNT_OPTIONS.map((a, i) => (
              <option key={a.label} value={i}>{a.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.calcRow} style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600 }}>
          {sim.months}회 매수 시뮬레이션
        </div>
      </div>

      <div className={styles.calcOutput}>
        <div className={styles.outRow}>
          <span>평가액</span>
          <strong className={styles.outValue}>{fmtKRW(sim.finalValue)}</strong>
        </div>
        <div className={styles.outRow}>
          <span>투자손익</span>
          <span className={`${styles.outDelta} ${tone}`}>
            {fmtPct(sim.pnlPct)} · {sim.pnl >= 0 ? '+' : '-'}{fmtKRW(Math.abs(sim.pnl)).replace(' 원','')}원
          </span>
        </div>
        <div className={styles.outRow}>
          <span>투자원금</span>
          <span className={styles.outPrincipal}>{fmtKRW(sim.totalCost)}</span>
        </div>
      </div>
    </div>
  );
}
