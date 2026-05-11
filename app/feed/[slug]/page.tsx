import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FEED_URL, fetchGhostArticleBySlug, hanipArticles } from '@/lib/feed';
import { SITE_NAME } from '@/lib/seo';
import { buildFeedSeoDescription, buildFeedSeoKeywords, buildFeedSeoTitle } from '@/lib/seo-content';
import { findEtfsForText } from '@/lib/relatedContent';
import { RelatedContent } from '@/components/RelatedContent';
import styles from '../FeedPage.module.css';

export function generateStaticParams() {
  return hanipArticles.map(article => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = await fetchGhostArticleBySlug(params.slug);
  if (!article) {
    return {
      title: '피드를 찾을 수 없어요',
      robots: { index: false, follow: true },
    };
  }

  const url = `${FEED_URL}/${encodeURIComponent(article.slug)}`;
  const title = buildFeedSeoTitle(article);
  const description = buildFeedSeoDescription(article);
  const keywords = buildFeedSeoKeywords(article);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url,
      type: 'article',
      publishedTime: article.publishedAt,
      section: article.category,
      tags: article.tags,
      images: article.thumbnailUrl ? [{ url: article.thumbnailUrl, alt: article.title }] : undefined,
    },
    twitter: {
      card: article.thumbnailUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: article.thumbnailUrl ? [article.thumbnailUrl] : undefined,
    },
  };
}

export default async function FeedArticlePage({ params }: { params: { slug: string } }) {
  const article = await fetchGhostArticleBySlug(params.slug);
  if (!article) notFound();

  // 분절 해소: 이 칼럼에서 언급된 ETF 추출
  const mentionedEtfs = findEtfsForText(
    [article.title, article.description, (article.tags || []).join(' '), article.contentHtml || ''].join(' '),
    3,
  );

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

        <RelatedContent heading="이 글과 관련된 ETF" etfs={mentionedEtfs} />
      </article>
    </AppShell>
  );
}
