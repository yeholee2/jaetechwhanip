import { sampleQuestions } from '@/lib/sampleData';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEST_TITLE_RE = /^(test|asdf|qwer|dld|aaa|bbb|ccc|테스트|ㄴㄴ|ㅇㅇ)$/i;

export type QuestionDetail = {
  id: string;
  title: string;
  body: string;
  category: string;
  slug: string;
  author_id: string | null;
  created_at: string;
  answer_count: number;
  like_count: number;
  view_count: number;
  is_answered: boolean;
  is_sample?: boolean;
  users?: {
    id: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export type AnswerDetail = {
  id: string;
  question_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
  like_count: number;
  is_adopted: boolean;
  users?: {
    id: string | null;
    name: string | null;
    avatar_url: string | null;
  } | null;
};

export type RelatedQuestion = {
  id: string;
  title: string;
  slug: string | null;
  answer_count: number;
  is_answered: boolean;
};

export type QuestionPageData = {
  question: QuestionDetail | null;
  answers: AnswerDetail[];
  related: RelatedQuestion[];
};

function sampleQuestion(slug: string): QuestionDetail | null {
  const found = sampleQuestions.find(item => item.slug === slug);
  if (!found) return null;

  return {
    id: `sample-${found.id}`,
    title: found.title,
    body: found.body,
    category: found.cat,
    slug: found.slug,
    author_id: null,
    created_at: new Date(Date.now() - found.id * 3600000).toISOString(),
    answer_count: found.ans,
    like_count: found.id * 3,
    view_count: found.id * 127,
    is_answered: found.adopted,
    is_sample: true,
    users: { id: null, name: found.author, avatar_url: null },
  };
}

function sampleRelated(slug: string): RelatedQuestion[] {
  return sampleQuestions
    .filter(item => item.slug !== slug)
    .slice(0, 5)
    .map(item => ({
      id: `sample-${item.id}`,
      title: item.title,
      slug: item.slug,
      answer_count: item.ans,
      is_answered: item.adopted,
    }));
}

function isUsefulRelatedTitle(title: string) {
  const normalized = title.replace(/\s+/g, ' ').trim();
  return normalized.length >= 6 && !TEST_TITLE_RE.test(normalized);
}

function mapQuestion(row: any): QuestionDetail {
  return {
    id: row.id,
    title: row.title,
    body: row.body || '',
    category: row.category || '재테크 입문',
    slug: row.slug || row.id,
    author_id: row.author_id || null,
    created_at: row.created_at,
    answer_count: row.answer_count || 0,
    like_count: row.like_count || 0,
    view_count: row.view_count || 0,
    is_answered: row.is_answered || false,
    users: row.users || null,
  };
}

export async function fetchQuestionPageData(slug: string): Promise<QuestionPageData> {
  const fallback = sampleQuestion(slug);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { question: fallback, answers: [], related: sampleRelated(slug) };
  }

  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  try {
    const column = UUID_RE.test(slug) ? 'id' : 'slug';
    const questionRes = await fetch(
      `${supabaseUrl}/rest/v1/questions?${column}=eq.${encodeURIComponent(slug)}&select=*,users:author_id(id,name,avatar_url)&limit=1`,
      { headers, next: { revalidate: 60 } }
    );

    if (!questionRes.ok) return { question: fallback, answers: [], related: sampleRelated(slug) };

    const questionRows = await questionRes.json();
    const rawQuestion = questionRows?.[0];
    if (!rawQuestion) return { question: fallback, answers: [], related: sampleRelated(slug) };

    const question = mapQuestion(rawQuestion);

    const [answersRes, relatedRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/answers?question_id=eq.${encodeURIComponent(question.id)}&select=*,users:author_id(id,name,avatar_url)&order=is_adopted.desc&order=like_count.desc&order=created_at.asc`,
        { headers, next: { revalidate: 60 } }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/questions?category=eq.${encodeURIComponent(question.category)}&id=neq.${encodeURIComponent(question.id)}&select=id,title,slug,answer_count,is_answered&order=created_at.desc&limit=5`,
        { headers, next: { revalidate: 60 } }
      ),
    ]);

    const answers = answersRes.ok ? await answersRes.json() : [];
    const related = relatedRes.ok ? await relatedRes.json() : [];
    const indexableRelated = Array.isArray(related)
      ? related.filter(item => isUsefulRelatedTitle(item.title || ''))
      : [];

    return {
      question,
      answers: Array.isArray(answers) ? answers : [],
      related: indexableRelated.length > 0 ? indexableRelated : sampleRelated(slug),
    };
  } catch {
    return { question: fallback, answers: [], related: sampleRelated(slug) };
  }
}
