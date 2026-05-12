import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { etfs, ETF_HOME_URL } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageHero, Badge } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { EtfAllClient } from './EtfAllClient';

export const revalidate = 600;

export const metadata: Metadata = {
  title: '전체 ETF 검색',
  description: 'ETF 코드·이름으로 검색하고 운용사·카테고리·총보수로 필터링해서 한 번에 비교하세요.',
  keywords: ['ETF 검색', 'ETF 리스트', '운용사', 'KODEX', 'TIGER', 'ACE', SITE_NAME],
  alternates: { canonical: '/etf/all' },
  openGraph: {
    title: `전체 ETF | ${SITE_NAME}`,
    description: 'ETF 검색·필터·정렬',
    url: `${ETF_HOME_URL}/all`,
    type: 'website',
  },
};

export default async function EtfAllPage() {
  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout">
        <div className="pc-layout-main">
          <PageHero
            eyebrow="전체 ETF"
            title="찾는 ETF, 한 번에 검색해요"
            lead="코드·이름·테마로 검색하고 운용사·총보수로 좁혀보세요."
            aside={<Badge tone="primary">{etfs.length}개</Badge>}
          />
          <EtfAllClient initialEtfs={etfs} />
        </div>
        <PageSidebar widgets={['watch', 'etf-nav']} />
      </main>
    </AppShell>
  );
}
