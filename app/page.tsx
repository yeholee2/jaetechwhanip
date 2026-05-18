import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { fetchMarketIndices } from '@/lib/market-indices';
import { fetchSiteSettings } from '@/lib/site-settings-server';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
import { fetchTickerQuotes, fetchNextMajorEvent } from '@/app/etf/MarketTicker';
import { fetchForYou } from '@/lib/forYou';

// 개인화 섹션이 있어서 dynamic — 사용자별 다른 콘텐츠
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [questions, { sparrings }, indices, settings, tickerQuotes, nextEvent, forYou] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
    fetchMarketIndices(),
    fetchSiteSettings(),
    fetchTickerQuotes(),
    fetchNextMajorEvent(),
    fetchForYou(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
      marketIndices={indices}
      siteBanner={settings.banner}
      siteKeywords={settings.keywords}
      rollingBanners={settings.rollingBanners}
      tickerQuotes={tickerQuotes}
      nextEvent={nextEvent}
      forYou={forYou}
    />
  );
}
