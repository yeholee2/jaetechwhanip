import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { fetchEtfs, fetchEtfByCode } from '@/lib/etfsDb';
import { SITE_NAME } from '@/lib/seo';
import { PageHero } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { MarketTicker } from '../MarketTicker';
import { EtfCompareClient } from './EtfCompareClient';

export const revalidate = 600;

export const metadata: Metadata = {
  title: 'ETF 비교',
  description: '두 ETF의 현재가·순자산·총보수·분배금·환헤지를 한눈에 비교해보세요.',
  keywords: ['ETF 비교', 'ETF 가격 비교', 'ETF 수수료 비교', SITE_NAME],
  alternates: { canonical: '/etf/compare' },
  openGraph: {
    title: `ETF 비교 | ${SITE_NAME}`,
    description: '두 ETF를 한 화면에서 비교',
    url: `${ETF_HOME_URL}/compare`,
    type: 'website',
  },
};

export default async function EtfComparePage({
  searchParams,
}: {
  searchParams?: { a?: string; b?: string };
}) {
  const [allEtfs, a, b] = await Promise.all([
    fetchEtfs(2000),
    searchParams?.a ? fetchEtfByCode(searchParams.a) : Promise.resolve(undefined),
    searchParams?.b ? fetchEtfByCode(searchParams.b) : Promise.resolve(undefined),
  ]);

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <MarketTicker />
        <div className="pc-layout">
          <div className="pc-layout-main">
            <PageHero
              eyebrow="ETF 비교"
              title="두 ETF를 한눈에 비교해요"
              lead="현재가·순자산·총보수·분배금·환헤지를 나란히 놓고 보세요."
            />
            <EtfCompareClient initialA={a} initialB={b} candidates={allEtfs} />
          </div>
          <PageSidebar widgets={['watch', 'help']} />
        </div>
      </main>
    </AppShell>
  );
}
