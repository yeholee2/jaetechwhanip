import type { Metadata } from 'next';
import { AppShell, UnifiedFilterBar } from '@/components/AppShell';
import { ARTICLE_URL, hanipArticles } from '@/lib/articles';
import { ARTICLE_TABS, CATEGORY_FILTERS } from '@/lib/ia';
import { SITE_NAME } from '@/lib/seo';
import styles from './ArticlesPage.module.css';

export const metadata: Metadata = {
  title: '재테크 아티클',
  description: '주식, ETF, 절세, 보험, 대출을 처음 시작하는 사람이 바로 읽을 수 있는 재테크한입 아티클 모음입니다.',
  alternates: {
    canonical: ARTICLE_URL,
  },
  openGraph: {
    title: `재테크 아티클 | ${SITE_NAME}`,
    description: '질문 전에 읽으면 좋은 주식·ETF·절세 아티클을 모았습니다.',
    url: ARTICLE_URL,
    type: 'website',
  },
};

export default function ArticlesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 아티클',
    url: ARTICLE_URL,
    inLanguage: 'ko-KR',
    hasPart: hanipArticles.map((article, index) => ({
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
    <AppShell active="articles">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>아티클</div>
          <h1>질문하기 전에 한입만 읽어도 돈 고민이 선명해져요</h1>
          <p>
            질문에서 자주 막히는 부분을 아티클로 먼저 정리하고,
            더 구체적인 상황은 Q&A와 스파링으로 이어가요.
          </p>
        </div>
      </section>

      <UnifiedFilterBar
        tabs={ARTICLE_TABS}
        activeTab="recommended"
        categories={CATEGORY_FILTERS}
        activeCategory="전체"
      />

      <section className={styles.grid} aria-label="아티클 목록">
        {hanipArticles.map(article => (
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
