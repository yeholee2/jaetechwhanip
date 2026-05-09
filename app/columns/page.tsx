import type { Metadata } from 'next';
import { AppShell, UnifiedFilterBar } from '@/components/AppShell';
import { columnArticles, COLUMN_URL } from '@/lib/columns';
import { CATEGORY_FILTERS, COLUMN_TABS } from '@/lib/ia';
import { SITE_NAME } from '@/lib/seo';
import styles from './ColumnsPage.module.css';

export const metadata: Metadata = {
  title: '재테크 칼럼',
  description: '주식, ETF, 절세, 보험, 대출을 처음 시작하는 사람이 바로 읽을 수 있는 재테크한입 칼럼 모음입니다.',
  alternates: {
    canonical: COLUMN_URL,
  },
  openGraph: {
    title: `재테크 칼럼 | ${SITE_NAME}`,
    description: '질문 전에 읽으면 좋은 주식·ETF·절세 칼럼을 모았습니다.',
    url: COLUMN_URL,
    type: 'website',
  },
};

export default function ColumnsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 칼럼',
    url: COLUMN_URL,
    inLanguage: 'ko-KR',
    hasPart: columnArticles.map((article, index) => ({
      '@type': 'Article',
      position: index + 1,
      headline: article.title,
      description: article.description,
      datePublished: article.publishedAt,
      articleSection: article.category,
      keywords: article.tags.join(', '),
    })),
  };

  return (
    <AppShell active="columns">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>칼럼</div>
          <h1>질문하기 전에 한입만 읽어도 돈 고민이 선명해져요</h1>
          <p>
            질문에서 자주 막히는 부분을 칼럼으로 먼저 정리하고,
            더 구체적인 상황은 Q&A와 스파링으로 이어가요.
          </p>
        </div>
      </section>

      <UnifiedFilterBar
        tabs={COLUMN_TABS}
        activeTab="recommended"
        categories={CATEGORY_FILTERS}
        activeCategory="전체"
      />

      <section className={styles.grid} aria-label="칼럼 목록">
        {columnArticles.map(article => (
          <article key={article.slug} className={styles.card}>
            <div className={styles.meta}>
              <span className={styles.category}>{article.category}</span>
              <span>{article.readingTime} 읽기</span>
            </div>
            <h2>{article.title}</h2>
            <p>{article.description}</p>
            <div className={styles.tags}>
              {article.tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
