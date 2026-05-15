import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { fetchMarketIndices } from '@/lib/market-indices';
import { fetchSiteSettings } from '@/lib/site-settings-server';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
import { fetchTickerQuotes } from '@/app/etf/MarketTicker';

// SSG + ISR: 60초마다 DB·시장데이터·설정 재생성
export const revalidate = 60;

export default async function HomePage() {
  const [questions, { sparrings }, indices, settings, tickerQuotes] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
    fetchMarketIndices(),
    fetchSiteSettings(),
    fetchTickerQuotes(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
      marketIndices={indices}
      siteBanner={settings.banner}
      siteKeywords={settings.keywords}
      tickerQuotes={tickerQuotes}
    />
  );
}
