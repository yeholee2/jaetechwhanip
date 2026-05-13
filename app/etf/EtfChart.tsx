'use client';

/**
 * ETF 수익률 차트 (펀ETF 스타일).
 *
 * - 7 기간 토글: 1주 / 1개월 / 3개월 / 연초후 / 1년 / 3년 / 전체
 * - Y축: 누적 수익률 (%)
 * - 0% 기준점, 기간별 누적 변화
 * - 서버에서 받아온 PricePoint[] (Yahoo max range) 그대로 사용
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PriceChart, type ChartPoint } from '@/components/ui';
import type { PricePoint } from '@/lib/etfPriceHistory';
import styles from './EtfChart.module.css';

type PeriodKey = 'w1' | 'm1' | 'm3' | 'ytd' | 'y1' | 'y3' | 'all';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'w1',  label: '1주', days: 7 },
  { key: 'm1',  label: '1개월', days: 30 },
  { key: 'm3',  label: '3개월', days: 90 },
  { key: 'ytd', label: '연초후', days: 0 },
  { key: 'y1',  label: '1년', days: 365 },
  { key: 'y3',  label: '3년', days: 1095 },
  { key: 'all', label: '전체', days: 999999 },
];

type Props = {
  code: string;
  price?: string;
  changeTone?: 'up' | 'down' | 'flat';
  /** 서버에서 받아온 일별 종가 시계열 (Yahoo max). */
  history?: PricePoint[];
  /** 비교 벤치마크 시계열 (KOSPI 또는 S&P500) */
  benchmark?: { name: string; history: PricePoint[] };
};

export function EtfChart({ code, history = [], benchmark, changeTone = 'flat' }: Props) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('m1');
  const [showBench, setShowBench] = useState(!!benchmark);

  const { points, returnPct, tone, periodLabel, benchPoints, benchReturnPct } = useMemo(() => {
    const period = PERIODS.find(p => p.key === periodKey)!;
    if (history.length < 2) {
      return { points: [] as ChartPoint[], returnPct: 0, tone: changeTone, periodLabel: period.label, benchPoints: [] as ChartPoint[], benchReturnPct: 0 };
    }
    const lastDate = new Date(history[history.length - 1].date);

    let startIdx = 0;
    if (period.key === 'ytd') {
      const yearStart = new Date(lastDate.getFullYear(), 0, 1).getTime();
      startIdx = history.findIndex(p => new Date(p.date).getTime() >= yearStart);
      if (startIdx === -1) startIdx = 0;
    } else if (period.key !== 'all') {
      const cutoff = new Date(lastDate);
      cutoff.setDate(cutoff.getDate() - period.days);
      startIdx = history.findIndex(p => new Date(p.date).getTime() >= cutoff.getTime());
      if (startIdx === -1) startIdx = 0;
    }

    const sliced = history.slice(startIdx);
    if (sliced.length < 2) {
      return { points: [], returnPct: 0, tone: changeTone, periodLabel: period.label, benchPoints: [] as ChartPoint[], benchReturnPct: 0 };
    }
    const basePrice = sliced[0].close;
    const finalPrice = sliced[sliced.length - 1].close;
    const total = (finalPrice - basePrice) / basePrice;

    const stride = Math.max(1, Math.floor(sliced.length / 120));
    const decimated: ChartPoint[] = [];
    for (let i = 0; i < sliced.length; i += stride) {
      const p = sliced[i];
      decimated.push({ date: p.date, value: ((p.close - basePrice) / basePrice) * 100 });
    }
    if (decimated[decimated.length - 1]?.date !== sliced[sliced.length - 1].date) {
      const p = sliced[sliced.length - 1];
      decimated.push({ date: p.date, value: ((p.close - basePrice) / basePrice) * 100 });
    }

    // 벤치마크 시계열도 같은 기간으로 슬라이스
    let bPoints: ChartPoint[] = [];
    let bRet = 0;
    if (benchmark && benchmark.history.length > 1) {
      const bSliced = benchmark.history.filter(p => {
        const d = new Date(p.date).getTime();
        return d >= new Date(sliced[0].date).getTime() && d <= new Date(sliced[sliced.length - 1].date).getTime();
      });
      if (bSliced.length > 1) {
        const bBase = bSliced[0].close;
        bRet = (bSliced[bSliced.length - 1].close - bBase) / bBase;
        const bStride = Math.max(1, Math.floor(bSliced.length / 120));
        for (let i = 0; i < bSliced.length; i += bStride) {
          const p = bSliced[i];
          bPoints.push({ date: p.date, value: ((p.close - bBase) / bBase) * 100 });
        }
      }
    }

    return {
      points: decimated,
      returnPct: total,
      tone: total > 0 ? 'up' as const : total < 0 ? 'down' as const : 'flat' as const,
      periodLabel: period.label,
      benchPoints: bPoints,
      benchReturnPct: bRet,
    };
  }, [history, benchmark, periodKey, changeTone]);

  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  const fmtAxis = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  return (
    <section className={styles.wrap} aria-label="수익률 차트">
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <h2 className={styles.title}>수익률</h2>
          {history.length > 1 && (
            <span className={styles.headSub}>{history[history.length - 1].date} 기준</span>
          )}
        </div>
        <div className={styles.headRight}>
          <Link href={`/etf/compare?a=${code}`} className={styles.compareLink}>
            + 상품 비교
          </Link>
          <div className={styles.returnNow}>
            <span className={`${styles.returnPct} ${styles[tone]}`}>
              {points.length > 0 ? fmtPct(returnPct * 100) : '—'}
            </span>
            <span className={styles.returnLabel}>{periodLabel}</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="기간 선택">
        {PERIODS.map(p => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={p.key === periodKey}
            className={`${styles.tab} ${p.key === periodKey ? styles.tabOn : ''}`}
            onClick={() => setPeriodKey(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {points.length > 1 ? (
        <>
          <PriceChart
            data={points}
            tone={tone}
            height={240}
            valueFormat={fmtAxis}
            yAxisTicks={5}
            overlay={showBench && benchPoints.length > 1 ? benchPoints : undefined}
          />
          {benchmark && benchPoints.length > 1 && (
            <div className={styles.legend}>
              <label className={styles.legendChip}>
                <input
                  type="checkbox"
                  checked={showBench}
                  onChange={e => setShowBench(e.target.checked)}
                />
                <span className={styles.legendDotBench} aria-hidden="true" />
                <span>{benchmark.name}</span>
                <em className={`${styles.legendPct} ${benchReturnPct >= 0 ? styles.up : styles.down}`}>
                  {benchReturnPct >= 0 ? '+' : ''}{(benchReturnPct * 100).toFixed(2)}%
                </em>
              </label>
              <span className={styles.legendNote}>이 ETF와 같은 기간 누적 수익률 비교</span>
            </div>
          )}
        </>
      ) : (
        <div className={styles.empty}>이 기간 데이터를 불러올 수 없어요.</div>
      )}
    </section>
  );
}
