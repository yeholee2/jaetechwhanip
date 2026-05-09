import type { MetadataRoute } from 'next';
import { FEED_URL, hanipArticles } from '@/lib/feed';
import { fetchQuestionsForSitemap, questionUrl, SITE_URL } from '@/lib/seo';
import { TOPICS, topicUrl } from '@/lib/topics';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const questions = await fetchQuestionsForSitemap();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: FEED_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
    ...hanipArticles.map(article => ({
      url: `${FEED_URL}/${encodeURIComponent(article.slug)}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
    ...TOPICS.map(topic => ({
      url: topicUrl(topic.slug),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    })),
    ...questions.map(question => ({
      url: questionUrl(question.slug),
      lastModified: question.createdAt ? new Date(question.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
