import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ETF_HOME_URL } from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import { PageSidebar } from '@/components/PageSidebar';
import { EtfPageTabs } from '../EtfPageTabs';
import { MarketTicker } from '../MarketTicker';
import { fetchHannipBlog, fetchMacroNews, getEtfCurated } from '@/lib/newsFeed';
import { NewsClient } from './NewsClient';

export const revalidate = 900; // 15분

export const metadata: Metadata = {
  title: 'ETF · 시장 뉴스',
  description: '재테크한입 블로그, 글로벌 매크로, ETF 큐레이션을 한 화면에서.',
  keywords: ['ETF 뉴스', '시장 뉴스', '매크로', '재테크 블로그', SITE_NAME],
  alternates: { canonical: '/etf/news' },
  openGraph: {
    title: `ETF · 시장 뉴스 | ${SITE_NAME}`,
    description: '재테크한입 블로그 + 매크로 + ETF 뉴스',
    url: `${ETF_HOME_URL}/news`,
    type: 'website',
  },
};

export default async function EtfNewsPage() {
  const [blog, macro] = await Promise.all([
    fetchHannipBlog(12),
    fetchMacroNews(12),
  ]);
  const etf = getEtfCurated();

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <MarketTicker />
        <div className="pc-layout">
          <div className="pc-layout-main">
            <EtfPageTabs active="news" />
            <NewsClient blog={blog} macro={macro} etf={etf} />
          </div>
          <PageSidebar widgets={['watch']} />
        </div>
      </main>
    </AppShell>
  );
}
