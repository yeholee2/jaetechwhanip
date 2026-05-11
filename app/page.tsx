import HomeClient from '@/components/HomeClient';
import { sampleQuestions } from '@/lib/sampleData';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';

// SSG로 SEO 최적화
export const revalidate = 60; // 60초마다 재생성

export default async function HomePage() {
  // 나중에 Supabase에서 fetch
  // const supabase = createClient();
  // const { data: questions } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  const questions = sampleQuestions;
  const { sparrings } = await listSparrings();

  return <HomeClient initialQuestions={questions} featuredSparring={getFeaturedActiveSparring(sparrings)} />;
}
