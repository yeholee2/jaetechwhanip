import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FEED_URL, fetchGhostArticleBySlug, hanipArticles } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import styles from '../FeedPage.module.css';

export function generateStaticParams() {
  return hanipArticles.map(article => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await fetchGhostArticleBySlug(params.slug);
  if (!article) return {};

  const url = `${FEED_URL}/${encodeURIComponent(article.slug)}`;

  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${article.title} | ${SITE_NAME}`,
      description: article.description,
      url,
      type: 'article',
      publishedTime: article.publishedAt,
      tags: article.tags,
    },
  };
}

export default async function FeedArticlePage({ params }: { params: { slug: string } }) {
  const article = await fetchGhostArticleBySlug(params.slug);
  if (!article) notFound();

  return (
    <AppShell active="feed">
      <article className={`${styles.card} ${styles.articleDetail}`}>
        <div className={styles.meta}>
          <span className={styles.source}>한입 칼럼 · {article.category}</span>
          <span>{article.readingTime} 읽기</span>
        </div>
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <div className={styles.tags}>
          {article.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
        {article.contentHtml && (
          <div
            className={styles.articleBody}
            dangerouslySetInnerHTML={{ __html: article.contentHtml }}
          />
        )}
        {article.originalUrl && (
          <a className={styles.originalLink} href={article.originalUrl} target="_blank" rel="noreferrer">
            원문에서 읽기
          </a>
        )}
      </article>
    </AppShell>
  );
}
