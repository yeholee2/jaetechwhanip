import { Metadata } from 'next';
import {
  fetchQuestionForSeo,
  questionPath,
  questionUrl,
  SITE_NAME,
  SITE_URL,
  truncateDescription,
} from '@/lib/seo';
import QuestionClient from './QuestionClient';

type Props = { params: { slug: string } };
type QuestionForSeo = NonNullable<Awaited<ReturnType<typeof fetchQuestionForSeo>>>;

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const question = await fetchQuestionForSeo(params.slug);

  if (!question) {
    return {
      title: '질문을 찾을 수 없어요',
      robots: { index: false, follow: true },
    };
  }

  const description = truncateDescription(question.body || question.title);
  const canonicalPath = questionPath(question.slug);

  return {
    title: question.title,
    description,
    keywords: [question.category, '재테크 질문', '금융 Q&A', SITE_NAME].filter(Boolean) as string[],
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: question.title,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: question.createdAt,
      section: question.category,
    },
    twitter: {
      card: 'summary',
      title: question.title,
      description,
    },
  };
}

function jsonLdForQuestion(question: QuestionForSeo) {
  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: question.title,
      text: question.body,
      url: questionUrl(question.slug),
      dateCreated: question.createdAt,
      answerCount: question.answerCount ?? 0,
      upvoteCount: question.likeCount ?? 0,
      about: question.category,
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
  };
}

export default async function QuestionPage({ params }: Props) {
  const question = await fetchQuestionForSeo(params.slug);

  return (
    <>
      {question ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdForQuestion(question)).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      <QuestionClient slug={params.slug} />
    </>
  );
}
