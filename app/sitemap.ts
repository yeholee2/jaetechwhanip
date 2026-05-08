import type { MetadataRoute } from 'next';
import { fetchQuestionsForSitemap, questionUrl, SITE_URL } from '@/lib/seo';
import { TOPICS, topicUrl } from '@/lib/topics';
import { COLUMN_URL } from '@/lib/columns';

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
      url: COLUMN_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    },
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
