'use client';

/**
 * 질문 작성 페이지 — a-ha.io 톤.
 *
 * 카테고리 → 제목 → 본문 → 태그(국내주식·ETF만) → 발행
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import { createQuestionSlug, ensureUniqueSlug } from '@/lib/slugs';
import styles from './CreateQuestion.module.css';

const STOCK_ETF_TAGS = ['S&P500', '나스닥100', '미국 ETF', '국내 ETF', '배당 ETF', '월배당', '환헤지', '분할매수'];

const PLACEHOLDERS = [
  '예: 코스피가 신고가 근처인데 적립식 매수 시작해도 될까요?',
  '예: ISA와 연금저축 중 어디부터 채워야 하나요?',
  '예: TIGER 미국S&P500 환헤지 vs 비헤지 어떤 게 나을까요?',
  '예: 월배당 ETF로 분배금 받는 게 세금 측면에서 유리한가요?',
];

export function CreateQuestionClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [category, setCategory] = useState<string>('재테크입문');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [placeholderIdx] = useState(() => Math.floor(Math.random() * PLACEHOLDERS.length));

  const toggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag].slice(0, 4));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const t = title.trim();
    if (t.length < 6) {
      setErr('질문 제목은 최소 6자 이상이어야 해요.');
      return;
    }
    if (!hasSupabase()) {
      setErr('서비스 설정 중이에요. 잠시 후 다시 시도해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const supabase = createClient();
      const baseSlug = createQuestionSlug(t);
      const slug = await ensureUniqueSlug(baseSlug, async candidate => {
        const { data } = await supabase
          .from('questions')
          .select('id')
          .eq('slug', candidate)
          .maybeSingle();
        return Boolean(data);
      });

      const bodyWithTags = tags.length
        ? [body.trim(), `관심 태그: ${tags.join(', ')}`].filter(Boolean).join('\n\n')
        : body.trim();
      const basePayload = {
        title: t,
        body: body.trim(),
        category,
        slug,
        author_id: userId,
        answer_count: 0,
      };
      const insertPayload: Record<string, unknown> = tags.length ? { ...basePayload, tags } : basePayload;

      let { data, error } = await supabase
        .from('questions')
        .insert(insertPayload as typeof basePayload)
        .select('id, slug')
        .single();

      // tags 컬럼이 없을 수도 — 그 경우 body 에 태그 합쳐서 재시도
      if (error && tags.length && /tags/i.test(error.message || '')) {
        const retry = await supabase.from('questions').insert({
          ...basePayload,
          body: bodyWithTags,
        }).select('id, slug').single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        setErr(error.message || '오류가 생겼어요. 다시 시도해주세요.');
        return;
      }

      router.push(`/q/${data?.slug || data?.id || slug}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = title.trim().length >= 6 && !submitting;

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>💬 새 질문</span>
        <h1>재테크, 한 입에 물어보세요</h1>
        <p>한 줄로 적어도 좋아요. 누군가는 같은 고민을 했어요.</p>
      </header>

      <form onSubmit={submit} className={styles.form}>
        {/* 카테고리 */}
        <div className={styles.section}>
          <label className={styles.sectionLabel}>카테고리</label>
          <div className={styles.catRow}>
            {CATEGORY_DEFINITIONS.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={`${styles.catChip} ${category === c.key ? styles.catChipOn : ''}`}
              >
                {getCategoryLabel(c.key)}
              </button>
            ))}
          </div>
        </div>

        {/* 태그 (국내주식·ETF만) */}
        {category === '국내주식·ETF' && (
          <div className={styles.section}>
            <label className={styles.sectionLabel}>
              관련 태그 <span className={styles.optional}>최대 4개</span>
            </label>
            <div className={styles.tagRow}>
              {STOCK_ETF_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`${styles.tagChip} ${tags.includes(tag) ? styles.tagChipOn : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 제목 */}
        <div className={styles.section}>
          <label className={styles.sectionLabel} htmlFor="q-title">질문 제목</label>
          <input
            id="q-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIdx]}
            maxLength={140}
            className={styles.titleInput}
            autoFocus
          />
          <div className={styles.charCount}>
            <span className={title.length < 6 ? styles.charCountWarn : ''}>{title.length}</span> / 140
          </div>
        </div>

        {/* 본문 */}
        <div className={styles.section}>
          <label className={styles.sectionLabel} htmlFor="q-body">
            상세 내용 <span className={styles.optional}>(선택)</span>
          </label>
          <textarea
            id="q-body"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={'상황·시도해본 것·고민이 더 있다면 적어주세요.\n예: 30대 직장인, 매월 50만원씩 ETF 적립식 매수 1년차…'}
            rows={8}
            maxLength={2000}
            className={styles.bodyTextarea}
          />
          <div className={styles.charCount}>
            {body.length} / 2000
          </div>
        </div>

        {/* 가이드 */}
        <div className={styles.guide}>
          <strong>✨ 좋은 질문 팁</strong>
          <ul>
            <li>구체적인 상황 (나이·직업·기간·금액) 을 알려주면 답변이 더 정확해져요</li>
            <li>이미 시도해본 것 / 막힌 지점을 같이 적으면 좋아요</li>
            <li>"좋은 ETF 추천"보다 "내 상황에 맞는 ETF" 가 답변 받기 좋아요</li>
          </ul>
        </div>

        {err && <div className={styles.error}>{err}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={!canSubmit} className={styles.btnPrimary}>
            {submitting ? '등록 중…' : '질문 올리기'}
          </button>
        </div>
      </form>
    </main>
  );
}
