/**
 * /portfolio/templates/[slug] — 대가 포트폴리오 상세.
 * 구성·1년 백테스트·따라하기 액션.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Badge, Card } from '@/components/ui';
import { getTemplateBySlug, PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import type { BacktestRange } from '@/lib/backtest';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { ApplyTemplateButton } from './ApplyTemplateButton';
import { BacktestPanel, BacktestSkeleton } from './BacktestPanel';
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

const VALID_RANGES: BacktestRange[] = ['3mo', '6mo', '1y', '5y', '10y'];

export default function TemplateDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { range?: string };
}) {
  const template = getTemplateBySlug(params.slug);
  if (!template) notFound();

  const rangeParam = (searchParams?.range || '1y') as BacktestRange;
  const range: BacktestRange = VALID_RANGES.includes(rangeParam) ? rangeParam : '1y';

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
          <p className={styles.source}>
            <strong>출처</strong> · {template.source}
          </p>
        </section>

        {/* 백테스트 — Suspense로 fetch 동안 skeleton */}
        <Suspense key={range} fallback={<BacktestSkeleton />}>
          <BacktestPanel template={template} range={range} />
        </Suspense>

        {/* 구성 — 미국·국내 매핑 표 */}
        <Card pad="lg">
          <div className={styles.sectionHead}>
            <h2>구성 종목 · 미국 ↔ 국내 대체</h2>
            <span>{template.allocations.length}개 자산</span>
          </div>
          <ul className={styles.allocList}>
            {template.allocations.map(a => (
              <li key={a.ticker} className={styles.allocItem}>
                <div className={styles.allocMain}>
                  <Link href={`/etf/${encodeURIComponent(a.ticker)}`} className={styles.allocTicker}>
                    🇺🇸 {a.ticker}
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
                {a.krAlternative && (
                  <div className={styles.krAlt}>
                    <span className={styles.krAltLabel}>🇰🇷 국내 대체</span>
                    <Link href={`/etf/${a.krAlternative.code}`} className={styles.krAltLink}>
                      {a.krAlternative.code} · {a.krAlternative.name}
                    </Link>
                  </div>
                )}
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

        {/* 따라하기 + 비교 CTA */}
        <Card pad="lg" className={styles.ctaCard}>
          <h3>이 포트폴리오로 시작하기</h3>
          <p>구성 ETF를 내 포트폴리오에 한 번에 추가해요. 가입은 무료, 시작은 1분.</p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <ApplyTemplateButton template={template} />
            <Link
              href={`/portfolio/compare/${template.slug}`}
              style={{
                display: 'inline-flex', alignItems: 'center', padding: '10px 16px',
                fontSize: 14, fontWeight: 800, color: 'var(--rw-text-strong)',
                background: 'var(--rw-card)', border: '1px solid var(--rw-border)',
                borderRadius: 'var(--rw-radius-sm)', textDecoration: 'none',
              }}
            >
              내 포트폴리오와 비교
            </Link>
          </div>
        </Card>
      </main>
    </AppShell>
  );
}
