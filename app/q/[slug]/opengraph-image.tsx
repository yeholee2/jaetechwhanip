import { ImageResponse } from 'next/og';
import { sampleQuestions } from '@/lib/sampleData';
import { getCategoryByKey } from '@/lib/categories';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '재테크한입 — 질문';

const EMOJI = ['🐯','🐰','🦊','🐻','🦋','🐸','🐼','🦁','🐨','🐮','🐷','🐙'];

function hashEmoji(key?: string | null): string {
  if (!key) return EMOJI[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return EMOJI[Math.abs(h) % EMOJI.length];
}

async function loadQuestion(slug: string) {
  // 1) 샘플에서 먼저 검색 (정적)
  const sample = sampleQuestions.find(q => q.slug === slug);
  if (sample) {
    return {
      title: sample.title,
      category: sample.cat,
      author: sample.author,
      authorEmoji: sample.em || hashEmoji(sample.author),
      answerCount: sample.ans || 0,
    };
  }

  // 2) DB 조회 (Edge runtime에서 fetch 가능)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  try {
    const res = await fetch(
      `${url}/rest/v1/questions?slug=eq.${encodeURIComponent(slug)}&select=title,category,answer_count,author_id,users:author_id(name)&limit=1`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return null;
    const authorName = row.users?.name || '익명';
    return {
      title: row.title,
      category: row.category,
      author: authorName,
      authorEmoji: hashEmoji(row.author_id || authorName),
      answerCount: row.answer_count || 0,
    };
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { slug: string } }) {
  const q = await loadQuestion(params.slug);

  if (!q) {
    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(135deg, #f6f7f8 0%, #ffffff 60%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16, fontFamily: 'sans-serif',
        }}>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 800, color: '#3182f6' }}>
            재테크<span style={{ color: '#191f28' }}>한입</span>
          </div>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#191f28' }}>
            돈 고민, 여기서 해결
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const categoryDef = getCategoryByKey(q.category);
  const categoryLabel = categoryDef?.label || q.category;
  const categoryEmoji = categoryDef?.emoji || '💬';

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        background: 'linear-gradient(135deg, #f6f7f8 0%, #ffffff 60%)',
        display: 'flex', flexDirection: 'column',
        padding: '64px 80px',
        fontFamily: 'sans-serif',
      }}>
        {/* 상단 브랜드 + 카테고리 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, fontWeight: 800, color: '#3182f6' }}>
            재테크<span style={{ color: '#191f28' }}>한입</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: '#eef4ff',
            borderRadius: 999,
            fontSize: 20, fontWeight: 700, color: '#3182f6',
          }}>
            <span style={{ display: 'flex' }}>{categoryEmoji}</span>
            <span style={{ display: 'flex' }}>{categoryLabel}</span>
          </div>
        </div>

        {/* 질문 제목 */}
        <div style={{
          display: 'flex',
          fontSize: 60, fontWeight: 900, color: '#191f28',
          lineHeight: 1.2,
          letterSpacing: '-1px',
          marginBottom: 'auto',
          maxWidth: 1040,
        }}>
          {q.title.length > 80 ? q.title.slice(0, 80) + '…' : q.title}
        </div>

        {/* 하단: 작성자 + 답변 수 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 20,
          marginTop: 32,
          paddingTop: 28,
          borderTop: '1px solid #e5e8eb',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 72, height: 72,
            background: '#ffffff',
            border: '1px solid #e5e8eb',
            borderRadius: '50%',
            fontSize: 40,
          }}>
            {q.authorEmoji}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: '#191f28' }}>
              {q.author}
            </div>
            <div style={{ display: 'flex', fontSize: 18, color: '#8b95a1', fontWeight: 600 }}>
              답변 {q.answerCount}개
            </div>
          </div>
          <div style={{
            display: 'flex',
            marginLeft: 'auto',
            fontSize: 20, fontWeight: 700, color: '#3182f6',
          }}>
            jaetechwhanip.com
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
