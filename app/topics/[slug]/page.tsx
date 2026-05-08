import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Search } from 'lucide-react';
import { questionPath, SITE_NAME, truncateDescription } from '@/lib/seo';
import { fetchTopicQuestions, getTopicBySlug, TOPICS, topicPath, topicUrl } from '@/lib/topics';
import styles from './TopicPage.module.css';

type Props = { params: { slug: string } };

export const revalidate = 300;

export function generateStaticParams() {
  return TOPICS.map(topic => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = getTopicBySlug(params.slug);
  if (!topic) return { title: '토픽을 찾을 수 없어요', robots: { index: false, follow: true } };

  return {
    title: `${topic.title} 모음`,
    description: topic.description,
    keywords: [...topic.keywords, '재테크 질문', SITE_NAME],
    alternates: {
      canonical: topicPath(topic.slug),
    },
    openGraph: {
      title: `${topic.title} 모음`,
      description: topic.description,
      url: topicPath(topic.slug),
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${topic.title} 모음`,
      description: topic.description,
    },
  };
}

function collectionJsonLd(topic: NonNullable<ReturnType<typeof getTopicBySlug>>, questions: Awaited<ReturnType<typeof fetchTopicQuestions>>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${topic.title} 모음`,
    description: topic.description,
    url: topicUrl(topic.slug),
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: 'https://jaetechwhanip.vercel.app',
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: questions.slice(0, 20).map((question, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `https://jaetechwhanip.vercel.app${questionPath(question.slug)}`,
        name: question.title,
      })),
    },
  };
}

export default async function TopicPage({ params }: Props) {
  const topic = getTopicBySlug(params.slug);
  if (!topic) notFound();

  const questions = await fetchTopicQuestions(topic);

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd(topic, questions)).replace(/</g, '\\u003c'),
        }}
      />

      <nav className={styles.nav}>
        <Link className={`${styles.logo} logo-font`} href="/">
          재테크<em>한입</em>
        </Link>
        <div className={styles.navLinks}>
          {TOPICS.slice(0, 4).map(item => (
            <Link key={item.slug} href={topicPath(item.slug)} className={item.slug === topic.slug ? styles.active : ''}>
              {item.category}
            </Link>
          ))}
        </div>
      </nav>

      <header className={styles.header}>
        <span className={styles.eyebrow}>토픽</span>
        <h1>{topic.title} 모음</h1>
        <p>{topic.description}</p>
      </header>

      <section className={styles.topicGrid} aria-label="재테크 토픽">
        {TOPICS.map(item => (
          <Link key={item.slug} href={topicPath(item.slug)} className={item.slug === topic.slug ? styles.topicOn : ''}>
            {item.category}
          </Link>
        ))}
      </section>

      <section className={styles.list} aria-label={`${topic.title} 목록`}>
        <div className={styles.listHead}>
          <strong>{questions.length}개 질문</strong>
          <span>검색엔진과 사용자가 함께 읽기 좋은 질문만 모았어요.</span>
        </div>

        {questions.length > 0 ? questions.map(question => (
          <article key={question.slug} className={styles.card}>
            <Link href={questionPath(question.slug)}>
              <span>{question.category}</span>
              <h2>{question.title}</h2>
              <p>{truncateDescription(question.body, 110)}</p>
              <em><MessageCircle size={14} /> 답변 {question.answerCount || 0}개</em>
            </Link>
          </article>
        )) : (
          <div className={styles.empty}>
            <Search size={28} />
            <strong>아직 공개할 질문이 적어요</strong>
            <p>이 토픽에 좋은 질문과 답변이 쌓이면 자동으로 노출돼요.</p>
          </div>
        )}
      </section>
    </main>
  );
}
