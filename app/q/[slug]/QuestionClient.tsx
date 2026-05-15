'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDownUp, Bookmark, CheckCircle2, ChevronLeft,
  Heart, MessageCircle, Share2,
  Swords, ThumbsUp, X, Zap,
} from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { CATEGORY_DEFINITIONS, getCategoryLabel } from '@/lib/categories';
import { EMOJI, getSampleAnswers, sampleQuestions } from '@/lib/sampleData';
import type { AnswerDetail, QuestionDetail, RelatedQuestion } from '@/lib/question-detail';
import type { Sparring } from '@/lib/sparring';
import { createQuestionSlug, ensureUniqueSlug } from '@/lib/slugs';
import { getAuthNickname, syncFinanceNickname } from '@/lib/nicknames';
import { useAutoTranslation } from '@/lib/useAutoTranslation';
import { buildSeoDescription } from '@/lib/seo-content';
import { FaIcon } from '@/components/FaIcon';
import SparringMiniCard from '@/components/sparring/SparringMiniCard';
import { RelatedContent } from '@/components/RelatedContent';
import { Chip, Badge, Button } from '@/components/ui';
import { AppShell } from '@/components/AppShell';
import styles from './QuestionClient.module.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ft(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(d).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

function getUserName(user: any): string {
  if (!user) return '';
  return getAuthNickname(user) || 'ME';
}

function sampleQuestion(slug: string) {
  const found = sampleQuestions.find(item => item.slug === slug);
  if (!found) return null;
  const optional = found as { createdAt?: string; likeCount?: number; viewCount?: number };
  return {
    id: `sample-${found.id}`,
    title: found.title, body: found.body, category: found.cat,
    slug: found.slug, author_id: null,
    created_at: optional.createdAt || new Date(Date.now() - found.id * 3600000).toISOString(),
    answer_count: found.ans, like_count: optional.likeCount ?? found.id * 3,
    view_count: optional.viewCount ?? found.id * 127, is_answered: found.adopted, is_sample: true,
    users: { id: null, name: found.author, avatar_url: null },
  };
}

