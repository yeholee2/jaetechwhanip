import type { Metadata } from 'next';
import { columnArticles, COLUMN_URL } from '@/lib/columns';
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
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div>
            <div className={styles.eyebrow}>재테크 칼럼</div>
            <h1>질문하기 전에 한입만 읽어도 돈 고민이 선명해져요</h1>
            <p>
              재테크한입 칼럼은 어려운 금융 용어를 먼저 밀어 넣지 않고,
              사람들이 실제로 헷갈리는 질문에서 출발해 주식·ETF·절세 판단 기준을 정리합니다.
            </p>
          </div>
          <div className={styles.ruleBox}>
            <strong>운영 원칙</strong>
            <span>칼럼은 Q&A로 연결되고, Q&A는 다시 칼럼의 소재가 됩니다. 검색 유입과 커뮤니티 유동성을 같이 키우는 구조예요.</span>
          </div>
        </section>

        <section className={styles.grid} aria-label="칼럼 목록">
          {columnArticles.map(article => (
            <article key={article.slug} className={styles.card}>
              <div className={styles.meta}>
                <span className={styles.category}>{article.category}</span>
                <span>{article.readingTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.description}</p>
              <div className={styles.tags}>
                {article.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
