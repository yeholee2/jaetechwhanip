import { sampleQuestions } from '@/lib/sampleData';
import { isIndexableQuestion, SITE_URL, type SeoQuestion } from '@/lib/seo';

export type TopicDefinition = {
  slug: string;
  category: string;
  title: string;
  description: string;
  keywords: string[];
};

export const TOPICS: TopicDefinition[] = [
  {
    slug: 'finance-basics',
    category: '재테크 입문',
    title: '재테크 입문 질문',
    description: '사회초년생 저축, 목돈 만들기, 월급 관리처럼 처음 시작하는 재테크 고민을 모았어요.',
    keywords: ['재테크 입문', '사회초년생 재테크', '월급 관리', '저축'],
  },
  {
    slug: 'stocks-etf',
    category: '주식·ETF',
    title: '주식·ETF 질문',
    description: 'S&P500, ETF, 장기투자, 고점 고민처럼 투자자가 자주 묻는 질문을 모았어요.',
    keywords: ['주식', 'ETF', 'S&P500', '장기투자'],
  },
  {
    slug: 'tax-saving',
    category: '절세',
    title: '절세 질문',
    description: 'ISA, 연금저축, 세액공제처럼 세금을 아끼는 계좌와 제도 질문을 모았어요.',
    keywords: ['절세', 'ISA', '연금저축', '세액공제'],
  },
  {
    slug: 'insurance',
    category: '보험',
    title: '보험 질문',
    description: '실손보험, 보험 리모델링, 20대 보험처럼 꼭 필요한 보장에 대한 질문을 모았어요.',
    keywords: ['보험', '실손보험', '보험 리모델링'],
  },
  {
    slug: 'debt-loans',
    category: '대출·부채',
    title: '대출·부채 질문',
    description: '학자금대출, 신용대출, 부채 상환 순서처럼 돈을 빌리고 갚는 고민을 모았어요.',
    keywords: ['대출', '부채', '학자금대출', '신용관리'],
  },
];

export function topicPath(slug: string) {
  return `/topics/${encodeURIComponent(slug)}`;
}

export function topicUrl(slug: string) {
  return `${SITE_URL}${topicPath(slug)}`;
}

export function getTopicBySlug(slug: string) {
  return TOPICS.find(topic => topic.slug === slug) || null;
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
