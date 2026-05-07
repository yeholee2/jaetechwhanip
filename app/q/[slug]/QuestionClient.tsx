'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ThumbsDown, ChevronLeft, Share2, BookOpen, Bookmark, MessageCircle, CheckCircle2 } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';

// ─── 유틸 ───────────────────────────────────────────
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

// ─── 메인 컴포넌트 ───────────────────────────────────
export default function QuestionClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [q, setQ] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [answerBody, setAnswerBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [bookmarked, setBookmarked] = useState(false);
  const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set());
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!hasSupabase() || !slug) return;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));

    supabase
      .from('questions')
      .select('*, users:author_id(id, name, avatar_url, provider)')
      .eq('slug', slug)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        setQ(data);
        supabase.from('questions').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);

        // 답변: 채택 → 추천수 → 최신 순
        const { data: ans } = await supabase
          .from('answers')
          .select('*, users:author_id(id, name, avatar_url)')
          .eq('question_id', data.id)
          .order('is_adopted', { ascending: false })
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: true });
        setAnswers(ans || []);

        // 관련 질문
        const { data: rel } = await supabase
          .from('questions')
          .select('id, title, slug, answer_count, is_answered')
          .eq('category', data.category)
          .neq('id', data.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRelated(rel || []);
        setLoading(false);
      });
  }, [slug]);

  // 답변 등록
  const submitAnswer = async () => {
    if (!answerBody.trim() || !user || !q) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: newAns, error } = await supabase
      .from('answers')
      .insert({ question_id: q.id, body: answerBody.trim(), author_id: user.id })
      .select('*, users:author_id(id, name, avatar_url)')
      .single();
    if (!error && newAns) {
      const newCount = (q.answer_count || 0) + 1;
      await supabase.from('questions').update({ answer_count: newCount }).eq('id', q.id);
      setAnswers(prev => [...prev, newAns]);
      setQ((prev: any) => ({ ...prev, answer_count: newCount }));
      setAnswerBody('');
      showT('✅ 답변이 등록됐어요!');
    } else {
      showT('❌ 답변 등록에 실패했어요');
    }
    setSubmitting(false);
  };

  // 답변 채택
  const adoptAnswer = async (answerId: string) => {
    if (!user || !q || user.id !== q.author_id) return;
    const supabase = createClient();
    await supabase.from('answers').update({ is_adopted: false }).eq('question_id', q.id);
    await supabase.from('answers').update({ is_adopted: true }).eq('id', answerId);
    await supabase.from('questions').update({ is_answered: true }).eq('id', q.id);
    setAnswers(prev => prev.map(a => ({ ...a, is_adopted: a.id === answerId })));
    setQ((prev: any) => ({ ...prev, is_answered: true }));
    showT('🏆 채택 완료!');
  };

  // 답변 추천
  const likeAnswer = async (answerId: string, current: number) => {
    if (!user) { showT('로그인 후 추천할 수 있어요'); return; }
    if (likedAnswers.has(answerId)) { showT('이미 추천했어요'); return; }
    const supabase = createClient();
    await supabase.from('answers').update({ like_count: current + 1 }).eq('id', answerId);
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, like_count: current + 1 } : a));
    setLikedAnswers(prev => new Set([...prev, answerId]));
  };

  // 질문 좋아요
  const likeQ = async () => {
    if (!user) { showT('로그인 후 좋아요를 누를 수 있어요'); return; }
    const supabase = createClient();
    const newCount = (q.like_count || 0) + 1;
    await supabase.from('questions').update({ like_count: newCount }).eq('id', q.id);
    setQ((prev: any) => ({ ...prev, like_count: newCount }));
    showT('❤️ 도움됐어요!');
  };

  // 댓글 토글
  const toggleComments = async (answerId: string) => {
    const next = new Set(openComments);
    if (next.has(answerId)) { next.delete(answerId); }
    else {
      next.add(answerId);
      // 댓글 로드 (answers 테이블에 parent_id 컬럼 없으면 빈 배열)
      if (!comments[answerId]) setComments(prev => ({ ...prev, [answerId]: [] }));
    }
    setOpenComments(next);
  };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: q?.title, url });
    else { navigator.clipboard?.writeText(url); showT('🔗 링크 복사됐어요!'); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #F2F4F6', borderTopColor: '#3182F6', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!q) return (
    <div style={{ maxWidth: 640, margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
      <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#191F28', marginBottom: 8 }}>질문을 찾을 수 없어요</p>
      <p style={{ fontSize: 14, color: '#8B95A1', marginBottom: 24 }}>삭제됐거나 잘못된 주소예요</p>
      <button onClick={() => router.push('/')} style={{ padding: '12px 28px', background: '#3182F6', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>홈으로</button>
    </div>
  );

  const authorName = q.users?.name || '익명';
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '';

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', background: 'white', minHeight: '100vh', fontFamily: 'Pretendard, sans-serif' }}>

      {/* ── 헤더 ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'white', borderBottom: '1px solid #F2F4F6', padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#191F28', display: 'flex', padding: 6, borderRadius: 8 }}>
          <ChevronLeft size={22} />
        </button>
        <span onClick={() => router.push('/')} className="logo-font" style={{ fontSize: 17, cursor: 'pointer', flex: 1, color: '#191F28' }}>
          재테크<em style={{ fontStyle: 'normal', color: '#3182F6' }}>한입</em>
        </span>
        <button onClick={() => setBookmarked(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: bookmarked ? '#3182F6' : '#8B95A1', display: 'flex', padding: 6 }}>
          <Bookmark size={20} fill={bookmarked ? '#3182F6' : 'none'} />
        </button>
        <button onClick={share} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8B95A1', display: 'flex', padding: 6 }}>
          <Share2 size={20} />
        </button>
      </header>

      <div style={{ padding: '20px 16px 100px' }}>

        {/* ── 카테고리 브레드크럼 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <span onClick={() => router.push('/')} style={{ fontSize: 13, color: '#8B95A1', cursor: 'pointer' }}>홈</span>
          <span style={{ fontSize: 13, color: '#D1D6DB' }}>›</span>
          <span style={{ fontSize: 13, color: '#8B95A1', cursor: 'pointer' }}>{q.category}</span>
        </div>

        {/* ── 질문 카드 ── */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #F2F4F6', padding: '20px 18px', marginBottom: 4, boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
          {/* 작성자 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8F3FF', color: '#3182F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0, cursor: 'pointer' }}
              onClick={() => q.users?.id && router.push(`/u/${q.users.id}`)}>
              {authorName[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}
                  onClick={() => q.users?.id && router.push(`/u/${q.users.id}`)}>
                  {authorName}
                </span>
                {q.is_answered && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#00C73C', background: '#E8F9EE', padding: '2px 7px', borderRadius: 10 }}>채택률 높음</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#8B95A1', marginTop: 1 }}>
                {ft(q.created_at)} · 조회 {q.view_count || 0}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#EFF6FF', color: '#3182F6', padding: '4px 10px', borderRadius: 20 }}>{q.category}</span>
              {q.is_answered && <span style={{ fontSize: 12, fontWeight: 700, background: '#E8F9EE', color: '#00C73C', padding: '4px 10px', borderRadius: 20 }}>✅ 채택완료</span>}
            </div>
          </div>

          {/* 제목 */}
          <h1 style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.45, color: '#191F28', marginBottom: 12, letterSpacing: '-0.3px' }}>{q.title}</h1>

          {/* 본문 */}
          {q.body && <p style={{ fontSize: 15, color: '#4E5968', lineHeight: 1.8, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{q.body}</p>}

          {/* 액션 바 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, borderTop: '1px solid #F2F4F6' }}>
            <ActionBtn icon={<ThumbsUp size={15} />} label={q.like_count > 0 ? String(q.like_count) : '도움돼요'} onClick={likeQ} active={false} />
            <ActionBtn icon={<Bookmark size={15} />} label="저장" onClick={() => { setBookmarked(v => !v); showT(bookmarked ? '북마크 해제' : '📌 저장됐어요'); }} active={bookmarked} />
            <ActionBtn icon={<Share2 size={15} />} label="공유" onClick={share} active={false} />
          </div>
        </div>

        {/* ── 구분선 ── */}
        <div style={{ height: 8, background: '#F9FAFB', margin: '0 -16px 20px' }} />

        {/* ── 답변 수 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#191F28' }}>
            답변 <span style={{ color: '#3182F6' }}>{answers.length}</span>
          </h2>
          {answers.length > 0 && (
            <div style={{ display: 'flex', marginLeft: 4 }}>
              {answers.slice(0, 3).map((a, i) => (
                <div key={i} style={{ width: 24, height: 24, borderRadius: '50%', background: '#3182F6', border: '2px solid white', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, marginLeft: i > 0 ? -8 : 0 }}>
                  {(a.users?.name || '?')[0]}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 답변 목록 ── */}
        {answers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0 32px', color: '#8B95A1' }}>
            <p style={{ fontSize: 36, marginBottom: 10 }}>💬</p>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>아직 답변이 없어요</p>
            <p style={{ fontSize: 13 }}>첫 번째 답변을 남겨보세요!</p>
          </div>
        ) : answers.map(a => (
          <AnswerCard
            key={a.id}
            answer={a}
            isMyQuestion={user?.id === q.author_id}
            isAnswered={q.is_answered}
            liked={likedAnswers.has(a.id)}
            onLike={() => likeAnswer(a.id, a.like_count || 0)}
            onAdopt={() => adoptAnswer(a.id)}
            onCommentToggle={() => toggleComments(a.id)}
            showComments={openComments.has(a.id)}
            comments={comments[a.id] || []}
            commentInput={commentInput[a.id] || ''}
            onCommentChange={(v: string) => setCommentInput(prev => ({ ...prev, [a.id]: v }))}
            router={router}
          />
        ))}

        {/* ── 답변 입력 ── */}
        <div style={{ marginBottom: 32 }}>
          {user ? (
            <div style={{ background: '#FAFAFA', borderRadius: 14, padding: '16px', border: '1.5px solid #E5E8EB' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3182F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {userName[0]?.toUpperCase() || 'U'}
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#191F28' }}>{userName}</span>
              </div>
              <textarea
                ref={textareaRef}
                value={answerBody}
                onChange={e => setAnswerBody(e.target.value)}
                placeholder="지식을 나눠주세요. 경험담이면 더욱 좋아요! 😊"
                rows={4}
                style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E8EB', borderRadius: 10, fontSize: 14, lineHeight: 1.7, outline: 'none', resize: 'none', boxSizing: 'border-box', background: 'white', transition: 'border-color .15s' }}
                onFocus={e => e.target.style.borderColor = '#3182F6'}
                onBlur={e => e.target.style.borderColor = '#E5E8EB'}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ fontSize: 12, color: '#D1D6DB' }}>{answerBody.length}자</span>
                <button
                  onClick={submitAnswer}
                  disabled={submitting || !answerBody.trim()}
                  style={{ padding: '10px 24px', background: answerBody.trim() ? '#3182F6' : '#E5E8EB', border: 'none', borderRadius: 10, color: answerBody.trim() ? 'white' : '#8B95A1', fontSize: 14, fontWeight: 700, cursor: answerBody.trim() ? 'pointer' : 'default', transition: 'all .2s' }}
                >
                  {submitting ? '등록 중...' : '답변 등록'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 20px', background: '#F9FAFB', borderRadius: 14, border: '1.5px dashed #E5E8EB' }}>
              <p style={{ fontSize: 22, marginBottom: 8 }}>💡</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#191F28', marginBottom: 4 }}>나도 답변할 수 있어요</p>
              <p style={{ fontSize: 13, color: '#8B95A1', marginBottom: 16 }}>내 지식이 누군가에게 도움이 돼요</p>
              <button onClick={() => router.push(`/auth?next=/q/${slug}`)}
                style={{ padding: '12px 28px', background: '#3182F6', border: 'none', borderRadius: 10, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                로그인하고 답변하기
              </button>
            </div>
          )}
        </div>

        {/* ── 관련 질문 ── */}
        {related.length > 0 && (
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#191F28', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={16} color="#3182F6" /> 관련 질문
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {related.map(r => (
                <div key={r.id}
                  onClick={() => router.push(`/q/${r.slug}`)}
                  style={{ padding: '12px 14px', background: '#FAFAFA', borderRadius: 10, cursor: 'pointer', border: '1px solid #F2F4F6', transition: 'all .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FAFAFA'; e.currentTarget.style.borderColor = '#F2F4F6'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#191F28', lineHeight: 1.4 }}>{r.title}</p>
                    {r.is_answered && <CheckCircle2 size={16} color="#00C73C" style={{ flexShrink: 0, marginTop: 1 }} />}
                  </div>
                  <span style={{ fontSize: 12, color: '#8B95A1', marginTop: 4, display: 'block' }}>답변 {r.answer_count || 0}개</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 토스트 ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#191F28', color: 'white', padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,.2)', animation: 'toastIn .2s ease' }}>
          {toast}
          <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}
    </div>
  );
}

// ─── 액션 버튼 ───────────────────────────────────────
function ActionBtn({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: active ? '#EFF6FF' : '#F9FAFB', border: `1px solid ${active ? '#BFDBFE' : '#E5E8EB'}`, borderRadius: 20, fontSize: 13, cursor: 'pointer', color: active ? '#3182F6' : '#4E5968', fontWeight: 500, transition: 'all .15s' }}>
      {icon} {label}
    </button>
  );
}

// ─── 답변 카드 ───────────────────────────────────────
function AnswerCard({ answer: a, isMyQuestion, isAnswered, liked, onLike, onAdopt, onCommentToggle, showComments, comments, commentInput, onCommentChange, router }: any) {
  const name = a.users?.name || '익명';
  return (
    <div style={{ padding: '18px 0', borderBottom: '1px solid #F2F4F6' }}>
      {a.is_adopted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#00C73C', background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '6px 12px', borderRadius: 8, marginBottom: 14, width: 'fit-content' }}>
          <CheckCircle2 size={14} /> 채택된 답변
        </div>
      )}
      {/* 작성자 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div
          onClick={() => a.users?.id && router.push(`/u/${a.users.id}`)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: '#3182F6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
          {name[0]?.toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span onClick={() => a.users?.id && router.push(`/u/${a.users.id}`)} style={{ fontSize: 14, fontWeight: 700, color: '#191F28', cursor: 'pointer' }}>{name}</span>
          </div>
          <span style={{ fontSize: 12, color: '#8B95A1' }}>{a.ft || ''}{a.created_at ? ft(a.created_at) : ''}</span>
        </div>
      </div>

      {/* 본문 */}
      <p style={{ fontSize: 15, color: '#191F28', lineHeight: 1.8, marginBottom: 14, whiteSpace: 'pre-wrap' }}>{a.body}</p>

      {/* 액션 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={onLike} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: liked ? '#EFF6FF' : '#F9FAFB', border: `1px solid ${liked ? '#BFDBFE' : '#E5E8EB'}`, borderRadius: 20, fontSize: 13, cursor: 'pointer', color: liked ? '#3182F6' : '#4E5968', fontWeight: 600, transition: 'all .15s' }}>
          <ThumbsUp size={13} /> 추천 {a.like_count > 0 ? a.like_count : ''}
        </button>
        <button onClick={onCommentToggle} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: showComments ? '#F5F3FF' : '#F9FAFB', border: `1px solid ${showComments ? '#DDD6FE' : '#E5E8EB'}`, borderRadius: 20, fontSize: 13, cursor: 'pointer', color: showComments ? '#7C3AED' : '#4E5968', fontWeight: 500 }}>
          <MessageCircle size={13} /> 댓글 {comments.length > 0 ? comments.length : ''}
        </button>
        {isMyQuestion && !isAnswered && (
          <button onClick={onAdopt} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#00C73C', border: 'none', borderRadius: 20, fontSize: 13, color: 'white', cursor: 'pointer', fontWeight: 700, marginLeft: 'auto' }}>
            <CheckCircle2 size={13} /> 채택하기
          </button>
        )}
      </div>

      {/* 댓글 영역 */}
      {showComments && (
        <div style={{ marginTop: 12, paddingLeft: 16, borderLeft: '2px solid #E5E8EB' }}>
          {comments.length === 0 && <p style={{ fontSize: 13, color: '#8B95A1', padding: '8px 0' }}>아직 댓글이 없어요</p>}
          {comments.map((c: any, i: number) => (
            <div key={i} style={{ fontSize: 13, color: '#4E5968', padding: '6px 0', borderBottom: '1px solid #F9FAFB' }}>{c.body}</div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              value={commentInput}
              onChange={e => onCommentChange(e.target.value)}
              placeholder="댓글 달기..."
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E8EB', borderRadius: 8, fontSize: 13, outline: 'none' }}
            />
            <button style={{ padding: '8px 14px', background: '#3182F6', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>등록</button>
          </div>
        </div>
      )}
    </div>
  );
}
