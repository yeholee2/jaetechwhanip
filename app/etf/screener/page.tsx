import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';
import { enrichEtfRankingCandidatesWithNaver } from '@/lib/etfRankingRealtime';
import { SITE_NAME } from '@/lib/seo';
import { EtfScreenerClient } from './EtfScreenerClient';
import styles from './EtfScreener.module.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'ETF 스크리너',
  description: 'ETF를 조건 목록과 필터로 골라보고 수익률·거래대금·순자산·총보수를 비교하세요.',
  keywords: ['ETF 스크리너', 'ETF 조건', 'ETF 랭킹', '국내 ETF', '미국 ETF', SITE_NAME],
  alternates: { canonical: '/etf/screener' },
  openGraph: {
    title: `ETF 스크리너 | ${SITE_NAME}`,
    description: 'ETF 조건 목록과 랭킹을 한 화면에서.',
    url: `${ETF_HOME_URL}/screener`,
    type: 'website',
  },
};

export default async function EtfScreenerPage() {
  const baseEtfs = await fetchEtfs(2000);
  const marketEtfs = await getEtfsWithMarketData(baseEtfs).catch(() => baseEtfs);
  const etfs = await enrichEtfRankingCandidatesWithNaver(marketEtfs).catch(() => marketEtfs);

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className={styles.screen}>
        <div className={styles.page}>
          <EtfScreenerClient initialEtfs={etfs} />
        </div>
      </main>
    </AppShell>
  );
}
