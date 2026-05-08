import type { MetadataRoute } from 'next';
import { fetchQuestionsForSitemap, questionUrl, SITE_URL } from '@/lib/seo';

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
    ...questions.map(question => ({
      url: questionUrl(question.slug),
      lastModified: question.createdAt ? new Date(question.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
