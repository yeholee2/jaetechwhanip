import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { getSparringBySlug, sparringPath } from '@/lib/sparring';
import SparringDetailClient from './SparringDetailClient';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { sparring } = await getSparringBySlug(params.slug);

  if (!sparring) {
    return {
      title: '스파링',
      description: '재테크 결정을 투표와 댓글로 검증해요.',
    };
  }

  return {
    title: `${sparring.title} | 스파링`,
    description: sparring.body || '재테크 결정을 투표와 댓글로 검증해요.',
    alternates: {
      canonical: sparringPath(sparring.slug),
    },
  };
}

export default async function SparringDetailPage({ params }: { params: { slug: string } }) {
  const { sparring, comments, otherActive, usingFallback } = await getSparringBySlug(params.slug);

  if (!sparring) notFound();

  return (
    <AppShell active="sparring" wide>
      <SparringDetailClient
        sparring={sparring}
        initialComments={comments}
        otherActive={otherActive}
        usingFallback={usingFallback}
      />
    </AppShell>
  );
}
