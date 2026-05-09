import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { CATEGORY_FILTERS } from '@/lib/ia';
import { FEED_URL, fetchNewsItems, toFeedItems, articleUrl } from '@/lib/feed';
import type { FeedItem } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import styles from './FeedPage.module.css';

const SOURCE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'column', label: '한입 칼럼' },
  { key: 'news', label: '뉴스' },
];

export const metadata: Metadata = {
  title: '재테크 피드',
  description: '한입 자체 칼럼과 금융 뉴스 RSS를 한 흐름에서 읽는 재테크한입 피드입니다.',
  alternates: {
    canonical: FEED_URL,
  },
  openGraph: {
    title: `재테크 피드 | ${SITE_NAME}`,
    description: '질문 전에 읽으면 좋은 재테크 칼럼과 시장 소식을 모았습니다.',
    url: FEED_URL,
    type: 'website',
  },
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: { source?: string; category?: string };
}) {
  const activeSource = SOURCE_FILTERS.some(item => item.key === searchParams?.source)
    ? searchParams?.source || 'all'
    : 'all';
  const activeCategory = searchParams?.category || '전체';
  const newsItems = await fetchNewsItems();
  const items = toFeedItems(newsItems).filter(item => {
    const sourceMatches = activeSource === 'all' || item.type === activeSource;
    const categoryMatches = activeCategory === '전체' || item.category === activeCategory;
    return sourceMatches && categoryMatches;
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 피드',
    url: FEED_URL,
    inLanguage: 'ko-KR',
    hasPart: items.slice(0, 20).map((item, index) => ({
      '@type': item.type === 'column' ? 'Article' : 'NewsArticle',
      position: index + 1,
      headline: item.title,
      description: item.type === 'column' ? item.description : item.summary,
      datePublished: item.publishedAt,
      articleSection: item.category,
    })),
  };

  return (
    <AppShell active="feed">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>피드</div>
          <h1>한입 칼럼과 시장 소식을 한 흐름에서 읽어요</h1>
          <p>
            자체 칼럼은 깊게, 외부 뉴스는 빠르게. 질문으로 이어질 만한 재테크 신호만
            토픽별로 모아 보여줘요.
          </p>
        </div>
      </section>

      <section className={styles.filters} aria-label="피드 필터">
        <div className={styles.filterRow}>
          {SOURCE_FILTERS.map(filter => (
            <Link
              key={filter.key}
              href={feedFilterHref(filter.key, activeCategory)}
              className={activeSource === filter.key ? styles.on : ''}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <div className={styles.filterRow}>
          {CATEGORY_FILTERS.map(category => (
            <Link
              key={category.key}
              href={feedFilterHref(activeSource, category.key)}
              className={activeCategory === category.key ? styles.on : ''}
            >
              {category.label}
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.grid} aria-label="피드 목록">
        {items.length === 0 && (
          <div className={styles.empty}>아직 이 조건에 맞는 피드가 없어요.</div>
        )}
        {items.map(item => <FeedCard key={feedItemKey(item)} item={item} />)}
      </section>
    </AppShell>
  );
}

function feedFilterHref(source: string, category: string) {
  const params = new URLSearchParams();
  if (source !== 'all') params.set('source', source);
  if (category !== '전체') params.set('category', category);
  const query = params.toString();
  return query ? `/feed?${query}` : '/feed';
}

function feedItemKey(item: FeedItem) {
  return item.type === 'column' ? `column:${item.slug}` : `news:${item.url}`;
}

function FeedCard({ item }: { item: FeedItem }) {
  if (item.type === 'news') {
    return (
      <a className={styles.card} href={item.url} target="_blank" rel="noreferrer">
        <div className={styles.meta}>
          <span className={styles.newsSource}>{item.source} · {item.category}</span>
          <span className={styles.external}>원문 보기</span>
        </div>
        <h2>{item.title}</h2>
        <p>{item.summary}</p>
        <div className={styles.tags}>
          <span>뉴스</span>
        </div>
      </a>
    );
  }

  return (
    <Link className={styles.card} href={articleUrl(item.slug)}>
      <div className={styles.meta}>
        <span className={styles.source}>한입 칼럼 · {item.category}</span>
        <span>{item.readingTime} 읽기</span>
      </div>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <div className={styles.tags}>
        {item.tags.map(tag => <span key={tag}>{tag}</span>)}
      </div>
    </Link>
  );
}

