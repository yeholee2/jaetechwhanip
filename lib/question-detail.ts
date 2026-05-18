import { getSampleAnswers, sampleQuestions } from '@/lib/sampleData';

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
    answer_count?: number | null;
    accepted_count?: number | null;
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
  const optional = found as { createdAt?: string; likeCount?: number; viewCount?: number };

  return {
    id: `sample-${found.id}`,
    title: found.title,
    body: found.body,
    category: found.cat,
    slug: found.slug,
    author_id: null,
    created_at: optional.createdAt || new Date(Date.now() - found.id * 3600000).toISOString(),
    answer_count: found.ans,
    like_count: optional.likeCount ?? found.id * 3,
    view_count: optional.viewCount ?? found.id * 127,
    is_answered: found.adopted,
    is_sample: true,
    users: { id: null, name: found.author, avatar_url: null },
  };
}

function sampleAnswers(slug: string, questionId: string): AnswerDetail[] {
  return getSampleAnswers(slug).map(answer => ({
    id: answer.id,
    question_id: questionId,
    body: answer.body,
    author_id: null,
    created_at: answer.createdAt,
    like_count: answer.likeCount,
    is_adopted: !!answer.adopted,
    users: { id: null, name: answer.author, avatar_url: null },
  }));
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
  const seed = sampleQuestions.find(item => item.slug === (row.slug || row.id));
  const seedOptional = seed as { createdAt?: string; likeCount?: number; viewCount?: number } | undefined;

  return {
    id: row.id,
    title: seed?.title || row.title,
    body: seed?.body || row.body || '',
    category: seed?.cat || row.category || '재테크입문',
    slug: row.slug || row.id,
    author_id: row.author_id || null,
    created_at: seedOptional?.createdAt || row.created_at,
    answer_count: seed?.ans ?? row.answer_count ?? 0,
    like_count: seedOptional?.likeCount ?? row.like_count ?? 0,
    view_count: seedOptional?.viewCount ?? row.view_count ?? 0,
    is_answered: seed?.adopted ?? row.is_answered ?? false,
    users: seed ? { id: row.users?.id || null, name: seed.author, avatar_url: row.users?.avatar_url || null } : row.users || null,
  };
}

export async function fetchQuestionPageData(slug: string): Promise<QuestionPageData> {
  const fallback = sampleQuestion(slug);
  const fallbackAnswers = fallback ? sampleAnswers(slug, fallback.id) : [];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { question: fallback, answers: fallbackAnswers, related: sampleRelated(slug) };
  }

  const headers = { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` };

  try {
    const column = UUID_RE.test(slug) ? 'id' : 'slug';
    const questionRes = await fetch(
      `${supabaseUrl}/rest/v1/questions?${column}=eq.${encodeURIComponent(slug)}&select=*,users:author_id(id,name,avatar_url)&limit=1`,
      { headers, next: { revalidate: 60 } }
    );

    if (!questionRes.ok) return { question: fallback, answers: fallbackAnswers, related: sampleRelated(slug) };

    const questionRows = await questionRes.json();
    const rawQuestion = questionRows?.[0];
    if (!rawQuestion) return { question: fallback, answers: fallbackAnswers, related: sampleRelated(slug) };

    const question = mapQuestion(rawQuestion);
    const seededAnswers = sampleAnswers(question.slug, question.id);

    const [answersRes, relatedRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/answers?question_id=eq.${encodeURIComponent(question.id)}&select=*,users:author_id(id,name,avatar_url,answer_count,accepted_count)&order=is_adopted.desc&order=like_count.desc&order=created_at.asc`,
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
      answers: Array.isArray(answers) && answers.length > 0 ? answers : seededAnswers,
      related: indexableRelated.length > 0 ? indexableRelated : sampleRelated(slug),
    };
  } catch {
    return { question: fallback, answers: fallbackAnswers, related: sampleRelated(slug) };
  }
}
