'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Bold,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Gift,
  Heart,
  List,
  MessageCircle,
  MoreHorizontal,
  Search,
  Send,
  Share2,
  Sparkles,
  ThumbsUp,
  UserRound,
} from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './QuestionClient.module.css';

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

function initials(name?: string) {
  return (name || '익명').slice(0, 1).toUpperCase();
}

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

  const showT = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (!hasSupabase() || !slug) return;
    const supabase = createClient();
    const auth = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));

    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));

    supabase
      .from('questions')
      .select('*, users:author_id(id, name, avatar_url, provider)')
      .eq('slug', slug)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setLoading(false);
          return;
        }

        setQ(data);
        supabase.from('questions').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id);

        const { data: ans } = await supabase
          .from('answers')
          .select('*, users:author_id(id, name, avatar_url)')
          .eq('question_id', data.id)
          .order('is_adopted', { ascending: false })
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: true });
        setAnswers(ans || []);

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

    return () => auth.data.subscription.unsubscribe();
  }, [slug]);

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
      showT('답변이 등록됐어요.');
    } else {
      showT('답변 등록에 실패했어요.');
    }
    setSubmitting(false);
  };

  const adoptAnswer = async (answerId: string) => {
    if (!user || !q || user.id !== q.author_id) return;
    const supabase = createClient();
    await supabase.from('answers').update({ is_adopted: false }).eq('question_id', q.id);
    await supabase.from('answers').update({ is_adopted: true }).eq('id', answerId);
    await supabase.from('questions').update({ is_answered: true }).eq('id', q.id);
    setAnswers(prev => prev.map(a => ({ ...a, is_adopted: a.id === answerId })));
    setQ((prev: any) => ({ ...prev, is_answered: true }));
    showT('채택 완료!');
  };

  const likeAnswer = async (answerId: string, current: number) => {
    if (!user) {
      showT('로그인 후 추천할 수 있어요.');
      return;
    }
    if (likedAnswers.has(answerId)) {
      showT('이미 추천했어요.');
      return;
    }
    const supabase = createClient();
    await supabase.from('answers').update({ like_count: current + 1 }).eq('id', answerId);
    setAnswers(prev => prev.map(a => (a.id === answerId ? { ...a, like_count: current + 1 } : a)));
    setLikedAnswers(prev => new Set([...prev, answerId]));
  };

  const likeQuestion = async () => {
    if (!user) {
      showT('로그인 후 좋아요를 누를 수 있어요.');
      return;
    }
    const supabase = createClient();
    const newCount = (q.like_count || 0) + 1;
    await supabase.from('questions').update({ like_count: newCount }).eq('id', q.id);
    setQ((prev: any) => ({ ...prev, like_count: newCount }));
    showT('도움돼요를 남겼어요.');
  };

  const toggleComments = async (answerId: string) => {
    const next = new Set(openComments);
    if (next.has(answerId)) {
      next.delete(answerId);
    } else {
      next.add(answerId);
      if (!comments[answerId]) setComments(prev => ({ ...prev, [answerId]: [] }));
    }
    setOpenComments(next);
  };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: q?.title, url });
    else {
      navigator.clipboard?.writeText(url);
      showT('링크를 복사했어요.');
    }
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '나';
  const answerCount = q?.answer_count ?? answers.length;
  const minAnswerLength = 55;
  const remainingLength = Math.max(0, minAnswerLength - answerBody.trim().length);

  const expertColumns = useMemo(
    () => [
      { tag: '절세', title: 'ISA와 연금저축, 같이 쓰면 어디서 세금이 줄어들까요?', stat: '답변 12' },
      { tag: '투자', title: 'S&P500 장기투자 전에 꼭 정해야 하는 기준', stat: '조회 1,284' },
      { tag: '보험', title: '실손보험 갈아타기 전 확인해야 할 약관 포인트', stat: '답변 8' },
    ],
    [],
  );

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!q) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyIcon}>?</p>
        <h1>질문을 찾을 수 없어요</h1>
        <p>삭제됐거나 잘못된 주소예요.</p>
        <button onClick={() => router.push('/')}>홈으로</button>
      </div>
    );
  }

  const authorName = q.users?.name || '익명';

  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <button className={styles.logo} onClick={() => router.push('/')}>
          재테크<em>한입</em>
        </button>
        <nav className={styles.navLinks} aria-label="주요 메뉴">
          <button onClick={() => router.push('/')}>홈</button>
          <button>토픽</button>
          <button>스파링</button>
          <button>잉크</button>
          <button>미션</button>
          <span />
          <button>전문가 신청</button>
        </nav>
        <div className={styles.navActions}>
          <button aria-label="검색"><Search size={21} /></button>
          <button aria-label="알림"><Bell size={20} /></button>
          <button aria-label="내 정보"><UserRound size={20} /></button>
          <button className={styles.askButton} onClick={() => router.push('/')}>나도 질문하기</button>
        </div>
      </header>

      <header className={styles.mobileHeader}>
        <button aria-label="뒤로" onClick={() => router.back()}><ChevronLeft size={24} /></button>
        <button className={styles.mobileLogo} onClick={() => router.push('/')}>재테크<em>한입</em></button>
        <button aria-label="공유" onClick={share}><Share2 size={20} /></button>
      </header>

      <main className={styles.layout}>
        <section className={styles.mainColumn}>
          <div className={styles.topicHeader}>
            <span>{q.category || '재테크'}</span>
            <h1>{q.category || '재테크 입문'}</h1>
            <button aria-label="관심 토픽"><Heart size={25} /></button>
          </div>

          <article className={styles.questionCard}>
            <div className={styles.profileRow}>
              <Avatar name={authorName} imageUrl={q.users?.avatar_url} onClick={() => q.users?.id && router.push(`/u/${q.users.id}`)} />
              <button className={styles.profileText} onClick={() => q.users?.id && router.push(`/u/${q.users.id}`)}>
                <strong>{authorName}</strong>
                <span>{ft(q.created_at)} · 조회 {q.view_count || 0}</span>
              </button>
              <button className={styles.moreButton} aria-label="더보기"><MoreHorizontal size={20} /></button>
            </div>

            <h2 className={styles.questionTitle}>{q.title}</h2>
            {q.body && <p className={styles.questionBody}>{q.body}</p>}

            <div className={styles.questionActions}>
              <IconAction icon={<ThumbsUp size={22} />} label={q.like_count > 0 ? `도움돼요 ${q.like_count}` : '도움돼요'} onClick={likeQuestion} />
              <IconAction icon={<MessageCircle size={22} />} label={`답변 ${answerCount || answers.length}`} onClick={() => document.getElementById('answer-editor')?.scrollIntoView({ behavior: 'smooth' })} />
              <IconAction
                icon={<Bookmark size={22} fill={bookmarked ? 'currentColor' : 'none'} />}
                label="저장"
                active={bookmarked}
                onClick={() => {
                  setBookmarked(v => !v);
                  showT(bookmarked ? '저장을 해제했어요.' : '질문을 저장했어요.');
                }}
              />
              <IconAction icon={<Share2 size={22} />} label="공유" onClick={share} />
            </div>
          </article>

          <section className={styles.answerEditor} id="answer-editor">
            {user ? (
              <>
                <div className={styles.editorHeader}>
                  <Avatar name={userName} />
                  <strong>{userName}</strong>
                </div>
                <textarea
                  value={answerBody}
                  onChange={e => setAnswerBody(e.target.value)}
                  placeholder="당신의 지식을 공유해 보세요."
                  rows={5}
                />
                <div className={styles.editorFooter}>
                  <div className={styles.editorTools}>
                    <button aria-label="굵게"><Bold size={16} /></button>
                    <button aria-label="목록"><List size={16} /></button>
                    <button aria-label="전송 힌트"><Send size={16} /></button>
                  </div>
                  <span>{remainingLength > 0 ? `${remainingLength}글자 더 채워주세요.` : `${answerBody.trim().length}글자`}</span>
                  <button className={styles.submitButton} onClick={submitAnswer} disabled={submitting || !answerBody.trim()}>
                    {submitting ? '등록 중...' : '답변하기'}
                  </button>
                </div>
              </>
            ) : (
              <div className={styles.guestEditor}>
                <p>당신의 지식을 공유해 보세요.</p>
                <span>로그인하면 바로 답변을 남길 수 있어요.</span>
                <button onClick={() => router.push(`/auth?next=/q/${slug}`)}>로그인하고 답변하기</button>
              </div>
            )}
          </section>

          <section className={styles.answersSection}>
            <div className={styles.answersHead}>
              <h2>{answers.length}개의 답변이 있어요!</h2>
              <button onClick={() => showT('AI 요약은 곧 연결할게요.')}>
                <Sparkles size={17} />
                AI 답변 요약
              </button>
            </div>

            {answers.length === 0 ? (
              <div className={styles.noAnswers}>
                <MessageCircle size={34} />
                <strong>아직 답변이 없어요</strong>
                <span>첫 번째 답변을 남겨보세요.</span>
              </div>
            ) : (
              <div className={styles.answerList}>
                {answers.map(a => (
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
              </div>
            )}
          </section>
        </section>

        <aside className={styles.sideColumn}>
          <button className={styles.pollCard}>
            <span>33명 투표 중</span>
            <strong>지금 S&P500,<br />들어가도 될까요?</strong>
            <div className={styles.pollVisual}>
              <span />
              <span />
            </div>
            <em>4일 남았어요 · 참여하기</em>
          </button>

          <section className={styles.sideBox}>
            <h3>전문가들의 생각, 잉크</h3>
            {expertColumns.map(item => (
              <button key={item.title} className={styles.columnLink}>
                <span>{item.tag}</span>
                <strong>{item.title}</strong>
                <em>{item.stat}</em>
              </button>
            ))}
          </section>

          <section className={styles.sideBox}>
            <h3>유사한 질문이 있어요.</h3>
            {related.length > 0 ? related.map(r => (
              <button key={r.id} className={styles.relatedLink} onClick={() => router.push(`/q/${r.slug}`)}>
                <span>{r.title}</span>
                <em>답변 {r.answer_count || 0}개</em>
              </button>
            )) : (
              <p className={styles.sideEmpty}>같은 카테고리의 질문을 모으는 중이에요.</p>
            )}
          </section>

          <section className={styles.appCard}>
            <Gift size={20} />
            <strong>재테크한입 앱 알림 준비 중</strong>
            <p>관심 질문 답변을 놓치지 않게 알려드릴게요.</p>
          </section>
        </aside>
      </main>

      <nav className={styles.floatDock} aria-label="빠른 메뉴">
        <button><BookOpen size={18} /></button>
        <button><MessageCircle size={18} /></button>
        <button onClick={share}><Share2 size={18} /></button>
      </nav>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

function Avatar({ name, imageUrl, onClick }: { name?: string; imageUrl?: string; onClick?: () => void }) {
  return (
    <button className={styles.avatar} onClick={onClick} disabled={!onClick} aria-label={name || '프로필'}>
      {imageUrl ? <img src={imageUrl} alt="" /> : initials(name)}
    </button>
  );
}

function IconAction({ icon, label, onClick, active }: { icon: ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button className={`${styles.iconAction} ${active ? styles.active : ''}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function AnswerCard({ answer: a, isMyQuestion, isAnswered, liked, onLike, onAdopt, onCommentToggle, showComments, comments, commentInput, onCommentChange, router }: any) {
  const name = a.users?.name || '익명';

  return (
    <article className={`${styles.answerCard} ${a.is_adopted ? styles.adoptedAnswer : ''}`}>
      {a.is_adopted && (
        <div className={styles.adoptedBadge}>
          <CheckCircle2 size={15} />
          채택된 답변
        </div>
      )}

      <div className={styles.answerProfile}>
        <Avatar name={name} imageUrl={a.users?.avatar_url} onClick={() => a.users?.id && router.push(`/u/${a.users.id}`)} />
        <button onClick={() => a.users?.id && router.push(`/u/${a.users.id}`)}>
          <strong>{name}</strong>
          <span>{a.created_at ? ft(a.created_at) : ''}</span>
        </button>
        <button className={styles.moreButton} aria-label="답변 더보기"><MoreHorizontal size={19} /></button>
      </div>

      <p className={styles.answerBody}>{a.body}</p>

      <div className={styles.answerActions}>
        <button className={liked ? styles.answerActionActive : ''} onClick={onLike}>
          <ThumbsUp size={15} />
          평가 {a.like_count > 0 ? a.like_count : ''}
        </button>
        <button className={showComments ? styles.answerActionActive : ''} onClick={onCommentToggle}>
          <MessageCircle size={15} />
          댓글 {comments.length > 0 ? comments.length : ''}
        </button>
        <button>
          <Gift size={15} />
          응원하기
        </button>
        {isMyQuestion && !isAnswered && (
          <button className={styles.adoptButton} onClick={onAdopt}>
            <CheckCircle2 size={15} />
            채택하기
          </button>
        )}
      </div>

      {showComments && (
        <div className={styles.commentBox}>
          {comments.length === 0 && <p>아직 댓글이 없어요.</p>}
          {comments.map((c: any, i: number) => (
            <div key={i} className={styles.commentItem}>{c.body}</div>
          ))}
          <div className={styles.commentInput}>
            <input value={commentInput} onChange={e => onCommentChange(e.target.value)} placeholder="댓글 달기..." />
            <button>등록</button>
          </div>
        </div>
      )}
    </article>
  );
}
