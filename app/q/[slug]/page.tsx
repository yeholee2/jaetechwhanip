import { Metadata } from 'next';
import {
  isIndexableQuestion,
  questionPath,
  questionUrl,
  SITE_NAME,
  SITE_URL,
  type SeoQuestion,
} from '@/lib/seo';
import {
  buildAnswerSnippet,
  buildJsonLdQuestionText,
  buildSeoAnswerText,
  buildSeoDescription,
  buildSeoKeywords,
  buildSeoQuestionTitle,
  getAnswerCount,
  getCreatedAt,
  getLikeCount,
  getQuestionCategory,
  getQuestionTopicPath,
} from '@/lib/seo-content';
import { fetchQuestionPageData, type AnswerDetail, type QuestionDetail } from '@/lib/question-detail';
import QuestionClient from './QuestionClient';

type Props = { params: { slug: string } };

export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pageData = await fetchQuestionPageData(params.slug);
  const question = pageData.question;

  if (!question) {
    return {
      title: '질문을 찾을 수 없어요',
      robots: { index: false, follow: true },
    };
  }

  const description = buildSeoDescription(question, pageData.answers);
  const seoTitle = buildSeoQuestionTitle(question);
  const canonicalPath = questionPath(question.slug);
  const shouldIndex = isIndexableQuestion(question);
  const keywords = buildSeoKeywords(question);

  return {
    title: seoTitle,
    description,
    keywords,
    alternates: {
      canonical: canonicalPath,
    },
    robots: {
      index: shouldIndex,
      follow: true,
    },
    openGraph: {
      title: seoTitle,
      description,
      url: canonicalPath,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'article',
      publishedTime: getCreatedAt(question),
      section: getQuestionCategory(question),
    },
    twitter: {
      card: 'summary',
      title: seoTitle,
      description,
    },
  };
}

function answerJsonLd(answer: AnswerDetail, pageUrl: string) {
  return {
    '@type': 'Answer',
    text: buildSeoAnswerText(answer),
    dateCreated: answer.created_at,
    upvoteCount: answer.like_count ?? 0,
    url: `${pageUrl}#answer-${encodeURIComponent(answer.id)}`,
    author: {
      '@type': 'Person',
      name: answer.users?.name || '재테크한입 사용자',
    },
  };
}

function jsonLdForQuestion(question: SeoQuestion | QuestionDetail, answers: AnswerDetail[] = []) {
  const acceptedAnswer = answers.find(answer => answer.is_adopted);
  const suggestedAnswers = answers.filter(answer => !answer.is_adopted && answer.body?.trim());
  const pageUrl = questionUrl(question.slug);
  const answerSnippet = buildAnswerSnippet(answers);

  const mainEntity: Record<string, unknown> = {
    '@type': 'Question',
    name: buildSeoQuestionTitle(question),
    text: buildJsonLdQuestionText(question, answers),
    url: pageUrl,
    dateCreated: getCreatedAt(question),
    answerCount: Math.max(getAnswerCount(question), answers.length),
    upvoteCount: getLikeCount(question),
    about: getQuestionCategory(question),
    inLanguage: 'ko-KR',
    keywords: buildSeoKeywords(question).join(', '),
    description: buildSeoDescription(question, answers),
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  if (answerSnippet) mainEntity.abstract = answerSnippet;
  if (acceptedAnswer) mainEntity.acceptedAnswer = answerJsonLd(acceptedAnswer, pageUrl);
  if (suggestedAnswers.length > 0) mainEntity.suggestedAnswer = suggestedAnswers.map(answer => answerJsonLd(answer, pageUrl));

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'QAPage',
      mainEntity,
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
          name: getQuestionCategory(question),
          item: `${SITE_URL}${getQuestionTopicPath(question)}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: buildSeoQuestionTitle(question),
          item: pageUrl,
        },
      ],
    },
  ];
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
