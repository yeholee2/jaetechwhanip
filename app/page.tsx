import HomeClient from '@/components/HomeClient';
import { fetchInitialHomeQuestions } from '@/lib/home-questions';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';

// SSG + ISR: 60초마다 DB에서 재생성 → CDN 캐시도 실데이터를 가짐
export const revalidate = 60;

export default async function HomePage() {
  // 서버에서 DB 직접 fetch → 클라이언트 hydration 시 깜빡임 제거
  const [questions, { sparrings }] = await Promise.all([
    fetchInitialHomeQuestions(),
    listSparrings(),
  ]);

  return (
    <HomeClient
      initialQuestions={questions}
      featuredSparring={getFeaturedActiveSparring(sparrings)}
    />
  );
}
