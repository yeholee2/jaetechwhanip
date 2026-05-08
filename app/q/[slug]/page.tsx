import { Metadata } from 'next';
import { sampleQuestions } from '@/lib/sampleData';
import QuestionClient from './QuestionClient';

type Props = { params: { slug: string } };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fallback = sampleQuestions.find(item => item.slug === params.slug);
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPA_URL || !SUPA_KEY) {
    return fallback
      ? { title: `${fallback.title} | 재테크한입`, description: fallback.body.slice(0, 120) }
      : { title: '재테크한입' };
  }

  try {
    const column = UUID_RE.test(params.slug) ? 'id' : 'slug';
    const res = await fetch(
      `${SUPA_URL}/rest/v1/questions?${column}=eq.${encodeURIComponent(params.slug)}&select=title,body,category&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, next: { revalidate: 60 } }
    );
    const data = await res.json();
    const q = data?.[0] || fallback;
    if (!q) return { title: '재테크한입' };
    return {
      title: `${q.title} | 재테크한입`,
      description: q.body?.slice(0, 120) || q.title,
      openGraph: {
        title: q.title,
        description: q.body?.slice(0, 120) || q.title,
        siteName: '재테크한입',
        type: 'article',
      },
    };
  } catch { return { title: '재테크한입' }; }
}

export default function QuestionPage({ params }: Props) {
  return <QuestionClient slug={params.slug} />;
}
