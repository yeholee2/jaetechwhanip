/**
 * 홈 피드 질문 매핑 헬퍼 — 서버/클라이언트 공용
 *
 * SSR(app/page.tsx)과 클라이언트(HomeClient) 양쪽에서 동일한 로직으로
 * DB row → Question 매핑을 수행해 hydration 불일치를 방지한다.
 */
import { EMOJI, sampleQuestions, type Question } from './sampleData';

export function getUserEmoji(key?: string | null): string {
  const k = key || '';
  if (!k) return EMOJI[0];
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (Math.imul(31, h) + k.charCodeAt(i)) | 0;
  return EMOJI[Math.abs(h) % EMOJI.length];
}

export function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function isUsefulQuestion(title: string, body?: string) {
  const cleanTitle = String(title || '').replace(/\s+/g, ' ').trim();
  const cleanBody = String(body || '').replace(/\s+/g, ' ').trim();
  const testWords = /^(test|asdf|qwer|dld|aaa|bbb|ccc|테스트|ㄴㄴ|ㅇㅇ)$/i;

  return (
    cleanTitle.length >= 6 &&
    cleanBody.length >= 10 &&
    cleanTitle !== cleanBody &&
    !testWords.test(cleanTitle) &&
    !testWords.test(cleanBody)
  );
}

export function mapDbRowToHomeQuestion(q: any, i: number, pageOffset = 0): Question {
  const seed = sampleQuestions.find(item => item.slug === (q.slug || q.id));
  return {
    id: i + pageOffset,
    cat: seed?.cat || q.category || '재테크입문',
    topic: seed?.topic || '일반',
    author: seed?.author || (q.users as any)?.name || '익명',
    time: seed?.createdAt ? formatTime(seed.createdAt) : formatTime(q.created_at),
    // QuestionClient는 users.name을 seed.author로 오버라이드하므로,
    // hash 키 우선순위를 author_id → seed.author → DB users.name 으로 통일
    em: (q.users as any)?.avatar_url || getUserEmoji(q.author_id || seed?.author || (q.users as any)?.name),
    lv: seed?.lv ?? 0,
    title: seed?.title || q.title,
    body: seed?.body || q.body || '',
    ans: seed?.ans ?? q.answer_count ?? 0,
    adopted: seed?.adopted ?? q.is_answered ?? false,
    slug: q.slug || seed?.slug || q.id,
    dbId: q.id,
    likeCount: seed?.likeCount ?? q.like_count ?? 0,
    viewCount: q.view_count ?? 0,
    createdAt: seed?.createdAt || q.created_at,
  };
}

/** SSR에서 사용: 인기 피드 첫 페이지를 DB에서 직접 가져옴 */
export async function fetchInitialHomeQuestions(): Promise<Question[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return sampleQuestions;

    const select = 'id,title,body,category,slug,answer_count,like_count,view_count,is_answered,created_at,author_id,users:author_id(name,avatar_url)';
    const order = 'answer_count.desc,like_count.desc,created_at.desc';
    const res = await fetch(
      `${url}/rest/v1/questions?select=${encodeURIComponent(select)}&order=${order}&limit=20`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        next: { revalidate: 60 },
      },
    );
    if (!res.ok) return sampleQuestions;
    const rows = (await res.json()) as any[];
    const useful = rows.filter(q => isUsefulQuestion(q.title, q.body));
    if (useful.length === 0) return sampleQuestions;
    return useful.map((q, i) => mapDbRowToHomeQuestion(q, i, 0));
  } catch {
    return sampleQuestions;
  }
}
