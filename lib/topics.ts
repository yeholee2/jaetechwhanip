import { CATEGORY_DEFINITIONS, getCategoryBySlug } from '@/lib/categories';
import { sampleQuestions } from '@/lib/sampleData';
import { isIndexableQuestion, SITE_URL, type SeoQuestion } from '@/lib/seo';

export type TopicDefinition = {
  slug: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
  label: string;
  emoji: string;
  aliases?: string[];
};

export const TOPICS: TopicDefinition[] = CATEGORY_DEFINITIONS.map(category => ({
  slug: category.slug,
  category: category.key,
  title: category.title,
  description: category.description,
  keywords: category.keywords,
  label: category.label,
  emoji: category.emoji,
  aliases: category.aliases,
}));

export function topicPath(slug: string) {
  return `/topics/${encodeURIComponent(slug)}`;
}

export function topicUrl(slug: string) {
  return `${SITE_URL}${topicPath(slug)}`;
}

export function getTopicBySlug(slug: string) {
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  return {
    slug: category.slug,
    category: category.key,
    title: category.title,
    description: category.description,
    keywords: category.keywords,
    label: category.label,
    emoji: category.emoji,
    aliases: category.aliases,
  };
}

function sampleTopicQuestions(category: string): SeoQuestion[] {
  return sampleQuestions
    .filter(item => item.cat === category)
    .map(item => {
      const optional = item as { createdAt?: string; likeCount?: number };

      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        body: item.body,
        category: item.cat,
        createdAt: optional.createdAt,
        answerCount: item.ans,
        likeCount: optional.likeCount,
      };
    })
    .filter(isIndexableQuestion);
}

export async function fetchTopicQuestions(topic: TopicDefinition, limit = 50): Promise<SeoQuestion[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/questions?category=eq.${encodeURIComponent(topic.category)}&select=id,slug,title,body,category,created_at,answer_count,like_count&order=created_at.desc&limit=${limit}`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          next: { revalidate: 300 },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const questions = data
            .map(item => ({
              id: item.id,
              slug: item.slug || item.id,
              title: item.title,
              body: item.body || item.title,
              category: item.category,
              createdAt: item.created_at,
              answerCount: item.answer_count ?? 0,
              likeCount: item.like_count ?? 0,
            }))
            .filter(isIndexableQuestion);

          if (questions.length > 0) return questions;
        }
      }
    } catch {
      // Fall through to sample topic questions.
    }
  }

  return sampleTopicQuestions(topic.category);
}
