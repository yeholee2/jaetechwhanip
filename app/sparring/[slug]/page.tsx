import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSparringDetail } from '@/lib/sparrings';
import SparringDetailClient from './SparringDetailClient';

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchSparringDetail(params.slug);
  if (!data.sparring) {
    return { title: '스파링을 찾을 수 없어요' };
  }

  return {
    title: `${data.sparring.title} | 머니 스파링`,
    description: data.sparring.body,
    alternates: {
      canonical: `/sparring/${data.sparring.slug}`,
    },
    openGraph: {
      title: `${data.sparring.title} | 재테크한입`,
      description: data.sparring.body,
      url: `/sparring/${data.sparring.slug}`,
      type: 'article',
    },
  };
}

export default async function SparringDetailPage({ params }: Props) {
  const data = await fetchSparringDetail(params.slug);
  if (!data.sparring) notFound();

  return (
    <SparringDetailClient
      sparring={data.sparring}
      initialComments={data.comments}
      related={data.related}
    />
  );
}
