import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge, Card } from '@/components/ui';
import { PortfolioDiagnostic } from '../etf/PortfolioDiagnostic';
import { PORTFOLIO_TEMPLATES } from '@/lib/portfolioTemplates';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const revalidate = 300;

const PATH = '/portfolio';
const URL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: 'MY포트폴리오',
  description:
    '내 보유 ETF를 입력하면 섹터 중복도·환노출·총보수 가중평균·위험 등급을 한 번에 분석해드려요. 마이데이터 없이도 가볍게 시작.',
  keywords: ['포트폴리오 진단', 'ETF 진단', '내 자산', '섹터 중복도', '환노출', SITE_NAME],
  alternates: { canonical: PATH },
  openGraph: {
    title: `포트폴리오 진단 | ${SITE_NAME}`,
    description: '내 ETF 포트폴리오를 한 번에 진단하세요.',
    url: URL,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `포트폴리오 진단 | ${SITE_NAME}`,
    description: '내 ETF 포트폴리오를 한 번에 진단하세요.',
  },
};

export default function PortfolioPage() {
  return (
    <AppShell active="portfolio" hideSlogan>
      <main style={{ padding: 'var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <PageHero
          eyebrow={<Badge tone="primary">MY포트폴리오</Badge>}
          title="내 ETF, 한 번에 진단"
          lead="섹터 중복도 · 환노출 · 보수 가중평균 · 위험 등급을 자동으로 계산해드려요. 마이데이터 없이 수동 입력만으로도 충분합니다."
        />
        <PortfolioDiagnostic />

        {/* 대가들의 포트폴리오 — 비로그인도 둘러볼 수 있는 진입 */}
        <div style={{ padding: 'var(--space-4)', borderRadius: 'var(--rw-radius-md)', border: '1px solid var(--rw-border)', background: 'linear-gradient(135deg, rgba(49, 130, 246, 0.06), var(--rw-card))' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <div>
              <Badge tone="primary">대가들의 포트폴리오</Badge>
              <h2 style={{ margin: '6px 0 4px', fontSize: 'var(--type-title)', fontWeight: 900, letterSpacing: '-0.3px' }}>
                이 사람들은 어떻게 굴렸을까?
              </h2>
              <p style={{ margin: 0, fontSize: 'var(--type-caption)', color: 'var(--rw-text-body)', fontWeight: 600, lineHeight: 1.5 }}>
                버핏 · 달리오 · 보글 · 예일까지 — 검증된 비중을 ETF로 따라하고 1년 백테스트까지.
              </p>
            </div>
            <Link href="/portfolio/templates" style={{ fontSize: 13, color: 'var(--rw-primary)', fontWeight: 800, whiteSpace: 'nowrap' }}>
              전체 →
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-2)' }}>
            {PORTFOLIO_TEMPLATES.slice(0, 4).map(t => (
              <Link
                key={t.slug}
                href={`/portfolio/templates/${t.slug}`}
                style={{
                  display: 'block',
                  padding: 'var(--space-3)',
                  background: 'var(--rw-card)',
                  border: '1px solid var(--rw-border)',
                  borderRadius: 'var(--rw-radius-sm)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'border-color 120ms ease',
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 700, marginBottom: 4 }}>
                  {t.author}
                </div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--rw-text-strong)', letterSpacing: '-0.2px', marginBottom: 4 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--rw-text-body)', fontWeight: 600, lineHeight: 1.4 }}>
                  {t.tagline}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
