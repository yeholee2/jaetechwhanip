import { Metadata } from 'next';
import {
  fetchQuestionForSeo,
  isIndexableQuestion,
  questionPath,
  questionUrl,
  SITE_NAME,
  SITE_URL,
  truncateDescription,
} from '@/lib/seo';
import { fetchQuestionPageData, type AnswerDetail, type QuestionDetail } from '@/lib/question-detail';
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
  const shouldIndex = isIndexableQuestion(question);

  return {
    title: question.title,
    description,
    keywords: [question.category, '재테크 질문', '금융 Q&A', SITE_NAME].filter(Boolean) as string[],
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: shouldIndex,
      follow: true,
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

function answerJsonLd(answer: AnswerDetail, pageUrl: string) {
  return {
    '@type': 'Answer',
    text: answer.body,
    dateCreated: answer.created_at,
    upvoteCount: answer.like_count ?? 0,
    url: `${pageUrl}#answer-${encodeURIComponent(answer.id)}`,
    author: {
      '@type': 'Person',
      name: answer.users?.name || '재테크한입 사용자',
    },
  };
}

function jsonLdForQuestion(question: QuestionForSeo | QuestionDetail, answers: AnswerDetail[] = []) {
  const normalized = question as QuestionForSeo & Partial<QuestionDetail>;
  const createdAt = normalized.createdAt ?? normalized.created_at;
  const answerCount = normalized.answerCount ?? normalized.answer_count;
  const likeCount = normalized.likeCount ?? normalized.like_count;
  const acceptedAnswer = answers.find(answer => answer.is_adopted);
  const suggestedAnswers = answers.filter(answer => !answer.is_adopted && answer.body?.trim());
  const pageUrl = questionUrl(question.slug);

  const mainEntity: Record<string, unknown> = {
    '@type': 'Question',
    name: question.title,
    text: question.body,
    url: pageUrl,
    dateCreated: createdAt,
    answerCount: answerCount ?? answers.length,
    upvoteCount: likeCount ?? 0,
    about: question.category,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  if (acceptedAnswer) mainEntity.acceptedAnswer = answerJsonLd(acceptedAnswer, pageUrl);
  if (suggestedAnswers.length > 0) mainEntity.suggestedAnswer = suggestedAnswers.map(answer => answerJsonLd(answer, pageUrl));

  return {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity,
  };
}

export default async function QuestionPage({ params }: Props) {
  const pageData = await fetchQuestionPageData(params.slug);
  const question = pageData.question;
  const shouldIndex = question ? isIndexableQuestion({ title: question.title, body: question.body }) : false;

  return (
    <>
      {question && shouldIndex ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdForQuestion(question, pageData.answers)).replace(/</g, '\\u003c'),
          }}
        />
      ) : null}
      <QuestionClient
        slug={params.slug}
        initialQuestion={pageData.question}
        initialAnswers={pageData.answers}
        initialRelated={pageData.related}
      />
    </>
  );
}
