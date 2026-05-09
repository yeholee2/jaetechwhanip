import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Newspaper, Search, Swords } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import BookmarkButton from '@/components/bookmark/BookmarkButton';
import FollowButton from '@/components/follow/FollowButton';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { articleUrl, fetchFeedItems, newsClickUrl } from '@/lib/feed';
import type { FeedItem } from '@/lib/feed';
import { listSparrings, type Sparring } from '@/lib/sparring';
import { questionPath, SITE_NAME, SITE_URL, truncateDescription, type SeoQuestion } from '@/lib/seo';
import { fetchTopicQuestions, getTopicBySlug, TOPICS, topicPath, topicUrl } from '@/lib/topics';
import styles from './TopicPage.module.css';

type Props = {
  params: { slug: string };
  searchParams?: { tab?: string };
};

type TopicTab = 'questions' | 'sparring' | 'feed' | 'popular';

const TABS: Array<{ key: TopicTab; label: string }> = [
  { key: 'questions', label: '질문' },
  { key: 'sparring', label: '스파링' },
  { key: 'feed', label: '피드' },
  { key: 'popular', label: '인기' },
];

export const revalidate = 300;

export function generateStaticParams() {
  return CATEGORY_DEFINITIONS.flatMap(category => [
    { slug: category.slug },
    { slug: category.key },
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = getTopicBySlug(params.slug);
  if (!topic) return { title: '토픽을 찾을 수 없어요', robots: { index: false, follow: true } };

  return {
    title: `${topic.label} 토픽`,
    description: topic.description,
    keywords: [...topic.keywords, '재테크 질문', SITE_NAME],
    alternates: {
      canonical: topicPath(topic.slug),
    },
    openGraph: {
      title: `${topic.label} 토픽`,
      description: topic.description,
      url: topicPath(topic.slug),
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
  };
}

function collectionJsonLd(topic: NonNullable<ReturnType<typeof getTopicBySlug>>, questions: SeoQuestion[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${topic.label} 토픽`,
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

export default async function TopicPage({ params, searchParams }: Props) {
  const topic = getTopicBySlug(params.slug);
  if (!topic) notFound();

  const activeTab = TABS.some(tab => tab.key === searchParams?.tab)
    ? searchParams?.tab as TopicTab
    : 'questions';

  const [questions, sparringResult, feedItems] = await Promise.all([
    fetchTopicQuestions(topic),
    listSparrings(),
    fetchFeedItems(),
  ]);

  const sparrings = sparringResult.sparrings.filter(item => item.category === topic.category);
  const feeds = feedItems.filter(item => item.category === topic.category);
  const popular = [
    ...questions.slice(0, 4).map(item => ({ type: 'question' as const, item })),
    ...sparrings.slice(0, 3).map(item => ({ type: 'sparring' as const, item })),
    ...feeds.slice(0, 3).map(item => ({ type: 'feed' as const, item })),
  ];

  return (
    <AppShell active="topics">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionJsonLd(topic, questions)).replace(/</g, '\\u003c'),
        }}
      />

      <header className={styles.header}>
        <div className={styles.emoji} aria-hidden="true">{topic.emoji}</div>
        <div>
          <span className={styles.eyebrow}>토픽</span>
          <h1>{topic.label}</h1>
          <p>{topic.description}</p>
        </div>
      </header>

      <div className={styles.actions}>
        <FollowButton targetType="topic" targetId={topic.category} title={topic.label} />
        <Link className={styles.askButton} href={`/auth?next=/topics/${encodeURIComponent(params.slug)}`}>질문하기</Link>
      </div>

      <nav className={styles.tabs} aria-label="토픽 탭">
        {TABS.map(tab => (
          <Link
            key={tab.key}
            href={tab.key === 'questions' ? topicPath(params.slug) : `${topicPath(params.slug)}?tab=${tab.key}`}
            className={activeTab === tab.key ? styles.tabOn : ''}
          >
            {tab.label}
            <span>{tabCount(tab.key, questions, sparrings, feeds, popular)}</span>
          </Link>
        ))}
      </nav>

      <section className={styles.topicGrid} aria-label="재테크 토픽">
        {TOPICS.map(item => (
          <Link key={item.slug} href={topicPath(item.slug)} className={item.category === topic.category ? styles.topicOn : ''}>
            <span>{item.emoji}</span>{item.label}
          </Link>
        ))}
      </section>

      <section className={styles.list} aria-label={`${topic.label} 콘텐츠`}>
        {activeTab === 'questions' && (
          questions.length > 0 ? questions.map(question => <QuestionRow key={question.slug} question={question} />) : <Empty label="아직 공개할 질문이 적어요" />
        )}
        {activeTab === 'sparring' && (
          sparrings.length > 0 ? sparrings.map(sparring => <SparringRow key={sparring.id} sparring={sparring} />) : <Empty label="아직 이 토픽의 스파링이 없어요" />
        )}
        {activeTab === 'feed' && (
          feeds.length > 0 ? feeds.map(item => <FeedRow key={feedKey(item)} item={item} />) : <Empty label="아직 이 토픽의 피드가 없어요" />
        )}
        {activeTab === 'popular' && (
          popular.length > 0 ? popular.map(entry => (
            entry.type === 'question'
              ? <QuestionRow key={`q:${entry.item.slug}`} question={entry.item} />
              : entry.type === 'sparring'
                ? <SparringRow key={`s:${entry.item.id}`} sparring={entry.item} />
                : <FeedRow key={`f:${feedKey(entry.item)}`} item={entry.item} />
          )) : <Empty label="아직 인기 콘텐츠가 없어요" />
        )}
      </section>
    </AppShell>
  );
}

function tabCount(tab: TopicTab, questions: SeoQuestion[], sparrings: Sparring[], feeds: FeedItem[], popular: unknown[]) {
  if (tab === 'questions') return questions.length;
  if (tab === 'sparring') return sparrings.length;
  if (tab === 'feed') return feeds.length;
  return popular.length;
}

function QuestionRow({ question }: { question: SeoQuestion }) {
  const href = questionPath(question.slug);
  return (
    <article className={styles.row}>
      <Link href={href} className={styles.rowLink}>
        <span className={styles.type}>질문 · {question.category}</span>
        <h2>{question.title}</h2>
        <p>{truncateDescription(question.body, 110)}</p>
        <em><MessageCircle size={14} /> 답변 {question.answerCount || 0}개</em>
      </Link>
      <BookmarkButton targetType="question" targetId={question.slug} title={question.title} href={href} category={question.category} />
    </article>
  );
}

function SparringRow({ sparring }: { sparring: Sparring }) {
  const href = `/sparring/${sparring.slug}`;
  return (
    <article className={styles.row}>
      <Link href={href} className={styles.rowLink}>
        <span className={styles.type}><Swords size={14} /> 스파링 · {sparring.round_number} 라운드</span>
        <h2>{sparring.title}</h2>
        <p>{sparring.side_a_label} vs {sparring.side_b_label}</p>
        <em>{sparring.stats.votes_total.toLocaleString('ko-KR')}명 투표 · 토론 {sparring.stats.comment_count}개</em>
      </Link>
      <BookmarkButton targetType="sparring" targetId={sparring.slug} title={sparring.title} href={href} category={sparring.category} />
    </article>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const isColumn = item.type === 'column';
  const href = isColumn ? articleUrl(item.slug) : newsClickUrl(item.url);
  const title = item.title;
  const body = isColumn ? item.description : item.summary;

  return (
    <article className={styles.row}>
      <a href={href} className={styles.rowLink} target={isColumn ? undefined : '_blank'} rel={isColumn ? undefined : 'noreferrer'}>
        <span className={styles.type}><Newspaper size={14} /> 피드 · {item.category}</span>
        <h2>{title}</h2>
        <p>{truncateDescription(body, 110)}</p>
        <em>{isColumn ? item.readingTime : item.source}</em>
      </a>
      <BookmarkButton targetType="column" targetId={isColumn ? item.slug : item.url} title={title} href={href} category={item.category} />
    </article>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className={styles.empty}>
      <Search size={28} />
      <strong>{label}</strong>
      <p>좋은 질문과 답변이 쌓이면 자동으로 노출돼요.</p>
    </div>
  );
}

function feedKey(item: FeedItem) {
  return item.type === 'column' ? `column:${item.slug}` : `news:${item.url}`;
}
