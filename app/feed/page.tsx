import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { createFeedDigest } from '@/lib/feed-digest';
import {
  FEED_CATEGORY_FILTERS,
  FEED_URL,
  articleUrl,
  fetchFeedItems,
  newsClickUrl,
} from '@/lib/feed';
import type { FeedItem } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import styles from './FeedPage.module.css';

const SOURCE_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'column', label: '칼럼' },
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
  const activeCategory = FEED_CATEGORY_FILTERS.some(item => item.key === searchParams?.category)
    ? searchParams?.category || '전체'
    : '전체';
  const allItems = await fetchFeedItems();
  const items = allItems.filter(item => {
    const sourceMatches = activeSource === 'all' || item.type === activeSource;
    const categoryMatches = activeCategory === '전체' || item.category === activeCategory;
    return sourceMatches && categoryMatches;
  });
  const articleCount = allItems.filter(item => item.type === 'column').length;
  const newsCount = allItems.filter(item => item.type === 'news').length;

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
    <AppShell active="feed" wide>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <section className={styles.hero}>
          <div>
            <h1>피드</h1>
            <p>한입머니 칼럼과 시장 소식을 재테크 판단 기준으로 정리했어요.</p>
          </div>
          <div className={styles.feedStats} aria-label="피드 현황">
            <span>칼럼 {articleCount}</span>
            <span>뉴스 {newsCount}</span>
            <span>{activeCategory === '전체' ? '전체' : activeCategory}</span>
          </div>
        </section>

        <section className={styles.filters} aria-label="피드 필터">
          <div className={styles.sourceTabs}>
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
          <div className={styles.categoryChips}>
            {FEED_CATEGORY_FILTERS.map(category => (
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
      </main>
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
  const digest = createFeedDigest(item);
  const sourceLabel = item.type === 'news' ? item.source : '재테크한입';
  const href = item.type === 'news' ? newsClickUrl(item.url) : articleUrl(item.slug);
  const isExternal = item.type === 'news';
  const thumbUrl = item.thumbnailUrl || null;
  const metrics = getFeedMetrics(item);
  const fresh = isFresh(item.publishedAt);
  const thumbTone = getThumbnailTone(item.category);
  const thumbIcon = getThumbnailIcon(item);
  const content = (
    <>
      <div className={`${styles.thumb} ${thumbTone}`} aria-hidden="true">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt="" />
        ) : (
          <FaIcon name={thumbIcon} size={28} />
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span className={styles.badgeLine}>
            {fresh && <span className={styles.newBadge}>NEW</span>}
            <span className={styles.categoryLabel}>{item.category}</span>
            <span className={styles.sourceName}>{sourceLabel}</span>
          </span>
          {isExternal && <FaIcon name="arrow-up-right-from-square" size={13} />}
        </div>
        <h2>{item.title}</h2>
        <p className={styles.digestLead}>{digest.oneLine}</p>
        <div className={styles.insightLine}>
          <strong>한입 포인트</strong>
          <span>{digest.why}</span>
        </div>
        <div className={styles.byline}>
          <span className={styles.author}>
            <span className={styles.avatar}>{item.type === 'news' ? sourceLabel.slice(0, 1) : '한'}</span>
            <span>{item.type === 'news' ? sourceLabel : '에디터 한입'} · {formatRelativeDate(item.publishedAt)}</span>
          </span>
          <span className={styles.metrics}>
            <span><FaIcon name="heart" variant="regular" size={13} /> {metrics.likes}</span>
            <span><FaIcon name="comment" variant="regular" size={13} /> {metrics.comments}</span>
            <span><FaIcon name="eye" variant="regular" size={13} /> {formatCompact(metrics.views)}</span>
          </span>
        </div>
      </div>
    </>
  );

  if (item.type === 'news') {
    return (
      <a className={`${styles.feedCard} ${styles.newsCard}`} href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }

  return (
    <Link className={`${styles.feedCard} ${styles.columnCard}`} href={href}>
      {content}
    </Link>
  );
}

function formatRelativeDate(value: string) {
  if (!value) return '';
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isNaN(diff) && diff >= 0) {
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function isFresh(value: string) {
  const published = new Date(value).getTime();
  if (Number.isNaN(published)) return false;
  return Date.now() - published < 1000 * 60 * 60 * 24 * 3;
}

function getFeedMetrics(item: FeedItem) {
  const seed = Array.from(item.title).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    likes: item.type === 'column' ? seed % 18 : seed % 5,
    comments: item.type === 'column' ? seed % 9 : seed % 4,
    views: Math.max(item.type === 'news' ? item.clickCount || 0 : 0, 120 + (seed % 820)),
  };
}

function formatCompact(value: number) {
  if (value >= 1000) return `${Math.round(value / 100) / 10}천`;
  return value.toLocaleString('ko-KR');
}

function getThumbnailTone(category: string) {
  if (category === '국내주식·ETF') return styles.thumbStock;
  if (category === '해외주식·ETF') return styles.thumbGlobal;
  if (category === '절세') return styles.thumbTax;
  if (category === '보험') return styles.thumbInsurance;
  if (category === '대출·부채') return styles.thumbDebt;
  return styles.thumbMoney;
}

function getThumbnailIcon(item: FeedItem) {
  if (item.type === 'news') return 'newspaper';
  if (item.category === '국내주식·ETF') return 'chart-line';
  if (item.category === '해외주식·ETF') return 'globe';
  if (item.category === '절세') return 'landmark';
  if (item.category === '보험') return 'shield-halved';
  if (item.category === '대출·부채') return 'credit-card';
  return 'coins';
}
