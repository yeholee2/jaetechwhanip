/**
 * /portfolio/templates/[slug] — 대가 포트폴리오 상세.
 * 구성·1년 백테스트·따라하기 액션.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Badge, Card, DataCell, Stat, Button } from '@/components/ui';
import { BacktestChart } from '@/components/BacktestChart';
import { getTemplateBySlug, PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { backtestTemplate } from '@/lib/backtest';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { ApplyTemplateButton } from './ApplyTemplateButton';
import styles from './TemplateDetail.module.css';

export const revalidate = 3600;

export function generateStaticParams() {
  return PORTFOLIO_TEMPLATES.map(t => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const t = getTemplateBySlug(params.slug);
  if (!t) return { title: '포트폴리오를 찾을 수 없어요' };
  return {
    title: `${t.name} — ${t.author} | 대가 포트폴리오`,
    description: `${t.tagline}. ${t.description.slice(0, 120)}`,
    keywords: [t.name, t.author, '포트폴리오 따라하기', '백테스트', SITE_NAME],
    alternates: { canonical: `/portfolio/templates/${t.slug}` },
    openGraph: {
      title: `${t.name} | ${SITE_NAME}`,
      description: t.tagline,
      url: `${SITE_URL}/portfolio/templates/${t.slug}`,
      type: 'website',
    },
  };
}

export default async function TemplateDetailPage({ params }: { params: { slug: string } }) {
  const template = getTemplateBySlug(params.slug);
  if (!template) notFound();

  const backtest = await backtestTemplate(template, '1y');

  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

  return (
    <AppShell active="portfolio" hideSlogan>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <Link href="/portfolio/templates" className={styles.back}>← 대가들의 포트폴리오</Link>
        </div>

        <section className={styles.hero}>
          <Badge tone="primary">{template.author}</Badge>
          <h1>{template.name}</h1>
          <p className={styles.tagline}>{template.tagline}</p>
          <p className={styles.desc}>{template.description}</p>
        </section>

        {/* 백테스트 */}
        {backtest ? (
          <Card pad="lg">
            <div className={styles.sectionHead}>
              <h2>1년 백테스트</h2>
              <span>실데이터 · Yahoo Finance</span>
            </div>
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
                  {fmtPct(backtest.vsBenchmark.totalReturn)} ·
                  {' '}이 포트폴리오 <em style={{
                    color: backtest.vsBenchmark.outperformance >= 0 ? 'var(--rw-red60)' : 'var(--rw-blue70)'
                  }}>
                    {backtest.vsBenchmark.outperformance >= 0 ? '+' : ''}
                    {(backtest.vsBenchmark.outperformance * 100).toFixed(2)}%p
                  </em>
                </strong>
              </div>
            )}
          </Card>
        ) : (
          <Card pad="lg" className={styles.noBacktest}>
            <p>백테스트 데이터를 불러올 수 없어요. 잠시 후 다시 시도해주세요.</p>
          </Card>
        )}

        {/* 구성 */}
        <Card pad="lg">
          <div className={styles.sectionHead}>
            <h2>구성 종목</h2>
            <span>{template.allocations.length}개 ETF</span>
          </div>
          <ul className={styles.allocList}>
            {template.allocations.map(a => (
              <li key={a.ticker} className={styles.allocItem}>
                <div className={styles.allocMain}>
                  <Link href={`/etf/${encodeURIComponent(a.ticker)}`} className={styles.allocTicker}>
                    {a.ticker}
                  </Link>
                  <div>
                    <strong>{a.label}</strong>
                    <span>{a.role}</span>
                  </div>
                </div>
                <div className={styles.allocBarWrap}>
                  <span className={styles.allocBarBg}>
                    <span className={styles.allocBarFill} style={{ width: `${a.weight * 100}%` }} />
                  </span>
                </div>
                <div className={styles.allocPct}>{(a.weight * 100).toFixed(1)}%</div>
              </li>
            ))}
          </ul>
        </Card>

        {/* 강점 · 주의 */}
        <Card pad="lg">
          <div className={styles.sectionHead}>
            <h2>한입 평가</h2>
          </div>
          <div className={styles.takeaway}>
            <div className={styles.takeawayItem}>
              <span className={styles.takeawayGood}>✓ 강점</span>
              <p>{template.strength}</p>
            </div>
            <div className={styles.takeawayItem}>
              <span className={styles.takeawayWarn}>! 주의</span>
              <p>{template.caution}</p>
            </div>
            <div className={styles.takeawayItem}>
              <span className={styles.takeawayInfo}>· 이런 분께</span>
              <p>{template.fitFor}</p>
            </div>
          </div>
        </Card>

        {/* 따라하기 CTA */}
        <Card pad="lg" className={styles.ctaCard}>
          <h3>이 포트폴리오로 시작하기</h3>
          <p>구성 ETF를 내 포트폴리오에 한 번에 추가해요. 가입은 무료, 시작은 1분.</p>
          <ApplyTemplateButton template={template} />
        </Card>
      </main>
    </AppShell>
  );
}
