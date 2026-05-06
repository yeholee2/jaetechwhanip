import HomeClient from '@/components/HomeClient';
import { sampleQuestions } from '@/lib/sampleData';

// SSG로 SEO 최적화
export const revalidate = 60; // 60초마다 재생성

export default function HomePage() {
  // 나중에 Supabase에서 fetch
  // const supabase = createClient();
  // const { data: questions } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
  const questions = sampleQuestions;

  return <HomeClient initialQuestions={questions} />;
}
