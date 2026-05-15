import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { fetchMarketIndices } from '@/lib/market-indices';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';

// SSG + ISR: 60초마다 DB·시장데이터 재생성
export const revalidate = 60;

export default async function HomePage() {
  const [questions, { sparrings }, indices] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
    fetchMarketIndices(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
      marketIndices={indices}
    />
  );
}
