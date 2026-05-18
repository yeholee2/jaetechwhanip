import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { fetchMarketIndices } from '@/lib/market-indices';
import { fetchSiteSettings } from '@/lib/site-settings-server';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
import { fetchTickerQuotes, fetchNextMajorEvent } from '@/app/etf/MarketTicker';
import { fetchForYou } from '@/lib/forYou';
import { createClient, hasSupabaseServer } from '@/lib/supabase/server';
import type { Creator } from '@/lib/creator';
import { getMockCreators } from '@/lib/creatorMock';

// 개인화 섹션이 있어서 dynamic — 사용자별 다른 콘텐츠
export const dynamic = 'force-dynamic';

async function fetchHomeCreators(): Promise<Creator[]> {
  let data: Creator[] | null = null;

  if (hasSupabaseServer()) {
    const supabase = createClient();
    const res = await supabase
      .from('creators')
      .select('*')
      .eq('is_published', true)
      .order('follower_count', { ascending: false })
      .limit(12);
    data = (res.data || []) as Creator[];
  }

  const dbCreators = data || [];
  return dbCreators.length >= 4
    ? dbCreators
    : [...dbCreators, ...getMockCreators()].slice(0, 12);
}

export default async function HomePage() {
  const [questions, { sparrings }, indices, settings, tickerQuotes, nextEvent, forYou, homeCreators] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
    fetchMarketIndices(),
    fetchSiteSettings(),
    fetchTickerQuotes(),
    fetchNextMajorEvent(),
    fetchForYou(),
    fetchHomeCreators(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
      marketIndices={indices}
      siteBanner={settings.banner}
      siteKeywords={settings.keywords}
      homeCreators={homeCreators}
      tickerQuotes={tickerQuotes}
      nextEvent={nextEvent}
      forYou={forYou}
    />
  );
}
