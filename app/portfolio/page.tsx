import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { PageHero, Badge } from '@/components/ui';
import { PortfolioDiagnostic } from '../etf/PortfolioDiagnostic';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

export const revalidate = 300;

const PATH = '/portfolio';
const URL = `${SITE_URL}${PATH}`;

export const metadata: Metadata = {
  title: '포트폴리오 진단',
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
          eyebrow={<Badge tone="primary">포트폴리오 진단</Badge>}
          title="내 ETF, 한 번에 진단"
          lead="섹터 중복도 · 환노출 · 보수 가중평균 · 위험 등급을 자동으로 계산해드려요. 마이데이터 없이 수동 입력만으로도 충분합니다."
        />
        <PortfolioDiagnostic />
      </main>
    </AppShell>
  );
}
