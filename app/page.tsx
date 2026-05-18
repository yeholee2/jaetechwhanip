import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { fetchMarketIndices } from '@/lib/market-indices';
import { fetchSiteSettings } from '@/lib/site-settings-server';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
import { fetchTickerQuotes, fetchNextMajorEvent } from '@/app/etf/MarketTicker';

// 페이지 자체는 ISR (60초). 개인화(forYou)는 클라이언트에서 /api/foryou 별도 fetch.
// → 캐시된 HTML 즉시 응답, TTFB ↓
export const revalidate = 60;

export default async function HomePage() {
  const [questions, { sparrings }, indices, settings, tickerQuotes, nextEvent] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
    fetchMarketIndices(),
    fetchSiteSettings(),
    fetchTickerQuotes(),
    fetchNextMajorEvent(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
      marketIndices={indices}
      siteBanner={settings.banner}
      siteKeywords={settings.keywords}
      tickerQuotes={tickerQuotes}
      nextEvent={nextEvent}
    />
  );
}
