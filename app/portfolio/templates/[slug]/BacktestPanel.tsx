/**
 * BacktestPanel — async server component.
 * Suspense fallback (BacktestSkeleton) 사용하기 위해 분리.
 */

import Link from 'next/link';
import { Card, DataCell, Stat } from '@/components/ui';
import { BacktestChart } from '@/components/BacktestChart';
import { backtestTemplate, type BacktestRange } from '@/lib/backtest';
import type { PortfolioTemplate } from '@/lib/portfolioTemplates';
import styles from './TemplateDetail.module.css';

const RANGE_TABS = [
  { label: '3개월', api: '3mo' as const },
  { label: '6개월', api: '6mo' as const },
  { label: '1년',   api: '1y'  as const },
  { label: '5년',   api: '5y'  as const },
  { label: '10년',  api: '10y' as const },
];

const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

type Props = { template: PortfolioTemplate; range: BacktestRange };

export async function BacktestPanel({ template, range }: Props) {
  const backtest = await backtestTemplate(template, range);
  const matched = RANGE_TABS.find(t => t.api === range) || RANGE_TABS[2];

  return (
    <Card pad="lg">
      <div className={styles.sectionHead}>
        <h2>{matched.label} 백테스트</h2>
        <span>실데이터 · Yahoo Finance</span>
      </div>

      <div className={styles.rangeTabs} role="tablist" aria-label="백테스트 기간">
        {RANGE_TABS.map(t => (
          <Link
            key={t.api}
            href={`/portfolio/templates/${template.slug}?range=${t.api}`}
            className={`${styles.rangeTab} ${t.api === range ? styles.rangeTabOn : ''}`}
            role="tab"
            aria-selected={t.api === range}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {!backtest ? (
        <p style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--rw-text-muted)', fontSize: 13 }}>
          {matched.label} 데이터를 불러올 수 없어요. (일부 ETF가 그 기간에 상장되지 않았을 수도)
        </p>
      ) : (
        <>
          <BacktestChart points={backtest.points} />
          <div className={styles.statsGrid}>
            <Stat
              label="총 수익률"
              value={fmtPct(backtest.totalReturn)}
              tone={backtest.totalReturn >= 0 ? 'up' : 'down'}
              size="lg"
            />
            <DataCell
              label="연환산 수익률"
              value={fmtPct(backtest.annualizedReturn)}
              tone={backtest.annualizedReturn >= 0 ? 'good' : 'warn'}
            />
            <DataCell
              label="최악의 시기"
              value={fmtPct(backtest.maxDrawdown)}
              sub="가장 크게 빠진 구간"
              tone="warn"
            />
            <DataCell
              label="변동성"
              value={`±${(backtest.volatility * 100).toFixed(1)}%`}
              sub="연환산 표준편차"
            />
          </div>
          {backtest.vsBenchmark && (
            <div className={styles.benchmark}>
              <span>S&P500 단독 비교</span>
              <strong>
                {fmtPct(backtest.vsBenchmark.totalReturn)} ·{' '}
                이 포트폴리오{' '}
                <em
                  style={{
                    color:
                      backtest.vsBenchmark.outperformance >= 0
                        ? 'var(--rw-red60)'
                        : 'var(--rw-blue70)',
                  }}
                >
                  {backtest.vsBenchmark.outperformance >= 0 ? '+' : ''}
                  {(backtest.vsBenchmark.outperformance * 100).toFixed(2)}%p
                </em>
              </strong>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export function BacktestSkeleton() {
  return (
    <Card pad="lg">
      <div className={styles.sectionHead}>
        <h2 style={{ background: 'var(--rw-card-muted)', color: 'transparent', borderRadius: 6, width: 160 }}>
          백테스트
        </h2>
        <span style={{ color: 'var(--rw-text-muted)' }}>불러오는 중…</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-3)', padding: 3, background: 'var(--rw-card-muted)', borderRadius: 'var(--rw-radius-sm)', width: 'fit-content' }}>
        {['3개월','6개월','1년','5년','10년'].map(l => (
          <span key={l} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'var(--rw-text-muted)' }}>{l}</span>
        ))}
      </div>
      <div style={{
        height: 200,
        background: 'linear-gradient(90deg, var(--rw-card-muted) 0%, rgba(49, 130, 246, 0.06) 50%, var(--rw-card-muted) 100%)',
        backgroundSize: '200% 100%',
        borderRadius: 'var(--rw-radius-sm)',
        animation: 'shimmer 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ height: 64, background: 'var(--rw-card-muted)', borderRadius: 'var(--rw-radius-md)' }} />
        ))}
      </div>
    </Card>
  );
}
