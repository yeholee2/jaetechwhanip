import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { getSparringBySlug, sparringPath } from '@/lib/sparring';
import type { Sparring } from '@/lib/sparring';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import {
  buildSparringSeoDescription,
  buildSparringSeoKeywords,
  buildSparringSeoTitle,
} from '@/lib/seo-content';
import SparringDetailClient from './SparringDetailClient';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { sparring } = await getSparringBySlug(params.slug);

  if (!sparring) {
    return {
      title: '스파링',
      description: '재테크 결정을 투표와 댓글로 검증해요.',
    };
  }

  const title = buildSparringSeoTitle(sparring);
  const description = buildSparringSeoDescription(sparring);
  const canonicalPath = sparringPath(sparring.slug);

  return {
    title,
    description,
    keywords: buildSparringSeoKeywords(sparring),
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: sparring.created_at,
      section: sparring.category,
      images: sparring.thumbnail_url ? [{ url: sparring.thumbnail_url, alt: sparring.title }] : undefined,
    },
    twitter: {
      card: sparring.thumbnail_url ? 'summary_large_image' : 'summary',
      title,
      description,
      images: sparring.thumbnail_url ? [sparring.thumbnail_url] : undefined,
    },
  };
}

function sparringJsonLd(sparring: Sparring) {
  const pagePath = sparringPath(sparring.slug);

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'DiscussionForumPosting',
      headline: sparring.title,
      description: buildSparringSeoDescription(sparring),
      url: `${SITE_URL}${pagePath}`,
      datePublished: sparring.created_at,
      articleSection: sparring.category,
      keywords: buildSparringSeoKeywords(sparring).join(', '),
      inLanguage: 'ko-KR',
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
      interactionStatistic: [
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/VoteAction',
          userInteractionCount: sparring.stats.votes_total,
        },
        {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/CommentAction',
          userInteractionCount: sparring.stats.comment_count,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: SITE_NAME,
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '머니 스파링',
          item: `${SITE_URL}/sparring`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: sparring.title,
          item: `${SITE_URL}${pagePath}`,
        },
      ],
    },
  ];
}

export default async function SparringDetailPage({ params }: { params: { slug: string } }) {
  const { sparring, comments, otherActive, usingFallback } = await getSparringBySlug(params.slug);

  if (!sparring) notFound();

  return (
    <AppShell active="sparring" wide>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(sparringJsonLd(sparring)).replace(/</g, '\\u003c'),
        }}
      />
      <SparringDetailClient
        sparring={sparring}
        initialComments={comments}
        otherActive={otherActive}
        usingFallback={usingFallback}
      />
    </AppShell>
  );
}