function sampleAnswerRows(slug: string, questionId: string) {
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

function seedQuestionOverlay(row: any) {
  const seed = sampleQuestions.find(item => item.slug === (row?.slug || row?.id));
  if (!seed) return row;
  const optional = seed as { createdAt?: string; likeCount?: number; viewCount?: number };

  return {
    ...row,
    title: seed.title,
    body: seed.body,
    category: seed.cat,
    created_at: optional.createdAt || row.created_at,
    answer_count: seed.ans,
    like_count: optional.likeCount ?? row.like_count ?? 0,
    view_count: optional.viewCount ?? row.view_count ?? 0,
    is_answered: seed.adopted,
    users: { ...(row.users || {}), name: seed.author },
  };
}

const CATS = CATEGORY_DEFINITIONS.map(category => category.key);
const EMPTY_ANSWERS: AnswerDetail[] = [];
const EMPTY_RELATED: RelatedQuestion[] = [];

export default function QuestionClient({
  slug,
  initialQuestion = null,
  initialAnswers = EMPTY_ANSWERS,
  initialRelated = EMPTY_RELATED,
  featuredSparring = null,
  mentionedEtfs = [],
}: {
  slug: string;
  initialQuestion?: QuestionDetail | null;
  initialAnswers?: AnswerDetail[];
  initialRelated?: RelatedQuestion[];
  featuredSparring?: Sparring | null;
  mentionedEtfs?: import('@/lib/etfs').EtfInfo[];
}) {
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState<any>(initialQuestion);
  const [answers, setAnswers] = useState<any[]>(initialAnswers);
  const [related, setRelated] = useState<any[]>(initialRelated);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [loading, setLoading] = useState(!initialQuestion);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [likedQuestion, setLikedQuestion] = useState(false);
  const [dislikedQuestion, setDislikedQuestion] = useState(false);
  const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set());
  const [cheeredAnswers, setCheeredAnswers] = useState<Set<string>>(new Set());
  const [answerSort, setAnswerSort] = useState<'recommend' | 'latest'>('recommend');
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [commentSubmitting, setCommentSubmitting] = useState<Record<string, boolean>>({});
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // 질문 + 인증 로드
  useEffect(() => {
    if (!slug) { setLoading(false); return; }
    const fallback = initialQuestion || sampleQuestion(slug);
    const fallbackRelated = initialRelated.length > 0 ? initialRelated : sampleQuestions.filter(i => i.slug !== slug).slice(0, 5);
    const fallbackAnswers = fallback ? sampleAnswerRows(fallback.slug, fallback.id) : [];

    if (!hasSupabase()) {
      setQ(fallback);
      setAnswers(fallbackAnswers);
      setRelated(fallbackRelated);
      setLoading(false); setAuthLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: authSub } = supabase.auth.onAuthStateChange((_e, s) => {
      const nextUser = s?.user ?? null;
      setUser(nextUser);
      if (nextUser) syncFinanceNickname(supabase, nextUser);
      setAuthLoading(false);
    });

    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const sessionUser = sessionData.session?.user ?? null;
      setUser(sessionUser); setAuthLoading(false);
      if (sessionUser) syncFinanceNickname(supabase, sessionUser);

      const qQuery = supabase.from('questions').select('*, users:author_id(id,name,avatar_url)');
      const { data: qData, error } = await (
        UUID_RE.test(slug) ? qQuery.eq('id', slug) : qQuery.eq('slug', slug)
      ).maybeSingle();

      if (error || !qData) {
        setQ(fallback);
        setAnswers(fallbackAnswers);
        setRelated(fallbackRelated);
        setLoading(false);
        return;
      }

      const displayQuestion = seedQuestionOverlay(qData);
      setQ(displayQuestion);
      supabase.from('questions').update({ view_count: (qData.view_count || 0) + 1 }).eq('id', qData.id);

      const [{ data: ans }, { data: rel }] = await Promise.all([
        supabase.from('answers').select('*, users:author_id(id,name,avatar_url)')
          .eq('question_id', qData.id)
          .order('is_adopted', { ascending: false })
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase.from('questions').select('id,title,slug,answer_count,is_answered')
          .eq('category', qData.category).neq('id', qData.id)
          .order('created_at', { ascending: false }).limit(5),
      ]);

      const loadedAnswers = ans || [];
      const seededAnswers = sampleAnswerRows(displayQuestion.slug || slug, displayQuestion.id);
      setAnswers(loadedAnswers.length > 0 ? loadedAnswers : seededAnswers);
      setRelated(rel || []);

      if (sessionUser) {
        try {
          const [lqRes, bRes, dqRes] = await Promise.all([
            supabase.from('liked_questions').select('question_id')
              .eq('user_id', sessionUser.id).eq('question_id', qData.id).maybeSingle(),
            supabase.from('bookmarks').select('question_id')
              .eq('user_id', sessionUser.id).eq('question_id', qData.id).maybeSingle(),
            supabase.from('disliked_questions').select('question_id')
              .eq('user_id', sessionUser.id).eq('question_id', qData.id).maybeSingle(),
          ]);
          if (lqRes.data) setLikedQuestion(true);
          if (bRes.data) setBookmarked(true);
          if (dqRes.data) setDislikedQuestion(true);

          if (loadedAnswers.length > 0) {
            const ids = loadedAnswers.map((a: any) => a.id);
            const [laRes, cheerRes] = await Promise.all([
              supabase.from('liked_answers').select('answer_id')
                .eq('user_id', sessionUser.id).in('answer_id', ids),
              supabase.from('cheered_answers').select('answer_id')
                .eq('user_id', sessionUser.id).in('answer_id', ids),
            ]);
            if (laRes.data) setLikedAnswers(new Set((laRes.data as any[]).map((r: any) => r.answer_id)));
            if (cheerRes.data) setCheeredAnswers(new Set((cheerRes.data as any[]).map((r: any) => r.answer_id)));
          }
        } catch { /* 테이블 없으면 무시 */ }
      }

      setLoading(false);
    })();

    return () => authSub.subscription.unsubscribe();
  }, [slug, initialQuestion, initialRelated]);

  // 답변 제출
  const submitAnswer = async () => {
    if (!answerBody.trim() || !user || !q) return;
    if (q.is_sample) { showT('샘플 질문에는 답변할 수 없어요.'); return; }
    setSubmitting(true);
    const supabase = createClient();
    const { data: newAns, error } = await supabase
      .from('answers').insert({ question_id: q.id, body: answerBody.trim(), author_id: user.id })
      .select('*, users:author_id(id,name,avatar_url)').single();
    if (!error && newAns) {
      const cnt = (q.answer_count || 0) + 1;
      await supabase.from('questions').update({ answer_count: cnt }).eq('id', q.id);
      setAnswers(prev => [...prev, newAns]);
      setQ((p: any) => ({ ...p, answer_count: cnt }));
      setAnswerBody('');
      showT('답변이 등록됐어요!');
    } else {
      showT('답변 등록에 실패했어요.');
    }
    setSubmitting(false);
  };

  // 채택
  const adoptAnswer = async (answerId: string) => {
    if (!user || !q || user.id !== q.author_id || q.is_sample) return;
    const supabase = createClient();
    await supabase.from('answers').update({ is_adopted: false }).eq('question_id', q.id);
    await supabase.from('answers').update({ is_adopted: true }).eq('id', answerId);
    await supabase.from('questions').update({ is_answered: true }).eq('id', q.id);
    setAnswers(prev => prev.map(a => ({ ...a, is_adopted: a.id === answerId })));
    setQ((p: any) => ({ ...p, is_answered: true }));
    showT('채택 완료!');
  };

  // 답변 좋아요 (토글)
  const likeAnswer = async (answerId: string, current: number) => {
    if (!user) { showT('로그인 후 추천할 수 있어요.'); return; }
    const supabase = createClient();
    const already = likedAnswers.has(answerId);
    try {
      if (already) {
        await supabase.from('liked_answers').delete().eq('user_id', user.id).eq('answer_id', answerId);
        const cnt = Math.max(0, current - 1);
        await supabase.from('answers').update({ like_count: cnt }).eq('id', answerId);
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, like_count: cnt } : a));
        setLikedAnswers(prev => { const s = new Set(prev); s.delete(answerId); return s; });
      } else {
        const { error } = await supabase.from('liked_answers').insert({ user_id: user.id, answer_id: answerId });
        if (!error) {
          const cnt = current + 1;
          await supabase.from('answers').update({ like_count: cnt }).eq('id', answerId);
          setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, like_count: cnt } : a));
          setLikedAnswers(prev => new Set([...prev, answerId]));
        }
      }
    } catch {
      if (!already) {
        const cnt = current + 1;
        await supabase.from('answers').update({ like_count: cnt }).eq('id', answerId);
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, like_count: cnt } : a));
        setLikedAnswers(prev => new Set([...prev, answerId]));
      }
    }
  };

  // 질문 좋아요 (토글)
  const likeQuestion = async () => {
    if (!user) { showT('로그인 후 좋아요를 누를 수 있어요.'); return; }
    if (q.is_sample) {
      setQ((p: any) => ({ ...p, like_count: (p.like_count || 0) + 1 }));
      showT('도움돼요를 남겼어요.');
      return;
    }
    const supabase = createClient();
    try {
      if (likedQuestion) {
        await supabase.from('liked_questions').delete().eq('user_id', user.id).eq('question_id', q.id);
        const cnt = Math.max(0, (q.like_count || 0) - 1);
        await supabase.from('questions').update({ like_count: cnt }).eq('id', q.id);
        setQ((p: any) => ({ ...p, like_count: cnt }));
        setLikedQuestion(false);
        showT('도움돼요를 취소했어요.');
      } else {
        const { error } = await supabase.from('liked_questions').insert({ user_id: user.id, question_id: q.id });
        if (!error) {
          const cnt = (q.like_count || 0) + 1;
          await supabase.from('questions').update({ like_count: cnt }).eq('id', q.id);
          setQ((p: any) => ({ ...p, like_count: cnt }));
          setLikedQuestion(true);
          showT('도움돼요를 남겼어요.');
        }
      }
    } catch {
      if (!likedQuestion) {
        const cnt = (q.like_count || 0) + 1;
        await supabase.from('questions').update({ like_count: cnt }).eq('id', q.id);
        setQ((p: any) => ({ ...p, like_count: cnt }));
        showT('도움돼요를 남겼어요.');
      }
    }
  };

  // 질문 싫어요 (토글)
  const dislikeQuestion = async () => {
    if (!user) { showT('로그인 후 할 수 있어요.'); return; }
    if (q.is_sample) { setDislikedQuestion(v => !v); return; }
    const supabase = createClient();
    try {
      if (dislikedQuestion) {
        await supabase.from('disliked_questions').delete().eq('user_id', user.id).eq('question_id', q.id);
        const cnt = Math.max(0, (q.dislike_count || 0) - 1);
        await supabase.from('questions').update({ dislike_count: cnt }).eq('id', q.id);
        setQ((p: any) => ({ ...p, dislike_count: cnt }));
        setDislikedQuestion(false);
      } else {
        await supabase.from('disliked_questions').insert({ user_id: user.id, question_id: q.id });
        const cnt = (q.dislike_count || 0) + 1;
        await supabase.from('questions').update({ dislike_count: cnt }).eq('id', q.id);
        setQ((p: any) => ({ ...p, dislike_count: cnt }));
        setDislikedQuestion(true);
        // 좋아요 상태면 취소
        if (likedQuestion) {
          await supabase.from('liked_questions').delete().eq('user_id', user.id).eq('question_id', q.id);
          setLikedQuestion(false);
        }
      }
    } catch { setDislikedQuestion(v => !v); }
  };

  // 북마크 DB 토글
  const toggleBookmark = async () => {
    if (!user) { showT('로그인 후 저장할 수 있어요.'); router.push(`/auth?next=/q/${slug}`); return; }
    if (q.is_sample) { setBookmarked(v => !v); showT(bookmarked ? '저장을 취소했어요.' : '질문을 저장했어요.'); return; }
    const supabase = createClient();
    try {
      if (bookmarked) {
        await supabase.from('bookmarks').delete().eq('user_id', user.id).eq('question_id', q.id);
        setBookmarked(false);
        showT('저장을 취소했어요.');
      } else {
        await supabase.from('bookmarks').insert({ user_id: user.id, question_id: q.id });
        setBookmarked(true);
        showT('질문을 저장했어요.');
      }
    } catch {
      setBookmarked(v => !v);
      showT(!bookmarked ? '질문을 저장했어요.' : '저장을 취소했어요.');
    }
  };

  // 답변 응원하기 (토글)
  const cheerAnswer = async (answerId: string, currentCheer: number) => {
    if (!user) { showT('로그인 후 응원할 수 있어요.'); return; }
    const supabase = createClient();
    const already = cheeredAnswers.has(answerId);
    try {
      if (already) {
        await supabase.from('cheered_answers').delete().eq('user_id', user.id).eq('answer_id', answerId);
        const cnt = Math.max(0, currentCheer - 1);
        await supabase.from('answers').update({ cheer_count: cnt }).eq('id', answerId);
        setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, cheer_count: cnt } : a));
        setCheeredAnswers(prev => { const s = new Set(prev); s.delete(answerId); return s; });
        showT('응원을 취소했어요.');
      } else {
        const { error } = await supabase.from('cheered_answers').insert({ user_id: user.id, answer_id: answerId });
        if (!error) {
          const cnt = currentCheer + 1;
          await supabase.from('answers').update({ cheer_count: cnt }).eq('id', answerId);
          setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, cheer_count: cnt } : a));
          setCheeredAnswers(prev => new Set([...prev, answerId]));
          showT('💪 답변을 응원했어요!');
        }
      }
    } catch {
      if (!already) setCheeredAnswers(prev => new Set([...prev, answerId]));
    }
  };

  // 댓글 토글 + DB 로드
  const toggleComments = async (answerId: string) => {
    const next = new Set(openComments);
    if (next.has(answerId)) {
      next.delete(answerId);
    } else {
      next.add(answerId);
      if (comments[answerId] === undefined && hasSupabase()) {
        const supabase = createClient();
        try {
          const { data } = await supabase.from('comments')
            .select('*, users:author_id(name,avatar_url)')
            .eq('answer_id', answerId).order('created_at', { ascending: true });
          setComments(prev => ({ ...prev, [answerId]: data || [] }));
        } catch {
          setComments(prev => ({ ...prev, [answerId]: [] }));
        }
      } else if (comments[answerId] === undefined) {
        setComments(prev => ({ ...prev, [answerId]: [] }));
      }
    }
    setOpenComments(next);
  };

  // 댓글 제출
  const submitComment = async (answerId: string) => {
    const body = commentInput[answerId]?.trim();
    if (!body || !user) return;
    setCommentSubmitting(prev => ({ ...prev, [answerId]: true }));
    const supabase = createClient();
    try {
      const { data, error } = await supabase.from('comments')
        .insert({ answer_id: answerId, author_id: user.id, body })
        .select('*, users:author_id(name,avatar_url)').single();
      if (!error && data) {
        setComments(prev => ({ ...prev, [answerId]: [...(prev[answerId] || []), data] }));
        setCommentInput(prev => ({ ...prev, [answerId]: '' }));
      } else {
        showT('댓글 등록에 실패했어요.');
      }
    } catch { showT('댓글 등록에 실패했어요.'); }
    setCommentSubmitting(prev => ({ ...prev, [answerId]: false }));
  };

  // 답변 삭제
  const deleteAnswer = async (answerId: string) => {
    if (!user || q.is_sample) return;
    if (!confirm('답변을 삭제할까요?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('answers').delete().eq('id', answerId).eq('author_id', user.id);
    if (!error) {
      const cnt = Math.max(0, (q.answer_count || 0) - 1);
      await supabase.from('questions').update({ answer_count: cnt }).eq('id', q.id);
      setAnswers(prev => prev.filter(a => a.id !== answerId));
      setQ((p: any) => ({ ...p, answer_count: cnt }));
      showT('답변을 삭제했어요.');
    }
  };

  // 댓글 삭제
  const deleteComment = async (answerId: string, commentId: string) => {
    if (!user) return;
    const supabase = createClient();
    const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', user.id);
    if (!error) setComments(prev => ({ ...prev, [answerId]: prev[answerId].filter((c: any) => c.id !== commentId) }));
  };

  // 공유
  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: q?.title, url });
    else { navigator.clipboard?.writeText(url); showT('링크를 복사했어요.'); }
  };

  // 로그아웃
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null); setShowDropdown(false);
    showT('👋 로그아웃 되었어요');
  };

  const userName = getUserName(user);
  const answerCount = q?.answer_count ?? answers.length;
  const minLen = 30;
  const remaining = Math.max(0, minLen - answerBody.trim().length);
  const rawSeoSummary = q ? buildSeoDescription(q, answers) : '';
  const translation = useAutoTranslation([
    ...(q ? [
      { id: 'question:title', type: 'question_title', text: q.title || '' },
      { id: 'question:body', type: 'question_body', text: q.body || '' },
      { id: 'question:summary', type: 'seo_summary', text: rawSeoSummary },
    ] : []),
    ...answers.map(a => ({ id: `answer:${a.id}:body`, type: 'answer_body', text: a.body || '' })),
    ...Object.values(comments).flatMap(list => (list || []).map((c: any) => ({
      id: `comment:${c.id}:body`,
      type: 'comment_body',
      text: c.body || '',
    }))),
  ]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!q) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>질문을 찾을 수 없어요</h1>
        <p style={{ color: 'var(--t3)', fontSize: 14 }}>삭제됐거나 잘못된 주소예요.</p>
        <button onClick={() => router.push('/')} style={{ marginTop: 8, padding: '10px 24px', background: 'var(--primary)', color: 'white', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>홈으로</button>
      </div>
    );
  }

  const authorName = q.users?.name || '익명';
  const qTitle = translation.text('question:title', q.title);
  const qBody = translation.text('question:body', q.body || '');
  const qTranslated = translation.isTranslated('question:title') || translation.isTranslated('question:body');
  const seoSummary = translation.text('question:summary', rawSeoSummary);

  return (
    <AppShell active="home" wide hideSlogan>
      {/* ── 본문 ── */}
      <div className={styles.body}>

        {/* 메인 컬럼 */}
        <main className={styles.main}>

          {/* 브레드크럼 */}
          <div className={styles.breadcrumb}>
            <Chip onClick={() => router.push('/')} size="sm">
              {getCategoryLabel(q.category || '재테크')}
            </Chip>
          </div>

          {/* 질문 카드 */}
          <article className={styles.qCard}>
            <div className={styles.qProfile}>
              <div className={styles.qAvatarWrap}>
                <div className={`${styles.qAvatar} tf`}>{q.users?.avatar_url || EMOJI[0]}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{authorName}</span>
                  {q.is_answered && <Badge tone="success">✅ 채택됨</Badge>}
                  {qTranslated && <Badge tone="primary">Translated</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>
                  {ft(q.created_at)} · 조회 {q.view_count || 0}
                </div>
              </div>
              {/* 더보기 메뉴: 기능 구현 전까지 숨김 */}
            </div>

            <h1 className={styles.qTitle}>{qTitle}</h1>
            {qBody && <p className={styles.qBody}>{qBody}</p>}

            <div className={styles.qActions}>
              <button
                className={`${styles.qActionBtn} ${likedQuestion ? styles.active : ''}`}
                onClick={likeQuestion}
              >
                <ThumbsUp size={15} />
                도움돼요 {q.like_count > 0 ? q.like_count : ''}
              </button>
              <button
                className={`${styles.qActionBtn} ${dislikedQuestion ? styles.activeDanger : ''}`}
                onClick={dislikeQuestion}
              >
                <Heart size={15} style={{ transform: 'rotate(180deg)' }} />
                별로예요 {q.dislike_count > 0 ? q.dislike_count : ''}
              </button>
              <button
                className={styles.qActionBtn}
                onClick={() => document.getElementById('answer-editor')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <MessageCircle size={15} />
                답변 {answerCount > 0 ? answerCount : ''}
              </button>
              <button
                className={`${styles.qActionBtn} ${bookmarked ? styles.active : ''}`}
                onClick={toggleBookmark}
              >
                <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
                저장
              </button>
              <button className={styles.qActionBtn} onClick={share}>
                <Share2 size={15} />
                공유
              </button>
            </div>
          </article>

          {/* 답변 목록 — 답변 에디터보다 먼저 노출 (a-ha 패턴) */}
          <section>
            <div className={styles.answersHead}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                답변 {answerCount}개
              </h2>
              {answers.length > 1 && (
                <div className={styles.sortTabs}>
                  <button
                    className={`${styles.sortTab} ${answerSort === 'recommend' ? styles.sortTabOn : ''}`}
                    onClick={() => setAnswerSort('recommend')}
                  >
                    <ArrowDownUp size={11} /> 추천순
                  </button>
                  <button
                    className={`${styles.sortTab} ${answerSort === 'latest' ? styles.sortTabOn : ''}`}
                    onClick={() => setAnswerSort('latest')}
                  >
                    최신순
                  </button>
                </div>
              )}
            </div>

            {answers.length === 0 ? (
              <div className={styles.emptyAnswers}>
                <MessageCircle size={32} color="var(--t3)" />
                <p style={{ fontWeight: 700, marginTop: 10 }}>아직 답변이 없어요</p>
                <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>첫 번째 답변을 남겨보세요.</p>
              </div>
            ) : (
              [...answers]
                .sort((a, b) => {
                  if (a.is_adopted && !b.is_adopted) return -1;
                  if (!a.is_adopted && b.is_adopted) return 1;
                  if (answerSort === 'recommend') return (b.like_count || 0) - (a.like_count || 0);
                  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                })
                .map(a => (
                <AnswerCard
                  key={a.id}
                  answer={a}
                  currentUserId={user?.id}
                  isMyQuestion={user?.id === q.author_id}
                  isAnswered={q.is_answered}
                  liked={likedAnswers.has(a.id)}
                  cheered={cheeredAnswers.has(a.id)}
                  onLike={() => likeAnswer(a.id, a.like_count || 0)}
                  onCheer={() => cheerAnswer(a.id, a.cheer_count || 0)}
                  onAdopt={() => adoptAnswer(a.id)}
                  onDelete={() => deleteAnswer(a.id)}
                  onCommentToggle={() => toggleComments(a.id)}
                  showComments={openComments.has(a.id)}
                  comments={comments[a.id] ?? null}
                  commentInput={commentInput[a.id] || ''}
                  commentSubmitting={commentSubmitting[a.id] || false}
                  onCommentChange={(v: string) => setCommentInput(prev => ({ ...prev, [a.id]: v }))}
                  onCommentSubmit={() => submitComment(a.id)}
                  onCommentDelete={(cid: string) => deleteComment(a.id, cid)}
                  translateText={(id: string, fallback: string) => translation.text(id, fallback)}
                  isTranslated={(id: string) => translation.isTranslated(id)}
                  router={router}
                  styles={styles}
                />
              ))
            )}
          </section>

          {/* 답변 에디터 — 답변 목록 하단 (a-ha 패턴) */}
          <section className={styles.editorBox} id="answer-editor">
            {user ? (
              <>
                <div className={styles.editorHead}>
                  <div className={styles.editorAvatar}>{userName[0]?.toUpperCase() || 'U'}</div>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{userName}</span>
                </div>
                <textarea
                  className={styles.editorArea}
                  value={answerBody}
                  onChange={e => setAnswerBody(e.target.value)}
                  placeholder="답변을 남겨주세요."
                  rows={5}
                />
                <div className={styles.editorFoot}>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                    {remaining > 0 ? `${remaining}글자 더 채워주세요.` : `${answerBody.trim().length}글자`}
                  </span>
                  <button
                    className={styles.submitBtn}
                    onClick={submitAnswer}
                    disabled={submitting || answerBody.trim().length < minLen}
                  >
                    {submitting ? '등록 중...' : '답변하기'}
                  </button>
                </div>
              </>
            ) : (
              <button
                className={styles.submitBtn}
                onClick={() => router.push(`/auth?next=/q/${slug}`)}
                style={{ width: '100%', height: 44 }}
              >
                로그인하고 답변하기
              </button>
            )}
          </section>
        </main>

        {/* 사이드바 */}
        <aside className={styles.sidebar}>
          <SparringMiniCard sparring={featuredSparring} />

          {mentionedEtfs.length > 0 && (
            <RelatedContent heading="이 질문과 관련된 ETF" etfs={mentionedEtfs} />
          )}

          {/* 유사 질문 — 데이터 있을 때만 노출 */}
          {related.length > 0 && (
            <div className={styles.widget}>
              <div className={styles.widgetHead}>같은 주제의 질문</div>
              {related.map(r => (
                <Link key={r.id} className={styles.relatedItem} href={`/q/${r.slug || r.id}`}>
                  <span>{r.title}</span>
                  <em>답변 {r.answer_count || 0}개</em>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* 질문하기 모달 */}
      {showAskModal && <AskModal onClose={() => setShowAskModal(false)} router={router} user={user} onToast={showT} />}

      {toast && <div className={styles.toast}>{toast}</div>}
    </AppShell>
  );
}

// ── 답변 카드 ──
function AnswerCard({ answer: a, currentUserId, isMyQuestion, isAnswered, liked, cheered, onLike, onCheer, onAdopt, onDelete, onCommentToggle, showComments, comments, commentInput, commentSubmitting, onCommentChange, onCommentSubmit, onCommentDelete, translateText, isTranslated, router, styles }: any) {
  const name = a.users?.name || '익명';
  const isMyAnswer = currentUserId && a.author_id === currentUserId;
  const answerBodyId = `answer:${a.id}:body`;
  const answerBody = translateText(answerBodyId, a.body);

  return (
    <article className={`${styles.answerCard} ${a.is_adopted ? styles.adoptedCard : ''}`}>
      {a.is_adopted && (
        <div className={styles.adoptedBadge}>
          <CheckCircle2 size={14} /> 채택된 답변
        </div>
      )}
      <div className={styles.answerProfile}>
        <div className={`${styles.answerAvatar} tf`}>{a.users?.avatar_url || EMOJI[1]}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>{a.created_at ? ft(a.created_at) : ''}</div>
          {isTranslated(answerBodyId) && <Badge tone="primary">Translated</Badge>}
        </div>
        {isMyAnswer && (
          <button className={styles.deleteBtn} onClick={onDelete}>삭제</button>
        )}
      </div>

      <p className={styles.answerBody}>{answerBody}</p>

      <div className={styles.answerActions}>
        <button className={`${styles.answerBtn} ${liked ? styles.answerBtnActive : ''}`} onClick={onLike}>
          <ThumbsUp size={13} />
          {liked ? '추천됨' : '추천'} {a.like_count > 0 ? a.like_count : ''}
        </button>
        <button className={`${styles.answerBtn} ${showComments ? styles.answerBtnActive : ''}`} onClick={onCommentToggle}>
          <MessageCircle size={13} />
          댓글 {comments !== null && comments.length > 0 ? comments.length : ''}
        </button>
        <button className={`${styles.cheerBtn} ${cheered ? styles.cheerBtnActive : ''}`} onClick={onCheer}>
          <Zap size={13} />
          응원하기 {a.cheer_count > 0 ? a.cheer_count : ''}
        </button>
        {isMyQuestion && !isAnswered && (
          <button className={styles.adoptBtn} onClick={onAdopt}>
            <CheckCircle2 size={13} /> 채택하기
          </button>
        )}
      </div>

      {showComments && (
        <div className={styles.commentBox}>
          {comments === null ? (
            <p style={{ color: 'var(--t3)', fontSize: 13 }}>로딩 중...</p>
          ) : comments.length === 0 ? (
            <p style={{ color: 'var(--t3)', fontSize: 13 }}>아직 댓글이 없어요.</p>
          ) : (
            comments.map((c: any, i: number) => (
              <div key={i} className={styles.commentItem}>
                <strong>{c.users?.name || '익명'}</strong>
                <span>{translateText(`comment:${c.id}:body`, c.body)}</span>
                {currentUserId && c.author_id === currentUserId && (
                  <button className={styles.commentDeleteBtn} onClick={() => onCommentDelete(c.id)}>×</button>
                )}
              </div>
            ))
          )}
          <div className={styles.commentInput}>
            <input
              value={commentInput}
              onChange={e => onCommentChange(e.target.value)}
              placeholder="댓글 달기..."
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && onCommentSubmit()}
            />
            <button onClick={onCommentSubmit} disabled={commentSubmitting || !commentInput.trim()}>
              {commentSubmitting ? '...' : '등록'}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ── 질문하기 모달 ──
function AskModal({ onClose, router, user, onToast }: any) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('재테크입문');

  const submit = async () => {
    if (!title.trim()) return;
    let slug = createQuestionSlug(title);
    if (hasSupabase() && user) {
      const supabase = createClient();
      slug = await ensureUniqueSlug(slug, async candidate => {
        const { data } = await supabase
          .from('questions')
          .select('id')
          .eq('slug', candidate)
          .maybeSingle();
        return Boolean(data);
      });
      const { data, error } = await supabase
        .from('questions')
        .insert({ title, body, category: cat, slug, author_id: user.id, answer_count: 0 })
        .select('id, slug')
        .single();
      if (error) { onToast('❌ 오류가 생겼어요.'); return; }
      onClose();
      onToast('✅ 질문이 등록됐어요!');
      router.push(`/q/${data?.slug || data?.id || slug}`);
      return;
    }
    onClose();
    onToast('✅ 질문이 등록됐어요!');
    router.push('/');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 560, boxShadow: '0 24px 60px rgba(0,0,0,.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>질문하기</h2>
          <button onClick={onClose} style={{ width: 30, height: 30, background: 'var(--bg)', borderRadius: 7, fontSize: 18, color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
        </div>
        <div style={{ padding: '18px 22px 20px' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>카테고리</label>
            <select value={cat} onChange={e => setCat(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--line)', borderRadius: 9, fontSize: 14, outline: 'none' }}>
              {CATS.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>질문 제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="궁금한 점을 간단히 써주세요" style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--line)', borderRadius: 9, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', display: 'block', marginBottom: 6 }}>상세 내용 <span style={{ fontWeight: 400, color: 'var(--t3)' }}>(선택)</span></label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="상황을 더 설명해주시면 더 좋은 답변을 받을 수 있어요" style={{ width: '100%', padding: '11px 13px', border: '1.5px solid var(--line)', borderRadius: 9, fontSize: 14, outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={{ height: 38, padding: '0 18px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 14 }}>취소</button>
            <button onClick={submit} disabled={!title.trim()} style={{ height: 38, padding: '0 22px', background: title.trim() ? 'var(--primary)' : 'var(--line)', border: 'none', borderRadius: 8, color: title.trim() ? 'white' : 'var(--t3)', fontSize: 14, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default' }}>질문 올리기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
