import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';
import { enrichEtfRankingCandidatesWithNaver } from '@/lib/etfRankingRealtime';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Badge } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { EtfPageTabs } from '../EtfPageTabs';
import { MarketTicker } from '../MarketTicker';
import { EtfAllClient } from '../all/EtfAllClient';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ETF 스크리너',
  description: 'ETF를 수익률·거래대금·순자산·총보수·연금 가능 여부로 골라보세요.',
  keywords: ['ETF 스크리너', 'ETF 검색', 'ETF 랭킹', '국내 ETF', '미국 ETF', SITE_NAME],
  alternates: { canonical: '/etf/screener' },
  openGraph: {
    title: `ETF 스크리너 | ${SITE_NAME}`,
    description: 'ETF 조건검색과 랭킹을 한 화면에서.',
    url: `${ETF_HOME_URL}/screener`,
    type: 'website',
  },
};

export default async function EtfScreenerPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const baseEtfs = await fetchEtfs(2000);
  const marketEtfs = await getEtfsWithMarketData(baseEtfs).catch(() => baseEtfs);
  const etfs = await enrichEtfRankingCandidatesWithNaver(marketEtfs).catch(() => marketEtfs);

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <MarketTicker />
        <div className="pc-layout">
          <div className="pc-layout-main">
            <EtfPageTabs active="screener" />
            <PageHero
              eyebrow="ETF 스크리너"
              title="조건으로 ETF를 골라보세요"
              lead="수익률·거래대금·순자산·총보수·연금 가능 여부를 한 화면에서 비교해요."
              aside={<Badge tone="primary">{etfs.length}개</Badge>}
            />
            <EtfAllClient initialEtfs={etfs} initialQuery={searchParams?.q || ''} />
          </div>
          <PageSidebar widgets={['watch', 'help']} />
        </div>
      </main>
    </AppShell>
  );
}
