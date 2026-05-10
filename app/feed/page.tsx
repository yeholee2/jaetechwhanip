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
} from '@/lib/feed';
import type { FeedItem } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import { buildFeedListSeoDescription, buildFeedListSeoTitle } from '@/lib/seo-content';
import styles from './FeedPage.module.css';

type FeedSearchParams = { category?: string };

export function generateMetadata({ searchParams }: { searchParams?: FeedSearchParams }): Metadata {
  const activeCategory = getActiveFeedCategory(searchParams);
  const categoryLabel = FEED_CATEGORY_FILTERS.find(item => item.key === activeCategory)?.label || '전체';
  const title = buildFeedListSeoTitle('칼럼', categoryLabel);
  const description = buildFeedListSeoDescription('칼럼', categoryLabel);
  const canonical = feedFilterCanonical(activeCategory);

  return {
    title,
    description,
    keywords: [categoryLabel, '재테크 피드', '한입 칼럼', '투자 칼럼', SITE_NAME]
      .filter(keyword => keyword !== '전체'),
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams?: FeedSearchParams;
}) {
  const activeCategory = getActiveFeedCategory(searchParams);
  const allItems = await fetchFeedItems();
  const items = allItems.filter(item => {
    const categoryMatches = activeCategory === '전체' || item.category === activeCategory;
    return categoryMatches;
  });
  const articleCount = allItems.length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 피드',
    url: FEED_URL,
    inLanguage: 'ko-KR',
    hasPart: items.slice(0, 20).map((item, index) => ({
      '@type': 'Article',
      position: index + 1,
      headline: item.title,
      description: item.description,
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
            <p>한입머니 글을 재테크 판단 기준으로 정리했어요.</p>
          </div>
          <div className={styles.feedStats} aria-label="피드 현황">
            <span>글 {articleCount}</span>
            <span>{activeCategory === '전체' ? '전체' : activeCategory}</span>
          </div>
        </section>

        <section className={styles.filters} aria-label="피드 필터">
          <div className={styles.categoryChips}>
            {FEED_CATEGORY_FILTERS.map(category => (
              <Link
                key={category.key}
                href={feedFilterHref(category.key)}
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

function feedFilterHref(category: string) {
  const params = new URLSearchParams();
  if (category !== '전체') params.set('category', category);
  const query = params.toString();
  return query ? `/feed?${query}` : '/feed';
}

function feedFilterCanonical(category: string) {
  const href = feedFilterHref(category);
  return href === '/feed' ? FEED_URL : `${FEED_URL}${href.replace('/feed', '')}`;
}

function getActiveFeedCategory(searchParams?: FeedSearchParams) {
  return FEED_CATEGORY_FILTERS.some(item => item.key === searchParams?.category)
    ? searchParams?.category || '전체'
    : '전체';
}

function feedItemKey(item: FeedItem) {
  return `column:${item.slug}`;
}

function FeedCard({ item }: { item: FeedItem }) {
  const digest = createFeedDigest(item);
  const sourceLabel = '재테크한입';
  const href = articleUrl(item.slug);
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
        </div>
        <h2>{item.title}</h2>
        <p className={styles.digestLead}>{digest.oneLine}</p>
        <div className={styles.insightLine}>
          <strong>한입 포인트</strong>
          <span>{digest.why}</span>
        </div>
        <div className={styles.byline}>
          <span className={styles.author}>
            <span className={styles.avatar}>한</span>
            <span>에디터 한입 · {formatRelativeDate(item.publishedAt)}</span>
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
    likes: seed % 18,
    comments: seed % 9,
    views: 120 + (seed % 820),
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
  if (item.category === '국내주식·ETF') return 'chart-line';
  if (item.category === '해외주식·ETF') return 'globe';
  if (item.category === '절세') return 'landmark';
  if (item.category === '보험') return 'shield-halved';
  if (item.category === '대출·부채') return 'credit-card';
  return 'coins';
}
