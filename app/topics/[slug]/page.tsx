import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { MessageCircle, Search } from 'lucide-react';
import { AppShell, UnifiedFilterBar } from '@/components/AppShell';
import { CATEGORY_FILTERS, TOPIC_TABS } from '@/lib/ia';
import { questionPath, SITE_NAME, SITE_URL, truncateDescription } from '@/lib/seo';
import { fetchTopicQuestions, getTopicBySlug, TOPICS, topicPath, topicUrl } from '@/lib/topics';
import { getTopicExtras } from '@/lib/topic-content';
import { etfPath } from '@/lib/etfs';
import { EtfLogo } from '@/app/etf/EtfLogo';
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
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: questions.slice(0, 20).map((question, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}${questionPath(question.slug)}`,
        name: question.title,
      })),
    },
  };
}

export default async function TopicPage({ params }: Props) {
  const topic = getTopicBySlug(params.slug);
  if (!topic) notFound();
  if (params.slug !== topic.slug) permanentRedirect(topicPath(topic.slug));

  const questions = await fetchTopicQuestions(topic);
  const extras = getTopicExtras(topic.category, topic.keywords);

  // 인기 질문 TOP 10 — answer_count + like_count 가중치
  const popular = [...questions]
    .sort((a, b) => ((b.answerCount || 0) * 2 + (b.likeCount || 0)) - ((a.answerCount || 0) * 2 + (a.likeCount || 0)))
    .slice(0, 10);

  return (
    <AppShell active="topics">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd(topic, questions)).replace(/</g, '\\u003c'),
        }}
      />

      <header className={styles.header}>
        <span className={styles.eyebrow}>토픽 · {topic.emoji} {topic.label}</span>
        <h1>{topic.title} 모음</h1>
        <p>{extras.intro || topic.description}</p>
      </header>

      <UnifiedFilterBar
        tabs={TOPIC_TABS}
        activeTab="popular"
        categories={CATEGORY_FILTERS}
        activeCategory={topic.category}
      />

      <section className={styles.topicGrid} aria-label="재테크 토픽">
        {TOPICS.map(item => (
          <Link key={item.slug} href={topicPath(item.slug)} className={item.slug === topic.slug ? styles.topicOn : ''}>
            {item.category}
          </Link>
        ))}
      </section>

      {/* 핵심 질문 TOP 10 */}
      {popular.length > 0 && (
        <section className={styles.popularSection} aria-label="이 분야 핵심 질문">
          <h2 className={styles.sectionTitle}>이 분야 핵심 질문 TOP 10</h2>
          <ol className={styles.popularList}>
            {popular.map((q, i) => (
              <li key={q.slug}>
                <Link href={questionPath(q.slug)}>
                  <span className={styles.popularRank}>{i + 1}</span>
                  <div className={styles.popularBody}>
                    <strong>{q.title}</strong>
                    <span>답변 {q.answerCount || 0}개 · 추천 {q.likeCount || 0}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* 관련 ETF */}
      {extras.etfs.length > 0 && (
        <section className={styles.etfSection} aria-label="관련 ETF">
          <div className={styles.etfHead}>
            <h2 className={styles.sectionTitle}>이 토픽 관련 ETF</h2>
            <Link href="/etf/all" className={styles.moreLink}>전체 ETF →</Link>
          </div>
          <div className={styles.etfGrid}>
            {extras.etfs.map(etf => (
              <Link key={etf.code} href={etfPath(etf.slug)} className={styles.etfCard}>
                <EtfLogo name={etf.shortName} code={etf.code} size={36} />
                <div className={styles.etfInfo}>
                  <strong>{etf.shortName}</strong>
                  <span>{etf.theme} · {etf.fee}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 핵심 용어집 */}
      {extras.glossary.length > 0 && (
        <section className={styles.glossarySection} aria-label="핵심 용어">
          <h2 className={styles.sectionTitle}>핵심 용어 정리</h2>
          <dl className={styles.glossaryList}>
            {extras.glossary.map(g => (
              <div key={g.title} className={styles.glossaryItem}>
                <dt>{g.title}</dt>
                <dd>{g.body}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

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
    </AppShell>
  );
}
