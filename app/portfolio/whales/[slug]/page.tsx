/**
 * /portfolio/whales/[slug] — 대가 실시간 보유 상세.
 * Top 10 종목 + 비중·시장가치·분기 변동 chip.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Badge, Card, DataCell } from '@/components/ui';
import { CHANGE_LABEL, getWhaleBySlug, WHALE_PORTFOLIOS } from '@/lib/portfolioWhales';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './WhaleDetail.module.css';

export const revalidate = 3600;

export function generateStaticParams() {
  return WHALE_PORTFOLIOS.map(w => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const w = getWhaleBySlug(params.slug);
  if (!w) return { title: '대가를 찾을 수 없어요' };
  return {
    title: `${w.manager} · ${w.name} 실시간 보유 — ${w.quarter}`,
    description: `${w.tagline} ${w.quarter} 13F 공시 기준 Top 10 보유 종목.`,
    keywords: [w.name, w.manager, '13F', '실시간 보유', SITE_NAME],
    alternates: { canonical: `/portfolio/whales/${w.slug}` },
    openGraph: {
      title: `${w.manager} 보유 종목 | ${SITE_NAME}`,
      description: w.tagline,
      url: `${SITE_URL}/portfolio/whales/${w.slug}`,
      type: 'website',
    },
  };
}

function formatValue(mln: number): string {
  if (mln >= 1000) return `$${(mln / 1000).toFixed(2)}B`;
  if (mln >= 1) return `$${mln.toFixed(0)}M`;
  return `$${(mln * 1000).toFixed(0)}K`;
}

const CHANGE_TONE_COLOR: Record<'good' | 'warn' | 'neutral', string> = {
  good: 'var(--rw-green50)',
  warn: 'var(--rw-red60)',
  neutral: 'var(--rw-text-muted)',
};

export default function WhaleDetailPage({ params }: { params: { slug: string } }) {
  const w = getWhaleBySlug(params.slug);
  if (!w) notFound();

  const topWeight = w.topHoldings.reduce((s, h) => s + h.weight, 0);

  return (
    <AppShell active="portfolio" hideSlogan>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/portfolio/whales" className={styles.back}>← 대가들의 실시간 보유</Link>
        </div>

        <section className={styles.hero}>
          <div className={styles.heroBadges}>
            <Badge tone="primary">실시간 13F</Badge>
            <Badge tone="neutral">{w.quarter}</Badge>
          </div>
          <h1>{w.manager}</h1>
          <p className={styles.heroFund}>{w.name}</p>
          <p className={styles.heroTag}>{w.tagline}</p>
          <p className={styles.heroPhilo}>
            <strong>철학</strong> · {w.philosophy}
          </p>
          <p className={styles.heroSource}>
            <strong>출처</strong> · SEC EDGAR 13F-HR 공시 (CIK {w.cik}) · 공시일 {w.filedAt}
          </p>
        </section>

        {/* 핵심 지표 */}
        <DataCell.Grid columns={4}>
          <DataCell
            label="총 자산"
            value={formatValue(w.totalValueMln)}
            sub="롱 포지션 합계"
          />
          <DataCell
            label="보유 종목"
            value={`${w.positionCount}개`}
            sub={w.positionCount < 20 ? '집중 투자' : w.positionCount < 100 ? '중간 분산' : '광범위 분산'}
          />
          <DataCell
            label="Top 10 집중도"
            value={`${(topWeight * 100).toFixed(0)}%`}
            sub="상위 10종 비중"
            tone={topWeight > 0.7 ? 'warn' : 'default'}
          />
          <DataCell
            label="공시 시점"
            value={w.quarter}
            sub={`${w.filedAt} 공시`}
          />
        </DataCell.Grid>

        {/* Top 10 보유 */}
        <Card pad="lg">
          <div className={styles.sectionHead}>
            <h2>Top 10 보유 종목</h2>
            <span>{w.quarter} 기준</span>
          </div>
          <ul className={styles.list}>
            {w.topHoldings.map((h, idx) => {
              const change = h.change ? CHANGE_LABEL[h.change] : null;
              return (
                <li key={h.ticker} className={styles.row}>
                  <span className={styles.rank}>{idx + 1}</span>
                  <div className={styles.tickerCol}>
                    <span className={styles.ticker}>{h.ticker}</span>
                    {h.kind === 'etf' && <span className={styles.kindEtf}>ETF</span>}
                  </div>
                  <div className={styles.nameCol}>
                    <strong>{h.name}</strong>
                    {change && (
                      <span style={{ color: CHANGE_TONE_COLOR[change.tone] }} className={styles.changeChip}>
                        {change.label}
                      </span>
                    )}
                  </div>
                  <div className={styles.barCol}>
                    <span className={styles.barBg}>
                      <span className={styles.barFill} style={{ width: `${h.weight * 100}%` }} />
                    </span>
                  </div>
                  <div className={styles.weightCol}>{(h.weight * 100).toFixed(1)}%</div>
                  <div className={styles.valueCol}>{formatValue(h.valueMln)}</div>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* 안내 */}
        <Card pad="md" muted>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--rw-text-muted)', lineHeight: 1.6, fontWeight: 600 }}>
            <strong style={{ color: 'var(--rw-text-body)' }}>참고</strong> ·
            13F-HR는 미국 SEC에 분기마다 제출되는 공시로 1.5~3개월의 시차가 있습니다.
            매수·매도 시점은 비공개라서 "분기 종료일 기준 보유"만 알 수 있어요.
            숏 포지션·옵션·미국 외 종목 일부는 제외됩니다. 투자 판단을 위한 신호가 아닌 참고용입니다.
          </p>
        </Card>
      </main>
    </AppShell>
  );
}
