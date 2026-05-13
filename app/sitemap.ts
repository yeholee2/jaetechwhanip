import type { MetadataRoute } from 'next';
import { ETF_HOME_URL, etfUrl } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';
import { FEED_URL, hanipArticles } from '@/lib/feed';
import { fetchQuestionsForSitemap, questionUrl, SITE_URL } from '@/lib/seo';
import { TOPICS, topicUrl } from '@/lib/topics';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [questions, allEtfs] = await Promise.all([
    fetchQuestionsForSitemap(),
    fetchEtfs(2000),
  ]);

  return [
    // 메인
    { url: SITE_URL, lastModified: now, changeFrequency: 'daily', priority: 1 },
    // 정적 핵심 페이지
    { url: ETF_HOME_URL, lastModified: now, changeFrequency: 'daily', priority: 0.92 },
    { url: `${SITE_URL}/etf/all`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/portfolio`, lastModified: now, changeFrequency: 'weekly', priority: 0.85 },
    { url: `${SITE_URL}/learn`, lastModified: now, changeFrequency: 'daily', priority: 0.88 },
    { url: FEED_URL, lastModified: now, changeFrequency: 'daily', priority: 0.85 },
    { url: `${SITE_URL}/sparring`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    // ETF 상세 (1,066개 — DB)
    ...allEtfs.map(etf => ({
      url: etfUrl(etf.slug),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.82,
    })),
    // 칼럼
    ...hanipArticles.map(article => ({
      url: `${FEED_URL}/${encodeURIComponent(article.slug)}`,
      lastModified: new Date(article.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.65,
    })),
    // 토픽
    ...TOPICS.map(topic => ({
      url: topicUrl(topic.slug),
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.75,
    })),
    // 질문
    ...questions.map(question => ({
      url: questionUrl(question.slug),
      lastModified: question.createdAt ? new Date(question.createdAt) : now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
