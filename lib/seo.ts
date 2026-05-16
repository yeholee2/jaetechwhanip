import { sampleQuestions } from '@/lib/sampleData';

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://etf.hannipmoney.com';
export const SITE_NAME = '재테크한입';

export type SeoQuestion = {
  id?: string | number;
  slug: string;
  title: string;
  body: string;
  category?: string;
  createdAt?: string;
  answerCount?: number;
  likeCount?: number;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export function questionPath(slug: string) {
  return `/q/${encodeURIComponent(slug)}`;
}

export function questionUrl(slug: string) {
  return `${SITE_URL}${questionPath(slug)}`;
}

export function truncateDescription(text: string, maxLength = 150) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function isIndexableQuestion(question: Pick<SeoQuestion, 'title' | 'body'>) {
  const title = question.title.replace(/\s+/g, ' ').trim();
  const body = question.body.replace(/\s+/g, ' ').trim();
  const thinText = `${title} ${body}`.toLowerCase();
  const blockedTestWords = /^(test|asdf|qwer|dld|aaa|bbb|ccc|테스트|ㄴㄴ|ㅇㅇ)$/i;

  return (
    title.length >= 6 &&
    body.length >= 10 &&
    title !== body &&
    !blockedTestWords.test(title) &&
    !blockedTestWords.test(body) &&
    !/^(.)\1{2,}$/.test(thinText.replace(/\s+/g, ''))
  );
}

export function sampleQuestionToSeo(slug: string): SeoQuestion | null {
  const question = sampleQuestions.find(item => item.slug === slug);
  if (!question) return null;
  const optional = question as { createdAt?: string; likeCount?: number };

  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    body: question.body,
    category: question.cat,
    createdAt: optional.createdAt,
    answerCount: question.ans,
    likeCount: optional.likeCount,
  };
}

export async function fetchQuestionForSeo(slug: string): Promise<SeoQuestion | null> {
  const fallback = sampleQuestionToSeo(slug);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return fallback;

  try {
    const column = UUID_RE.test(slug) ? 'id' : 'slug';
    const res = await fetch(
      `${supabaseUrl}/rest/v1/questions?${column}=eq.${encodeURIComponent(slug)}&select=id,slug,title,body,category,created_at,answer_count,like_count&limit=1`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) return fallback;

    const data = await res.json();
    const question = data?.[0];
    if (!question) return fallback;

    return {
      id: question.id,
      slug: question.slug || question.id,
      title: question.title,
      body: question.body || question.title,
      category: question.category,
      createdAt: question.created_at,
      answerCount: question.answer_count ?? 0,
      likeCount: question.like_count ?? 0,
    };
  } catch {
    return fallback;
  }
}

export async function fetchQuestionsForSitemap(): Promise<SeoQuestion[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/questions?select=id,slug,title,body,category,created_at,answer_count,like_count&order=created_at.desc&limit=500`,
        {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
          next: { revalidate: 3600 },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data
            .filter(item => item.title)
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
        }
      }
    } catch {
      // Fall through to sample questions so the sitemap still builds.
    }
  }

  return sampleQuestions
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
