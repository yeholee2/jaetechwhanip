import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';
import { SITE_NAME } from '@/lib/seo';
import { PageHero } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { StrategyToggle } from '../StrategyToggle';
import { ThemeToggle } from '../ThemeToggle';
import { InsightCarousel } from '../InsightCarousel';
import { CtaCards } from '../CtaCards';
import { FeaturePromo } from '../FeaturePromo';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF 테마·전략',
  description: '돈 버는 전략·뜨는 테마·이번 주 큐레이션을 한 페이지에서.',
  keywords: ['ETF 테마', '월배당', 'S&P500', '반도체', '나스닥', 'AI 테마', SITE_NAME],
  alternates: { canonical: '/etf/themes' },
  openGraph: {
    title: `ETF 테마·전략 | ${SITE_NAME}`,
    description: '전략·테마·큐레이션',
    url: `${ETF_HOME_URL}/themes`,
    type: 'website',
  },
};

export default async function EtfThemesPage() {
  const allEtfs = await fetchEtfs(2000);

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout">
        <div className="pc-layout-main">
          <PageHero
            eyebrow="테마 · 전략"
            title="요즘 뜨는 테마와 검증된 전략"
            lead="어떤 테마가 주목받는지, 어떤 전략이 돈을 벌어왔는지 한 페이지에서 살펴봐요."
          />

          <StrategyToggle allEtfs={allEtfs} />
          <ThemeToggle allEtfs={allEtfs} />
          <InsightCarousel allEtfs={allEtfs} />
          <CtaCards />
          <FeaturePromo />
        </div>
        <PageSidebar widgets={['watch']} />
      </main>
    </AppShell>
  );
}
