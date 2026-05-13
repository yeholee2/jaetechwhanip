import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { PageHero, Badge, Chip } from '@/components/ui';
import { PageSidebar } from '@/components/PageSidebar';
import { getFeaturedActiveSparring, listSparrings } from '@/lib/sparring';
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

type FeedSearchParams = { category?: string; tab?: string };

type FeedTab = 'all' | 'q' | 'news' | 'report';

const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'q', label: '질문' },
  { key: 'news', label: '뉴스' },
  { key: 'report', label: '리포트' },
];

function getActiveTab(searchParams?: FeedSearchParams): FeedTab {
  const raw = searchParams?.tab;
  if (raw === 'q' || raw === 'news' || raw === 'report') return raw;
  return 'all';
}

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
  const activeTab = getActiveTab(searchParams);
  const [allItems, sparringRes] = await Promise.all([
    fetchFeedItems(),
    listSparrings(),
  ]);
  const featured = getFeaturedActiveSparring(sparringRes.sparrings);
  const items = allItems.filter(item => {
    const categoryMatches = activeCategory === '전체' || item.category === activeCategory;
    if (!categoryMatches) return false;
    // 탭 필터: 질문 = question, 뉴스 = news + column(한입 칼럼·리포트 통합), 전체 = 모두
    if (activeTab === 'q') return item.type === 'question';
    if (activeTab === 'news') return item.type === 'news' || item.type === 'column';
    if (activeTab === 'report') return item.type === 'report';
    return true;
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
      <main className="pc-layout">
        <div className="pc-layout-main">
        <PageHero
          eyebrow="피드"
          title="질문 · 뉴스 · 리포트 · 칼럼"
          lead="ETF 매수 전 필요한 글을 한 흐름으로 모았어요."
          aside={
            <>
              <Badge tone="neutral">글 {articleCount}</Badge>
              <Badge tone="primary">{activeCategory === '전체' ? '전체' : activeCategory}</Badge>
            </>
          }
        />

        <section className={styles.filters} aria-label="피드 필터">
          <div className={styles.feedTabs}>
            {FEED_TABS.map(tab => (
              <Link
                key={tab.key}
                href={feedFilterHref(activeCategory, tab.key)}
                className={`${styles.feedTab} ${activeTab === tab.key ? styles.feedTabActive : ''}`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
          <div className={styles.categoryChips}>
            {FEED_CATEGORY_FILTERS.map(category => (
              <Chip
                key={category.key}
                href={feedFilterHref(category.key, activeTab)}
                active={activeCategory === category.key}
                size="sm"
              >
                {category.label}
              </Chip>
            ))}
          </div>
        </section>

        <section className={styles.grid} aria-label="피드 목록">
          {items.length === 0 && (
            <div className={styles.empty}>아직 이 조건에 맞는 피드가 없어요.</div>
          )}
          {items.map(item => <FeedCard key={feedItemKey(item)} item={item} />)}
        </section>
        </div>
        <PageSidebar widgets={['sparring', 'watch', 'help']} featuredSparring={featured} />
      </main>
    </AppShell>
  );
}

function feedFilterHref(category: string, tab: FeedTab = 'all') {
  const params = new URLSearchParams();
  if (category !== '전체') params.set('category', category);
  if (tab !== 'all') params.set('tab', tab);
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
  return `${item.type}:${item.slug}`;
}

function FeedCard({ item }: { item: FeedItem }) {
  if (item.type === 'question') return <QuestionFeedCard item={item} />;
  if (item.type === 'news') return <NewsFeedCard item={item} />;
  if (item.type === 'report') return <ReportFeedCard item={item} />;
  return <ColumnFeedCard item={item} />;
}

function ColumnFeedCard({ item }: { item: Extract<FeedItem, { type: 'column' }> }) {
  const digest = createFeedDigest(item);
  const href = articleUrl(item.slug);
  const thumbUrl = item.thumbnailUrl || null;
  const metrics = getFeedMetrics(item);
  const fresh = isFresh(item.publishedAt);
  const thumbTone = getThumbnailTone(item.category);
  const thumbIcon = getThumbnailIcon(item.category);
  return (
    <Link className={`${styles.feedCard} ${styles.columnCard}`} href={href}>
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
            <Badge tone="success">✍️ 칼럼</Badge>
            {fresh && <Badge tone="fresh">NEW</Badge>}
            <span className={styles.categoryLabel}>{item.category}</span>
          </span>
        </div>
        <h2>{item.title}</h2>
        <p className={styles.digestLead}>{digest.oneLine}</p>
        <div className={styles.insightLine}>
          <strong>핵심 포인트</strong>
          <span>{digest.why}</span>
        </div>
        <div className={styles.byline}>
          <span className={styles.author}>
            <span className={styles.avatar}>E</span>
            <span>에디터 · {formatRelativeDate(item.publishedAt)}</span>
          </span>
          <span className={styles.metrics}>
            <span><FaIcon name="heart" variant="regular" size={13} /> {metrics.likes}</span>
            <span><FaIcon name="comment" variant="regular" size={13} /> {metrics.comments}</span>
            <span><FaIcon name="eye" variant="regular" size={13} /> {formatCompact(metrics.views)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function QuestionFeedCard({ item }: { item: Extract<FeedItem, { type: 'question' }> }) {
  const fresh = isFresh(item.publishedAt);
  const thumbTone = getThumbnailTone(item.category);
  return (
    <Link className={`${styles.feedCard} ${styles.questionCard}`} href={`/q/${item.slug}`}>
      <div className={`${styles.thumb} ${thumbTone}`} aria-hidden="true">
        <FaIcon name="circle-question" size={28} />
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span className={styles.badgeLine}>
            <Badge tone="primary">🦊 질문</Badge>
            {fresh && <Badge tone="fresh">NEW</Badge>}
            <span className={styles.categoryLabel}>{item.category}</span>
          </span>
        </div>
        <h2>{item.title}</h2>
        {item.description && <p className={styles.digestLead}>{item.description}</p>}
        <div className={styles.byline}>
          <span className={styles.author}>
            <span className={styles.avatar}>{item.authorName[0] || 'U'}</span>
            <span>{item.authorName} · {formatRelativeDate(item.publishedAt)}</span>
          </span>
          <span className={styles.metrics}>
            <span><FaIcon name="comment" variant="regular" size={13} /> 답변 {item.answerCount}</span>
            <span><FaIcon name="heart" variant="regular" size={13} /> {item.likeCount}</span>
            <span><FaIcon name="eye" variant="regular" size={13} /> {formatCompact(item.viewCount)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function NewsFeedCard({ item }: { item: Extract<FeedItem, { type: 'news' }> }) {
  const thumbTone = getThumbnailTone(item.category);
  return (
    <a
      className={`${styles.feedCard} ${styles.newsCard}`}
      href={item.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={`${styles.thumb} ${thumbTone}`} aria-hidden="true">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" />
        ) : (
          <FaIcon name="newspaper" size={28} />
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span className={styles.badgeLine}>
            <Badge tone="orange">📰 뉴스</Badge>
            <span className={styles.categoryLabel}>{item.category}</span>
            <span className={styles.sourceName}>{item.sourceName}</span>
          </span>
        </div>
        <h2>{item.title}</h2>
        {item.description && <p className={styles.digestLead}>{item.description}</p>}
        <div className={styles.byline}>
          <span className={styles.author}>
            <span>{formatRelativeDate(item.publishedAt)}</span>
          </span>
          <span className={styles.metrics} style={{ color: 'var(--rw-primary)', fontWeight: 700 }}>
            원문 보기 ↗
          </span>
        </div>
      </div>
    </a>
  );
}

function ReportFeedCard({ item }: { item: Extract<FeedItem, { type: 'report' }> }) {
  const thumbTone = getThumbnailTone(item.category);
  return (
    <a
      className={`${styles.feedCard} ${styles.reportCard}`}
      href={item.originalUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className={`${styles.thumb} ${thumbTone}`} aria-hidden="true">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" />
        ) : (
          <FaIcon name="chart-column" size={28} />
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span className={styles.badgeLine}>
            <Badge tone="purple">📊 리포트</Badge>
            <span className={styles.categoryLabel}>{item.category}</span>
            <span className={styles.sourceName}>{item.sourceName}</span>
          </span>
        </div>
        <h2>{item.title}</h2>
        {item.description && <p className={styles.digestLead}>{item.description}</p>}
        <div className={styles.byline}>
          <span className={styles.author}>
            <span>{formatRelativeDate(item.publishedAt)}</span>
          </span>
          <span className={styles.metrics} style={{ color: 'var(--rw-primary)', fontWeight: 700 }}>
            원문 보기 ↗
          </span>
        </div>
      </div>
    </a>
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

function getThumbnailIcon(category: string) {
  if (category === '국내주식·ETF') return 'chart-line';
  if (category === '해외주식·ETF') return 'globe';
  if (category === '절세') return 'landmark';
  if (category === '보험') return 'shield-halved';
  if (category === '대출·부채') return 'credit-card';
  return 'coins';
}
