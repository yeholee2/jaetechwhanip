'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, ChevronLeft, Share2, BookOpen } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';

export default function QuestionClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [answerBody, setAnswerBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');
  const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set());

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!hasSupabase() || !slug) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));

    supabase
      .from('questions')
      .select('*, users:author_id(id, name, avatar_url)')
      .eq('slug', slug)
      .single()
      .then(async ({ data: q, error }) => {
        if (error || !q) { setLoading(false); return; }
        setQuestion(q);

        // 조회수 증가
        supabase.from('questions').update({ view_count: (q.view_count || 0) + 1 }).eq('id', q.id);

        // 답변 로드
        const { data: ans } = await supabase
          .from('answers')
          .select('*, users:author_id(id, name, avatar_url)')
          .eq('question_id', q.id)
          .order('is_adopted', { ascending: false })
          .order('like_count', { ascending: false })
          .order('created_at', { ascending: true });
        setAnswers(ans || []);

        // 관련 질문 (같은 카테고리)
        const { data: rel } = await supabase
          .from('questions')
          .select('id, title, slug, answer_count, created_at')
          .eq('category', q.category)
          .neq('id', q.id)
          .order('created_at', { ascending: false })
          .limit(4);
        setRelated(rel || []);

        setLoading(false);
      });
  }, [slug]);

  const submitAnswer = async () => {
    if (!answerBody.trim() || !user || !question) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: newAns, error } = await supabase
      .from('answers')
      .insert({ question_id: question.id, body: answerBody.trim(), author_id: user.id })
      .select('*, users:author_id(id, name, avatar_url)')
      .single();
    if (error) {
      showT('❌ 답변 등록에 실패했어요');
    } else {
      const newCount = (question.answer_count || 0) + 1;
      await supabase.from('questions').update({ answer_count: newCount }).eq('id', question.id);
      setAnswers(prev => [...prev, newAns]);
      setQuestion((q: any) => ({ ...q, answer_count: newCount }));
      setAnswerBody('');
      showT('✅ 답변이 등록됐어요!');
    }
    setSubmitting(false);
  };

  const adoptAnswer = async (answerId: string) => {
    if (!user || !question || user.id !== question.author_id) return;
    const supabase = createClient();
    await supabase.from('answers').update({ is_adopted: false }).eq('question_id', question.id);
    await supabase.from('answers').update({ is_adopted: true }).eq('id', answerId);
    await supabase.from('questions').update({ is_answered: true }).eq('id', question.id);
    setAnswers(prev => prev.map(a => ({ ...a, is_adopted: a.id === answerId })));
    setQuestion((q: any) => ({ ...q, is_answered: true }));
    showT('✅ 답변이 채택됐어요!');
  };

  const likeAnswer = async (answerId: string, current: number) => {
    if (!user) { showT('로그인 후 추천할 수 있어요'); return; }
    if (likedAnswers.has(answerId)) { showT('이미 추천했어요'); return; }
    const supabase = createClient();
    await supabase.from('answers').update({ like_count: current + 1 }).eq('id', answerId);
    setAnswers(prev => prev.map(a => a.id === answerId ? { ...a, like_count: current + 1 } : a));
    setLikedAnswers(prev => new Set([...prev, answerId]));
    showT('👍 추천했어요!');
  };

  const likeQuestion = async () => {
    if (!user) { showT('로그인 후 좋아요를 누를 수 있어요'); return; }
    const supabase = createClient();
    const newCount = (question.like_count || 0) + 1;
    await supabase.from('questions').update({ like_count: newCount }).eq('id', question.id);
    setQuestion((q: any) => ({ ...q, like_count: newCount }));
    showT('❤️ 좋아요!');
  };

  const share = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: question?.title, url });
    } else {
      navigator.clipboard?.writeText(url);
      showT('🔗 링크가 복사됐어요!');
    }
  };

  const ft = (d: string) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'#8B95A1'}}>
      <div style={{width:32,height:32,border:'3px solid #E5E8EB',borderTopColor:'#00C73C',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!question) return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'60px 20px',textAlign:'center'}}>
      <div style={{fontSize:48,marginBottom:16}}>🔍</div>
      <p style={{color:'#4E5968',fontSize:16,marginBottom:20}}>질문을 찾을 수 없어요.</p>
      <button onClick={() => router.push('/')} style={{padding:'12px 28px',background:'#00C73C',color:'white',border:'none',borderRadius:10,cursor:'pointer',fontWeight:700}}>홈으로 가기</button>
    </div>
  );

  return (
    <div style={{maxWidth:720,margin:'0 auto',background:'white',minHeight:'100vh'}}>
      {/* 헤더 */}
      <header style={{position:'sticky',top:0,background:'white',borderBottom:'1px solid #F2F4F6',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,zIndex:10}}>
        <button onClick={() => router.back()} style={{background:'none',border:'none',cursor:'pointer',padding:6,display:'flex',borderRadius:8,color:'#4E5968'}}>
          <ChevronLeft size={22}/>
        </button>
        <span className="logo-font" style={{fontSize:16,cursor:'pointer',flex:1}} onClick={() => router.push('/')}>
          재테크<em style={{fontStyle:'normal',color:'#00C73C'}}>한입</em>
        </span>
        <button onClick={share} style={{background:'none',border:'none',cursor:'pointer',padding:6,color:'#8B95A1',display:'flex'}}>
          <Share2 size={18}/>
        </button>
      </header>

      <div style={{padding:'20px 16px 80px'}}>
        {/* 질문 */}
        <div style={{marginBottom:20}}>
          <div style={{display:'flex',gap:6,marginBottom:10,flexWrap:'wrap',alignItems:'center'}}>
            <span style={{fontSize:12,fontWeight:700,background:'#F2F4F6',color:'#4E5968',padding:'4px 10px',borderRadius:20}}>
              {question.category}
            </span>
            {question.is_answered && (
              <span style={{fontSize:12,fontWeight:700,background:'#E8F9EE',color:'#00C73C',padding:'4px 10px',borderRadius:20}}>
                ✅ 채택 완료
              </span>
            )}
          </div>
          <h1 style={{fontSize:21,fontWeight:800,lineHeight:1.4,marginBottom:14,color:'#191F28',letterSpacing:'-0.3px'}}>{question.title}</h1>
          {question.body && (
            <p style={{fontSize:15,color:'#4E5968',lineHeight:1.75,marginBottom:16,whiteSpace:'pre-wrap'}}>{question.body}</p>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#8B95A1',marginBottom:16}}>
            <span
              style={{fontWeight:700,color:'#3182F6',cursor:'pointer'}}
              onClick={() => question.users?.id && router.push(`/u/${question.users.id}`)}
            >
              {question.users?.name || '익명'}
            </span>
            <span>·</span>
            <span>{ft(question.created_at)}</span>
            {question.view_count > 0 && <><span>·</span><span>조회 {question.view_count}</span></>}
          </div>
          {/* 질문 액션 바 */}
          <div style={{display:'flex',gap:8,paddingTop:12,borderTop:'1px solid #F2F4F6'}}>
            <button
              onClick={likeQuestion}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#F9FAFB',border:'1px solid #E5E8EB',borderRadius:20,fontSize:13,cursor:'pointer',color:'#4E5968',fontWeight:500,transition:'all .15s'}}
            >
              <ThumbsUp size={14}/> 도움돼요 {question.like_count > 0 ? question.like_count : ''}
            </button>
            <button
              onClick={share}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#F9FAFB',border:'1px solid #E5E8EB',borderRadius:20,fontSize:13,cursor:'pointer',color:'#4E5968',fontWeight:500}}
            >
              <Share2 size={14}/> 공유
            </button>
          </div>
        </div>

        <div style={{borderTop:'6px solid #F9FAFB',margin:'0 -16px 20px'}}/>

        {/* 답변 목록 */}
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:16,fontWeight:800,marginBottom:16,color:'#191F28'}}>
            답변 <span style={{color:'#00C73C'}}>{answers.length}</span>개
          </h2>
          {answers.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'#8B95A1'}}>
              <div style={{fontSize:40,marginBottom:12}}>💬</div>
              <p style={{fontSize:15,fontWeight:600,marginBottom:4}}>아직 답변이 없어요</p>
              <p style={{fontSize:13}}>첫 번째 답변을 남겨보세요!</p>
            </div>
          ) : answers.map((a, i) => (
            <div key={a.id} style={{
              padding:'16px',
              background: a.is_adopted ? '#F0FDF4' : 'white',
              borderRadius:12,
              marginBottom:12,
              border: a.is_adopted ? '1.5px solid #86EFAC' : '1.5px solid #F2F4F6',
            }}>
              {a.is_adopted && (
                <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:700,color:'#00C73C',marginBottom:10,background:'#DCFCE7',padding:'4px 10px',borderRadius:6,width:'fit-content'}}>
                  ✅ 채택된 답변
                </div>
              )}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'#3182F6',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>
                  {(a.users?.name || '익')[0]}
                </div>
                <div>
                  <span
                    style={{fontSize:13,fontWeight:700,color:'#3182F6',cursor:'pointer'}}
                    onClick={() => a.users?.id && router.push(`/u/${a.users.id}`)}
                  >
                    {a.users?.name || '익명'}
                  </span>
                  <span style={{fontSize:12,color:'#8B95A1',marginLeft:6}}>{ft(a.created_at)}</span>
                </div>
              </div>
              <p style={{fontSize:14,color:'#191F28',lineHeight:1.75,marginBottom:12,whiteSpace:'pre-wrap'}}>{a.body}</p>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <button
                  onClick={() => likeAnswer(a.id, a.like_count || 0)}
                  style={{
                    display:'flex',alignItems:'center',gap:5,
                    padding:'5px 12px',
                    background: likedAnswers.has(a.id) ? '#EFF6FF' : 'white',
                    border: `1px solid ${likedAnswers.has(a.id) ? '#BFDBFE' : '#E5E8EB'}`,
                    borderRadius:20,fontSize:13,cursor:'pointer',
                    color: likedAnswers.has(a.id) ? '#3182F6' : '#4E5968',
                    fontWeight:500,transition:'all .15s'
                  }}
                >
                  <ThumbsUp size={13}/> 추천 {a.like_count > 0 ? a.like_count : ''}
                </button>
                {user && question.author_id === user.id && !question.is_answered && (
                  <button
                    onClick={() => adoptAnswer(a.id)}
                    style={{padding:'5px 14px',background:'#00C73C',border:'none',borderRadius:20,fontSize:13,color:'white',cursor:'pointer',fontWeight:700}}
                  >
                    채택하기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 답변 입력 */}
        {user ? (
          <div style={{background:'#FAFAFA',borderRadius:14,padding:16,border:'1.5px solid #E5E8EB',marginBottom:32}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#00C73C',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700}}>
                {(user.user_metadata?.name || user.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{fontSize:13,fontWeight:700,color:'#191F28'}}>{user.user_metadata?.name || user.email?.split('@')[0]}</span>
            </div>
            <textarea
              value={answerBody}
              onChange={e => setAnswerBody(e.target.value)}
              placeholder="도움이 될 답변을 남겨주세요. 실제 경험담이면 더 좋아요! 😊"
              rows={4}
              style={{width:'100%',padding:'12px',border:'1.5px solid #E5E8EB',borderRadius:10,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box',background:'white',lineHeight:1.65,transition:'border-color .15s'}}
              onFocus={e => e.target.style.borderColor='#00C73C'}
              onBlur={e => e.target.style.borderColor='#E5E8EB'}
            />
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10}}>
              <span style={{fontSize:12,color:'#8B95A1'}}>{answerBody.length}자</span>
              <button
                onClick={submitAnswer}
                disabled={submitting || !answerBody.trim()}
                style={{
                  padding:'10px 24px',
                  background: answerBody.trim() ? '#00C73C' : '#E5E8EB',
                  border:'none',borderRadius:10,
                  color: answerBody.trim() ? 'white' : '#8B95A1',
                  fontSize:14,fontWeight:700,cursor: answerBody.trim() ? 'pointer' : 'default',
                  transition:'all .2s'
                }}
              >
                {submitting ? '등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'28px 20px',background:'#F9FAFB',borderRadius:14,border:'1.5px solid #E5E8EB',marginBottom:32}}>
            <div style={{fontSize:32,marginBottom:10}}>💬</div>
            <p style={{fontSize:15,color:'#191F28',fontWeight:700,marginBottom:4}}>나도 답변할 수 있어요</p>
            <p style={{fontSize:13,color:'#8B95A1',marginBottom:16}}>로그인하면 답변을 남길 수 있어요</p>
            <button
              onClick={() => router.push(`/auth?next=/q/${slug}`)}
              style={{padding:'12px 28px',background:'#00C73C',border:'none',borderRadius:10,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}
            >
              로그인하고 답변하기
            </button>
          </div>
        )}

        {/* 관련 질문 */}
        {related.length > 0 && (
          <div>
            <h3 style={{fontSize:15,fontWeight:800,marginBottom:12,color:'#191F28',display:'flex',alignItems:'center',gap:6}}>
              <BookOpen size={16} color="#00C73C"/> 관련 질문
            </h3>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {related.map(r => (
                <div
                  key={r.id}
                  onClick={() => router.push(`/q/${r.slug}`)}
                  style={{padding:'12px 14px',background:'#FAFAFA',borderRadius:10,cursor:'pointer',border:'1px solid #F2F4F6',transition:'all .15s'}}
                  onMouseEnter={e => (e.currentTarget.style.background='#F2F4F6')}
                  onMouseLeave={e => (e.currentTarget.style.background='#FAFAFA')}
                >
                  <p style={{fontSize:14,fontWeight:600,color:'#191F28',marginBottom:4,lineHeight:1.4}}>{r.title}</p>
                  <span style={{fontSize:12,color:'#8B95A1'}}>답변 {r.answer_count || 0}개</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',
          background:'#191F28',color:'white',padding:'10px 20px',
          borderRadius:10,fontSize:14,fontWeight:500,zIndex:999,
          whiteSpace:'nowrap',boxShadow:'0 4px 20px rgba(0,0,0,.2)',
          animation:'fadeIn .2s ease'
        }}>
          {toast}
          <style>{`@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}
    </div>
  );
}
