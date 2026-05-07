import { Metadata } from 'next';
import QuestionClient from './QuestionClient';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPA_URL || !SUPA_KEY) return { title: '재테크한입' };

  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/questions?slug=eq.${params.slug}&select=title,body,category&limit=1`,
      { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }, next: { revalidate: 60 } }
    );
    const data = await res.json();
    const q = data?.[0];
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
