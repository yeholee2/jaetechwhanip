import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FEED_URL, hanipArticles } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import styles from '../FeedPage.module.css';

export function generateStaticParams() {
  return hanipArticles.map(article => ({ slug: article.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = hanipArticles.find(item => item.slug === params.slug);
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

export default function FeedArticlePage({ params }: { params: { slug: string } }) {
  const article = hanipArticles.find(item => item.slug === params.slug);
  if (!article) notFound();

  return (
    <AppShell active="feed">
      <article className={styles.card}>
        <div className={styles.meta}>
          <span className={styles.source}>한입 칼럼 · {article.category}</span>
          <span>{article.readingTime} 읽기</span>
        </div>
        <h1>{article.title}</h1>
        <p>{article.description}</p>
        <div className={styles.tags}>
          {article.tags.map(tag => <span key={tag}>{tag}</span>)}
        </div>
      </article>
    </AppShell>
  );
}

