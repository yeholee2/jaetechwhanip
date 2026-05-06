import { sampleQuestions } from '@/lib/sampleData';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = { params: { slug: string } };

// SSG: 빌드 시 모든 질문 페이지 미리 생성
export async function generateStaticParams() {
  return sampleQuestions.map(q => ({ slug: q.slug }));
}

// 질문별 SEO 메타데이터 자동 생성
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const q = sampleQuestions.find(q => q.slug === params.slug);
  if (!q) return {};
  return {
    title: q.title,
    description: q.body.slice(0, 120),
    openGraph: {
      title: `${q.title} | 재테크한입`,
      description: q.body.slice(0, 120),
      type: 'article',
    },
  };
}

export default function QuestionPage({ params }: Props) {
  const q = sampleQuestions.find(q => q.slug === params.slug);
  if (!q) notFound();

  return (
    <main style={{ maxWidth: 720, margin: '80px auto', padding: '0 24px' }}>
      <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
        {q.cat} · {q.topic}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.4, marginBottom: 16 }}>
        {q.title}
      </h1>
      <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.8, marginBottom: 32 }}>
        {q.body}
      </div>
      <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 12, textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>
        답변 {q.ans}개 · 답변 기능은 Supabase 연동 후 활성화됩니다
      </div>
    </main>
  );
}
