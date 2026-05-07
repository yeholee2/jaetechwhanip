'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ThumbsUp, MessageCircle, ChevronLeft } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';

export default function QuestionPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [question, setQuestion] = useState<any>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [answerBody, setAnswerBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!hasSupabase() || !slug) return;
    const supabase = createClient();

    // 유저 상태
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));

    // 질문 로드
    supabase
      .from('questions')
      .select('*, users:author_id(name, avatar_url)')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoading(false); return; }
        setQuestion(data);
        // 답변 로드
        supabase
          .from('answers')
          .select('*, users:author_id(name, avatar_url)')
          .eq('question_id', data.id)
          .order('created_at', { ascending: true })
          .then(({ data: ans }) => {
            setAnswers(ans || []);
            setLoading(false);
          });
      });
  }, [slug]);

  const submitAnswer = async () => {
    if (!answerBody.trim() || !user || !question) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from('answers').insert({
      question_id: question.id,
      body: answerBody.trim(),
      author_id: user.id,
    });
    if (error) {
      showT('❌ 답변 등록에 실패했어요');
    } else {
      // answer_count 업데이트
      await supabase
        .from('questions')
        .update({ answer_count: (question.answer_count || 0) + 1 })
        .eq('id', question.id);
      setAnswerBody('');
      showT('✅ 답변이 등록됐어요!');
      // 답변 다시 로드
      const { data: newAnswers } = await supabase
        .from('answers')
        .select('*, users:author_id(name, avatar_url)')
        .eq('question_id', question.id)
        .order('created_at', { ascending: true });
      setAnswers(newAnswers || []);
      setQuestion((q: any) => ({ ...q, answer_count: (q.answer_count || 0) + 1 }));
    }
    setSubmitting(false);
  };

  const adoptAnswer = async (answerId: string) => {
    if (!user || !question || user.id !== question.author_id) return;
    const supabase = createClient();
    // 기존 채택 취소
    await supabase.from('answers').update({ is_adopted: false }).eq('question_id', question.id);
    // 새 채택
    await supabase.from('answers').update({ is_adopted: true }).eq('id', answerId);
    await supabase.from('questions').update({ is_answered: true }).eq('id', question.id);
    setAnswers(prev => prev.map(a => ({ ...a, is_adopted: a.id === answerId })));
    setQuestion((q: any) => ({ ...q, is_answered: true }));
    showT('✅ 답변이 채택됐어요!');
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8B95A1'}}>
      불러오는 중...
    </div>
  );

  if (!question) return (
    <div style={{maxWidth:640,margin:'0 auto',padding:'40px 20px',textAlign:'center'}}>
      <p style={{color:'#8B95A1',marginBottom:20}}>질문을 찾을 수 없어요.</p>
      <button onClick={() => router.push('/')} style={{padding:'10px 20px',background:'#00C73C',color:'white',border:'none',borderRadius:8,cursor:'pointer'}}>홈으로</button>
    </div>
  );

  return (
    <div style={{maxWidth:680,margin:'0 auto',padding:'0 0 80px'}}>
      {/* 헤더 */}
      <header style={{position:'sticky',top:0,background:'white',borderBottom:'1px solid #F2F4F6',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,zIndex:10}}>
        <button onClick={() => router.back()} style={{background:'none',border:'none',cursor:'pointer',padding:4,display:'flex',alignItems:'center',color:'#4E5968'}}>
          <ChevronLeft size={22}/>
        </button>
        <div className="logo-font" style={{fontSize:16,cursor:'pointer'}} onClick={() => router.push('/')}>재테크<em style={{fontStyle:'normal',color:'#00C73C'}}>한입</em></div>
      </header>

      <div style={{padding:'20px 16px'}}>
        {/* 질문 */}
        <div style={{marginBottom:24}}>
          <div style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap'}}>
            <span style={{fontSize:12,fontWeight:700,background:'#F2F4F6',padding:'3px 8px',borderRadius:6}}>{question.category}</span>
            {question.is_answered && <span style={{fontSize:12,fontWeight:700,background:'#E8F9EE',color:'#00C73C',padding:'3px 8px',borderRadius:6}}>✅ 채택 완료</span>}
          </div>
          <h1 style={{fontSize:20,fontWeight:700,lineHeight:1.4,marginBottom:12,color:'#191F28'}}>{question.title}</h1>
          {question.body && <p style={{fontSize:15,color:'#4E5968',lineHeight:1.7,marginBottom:16,whiteSpace:'pre-wrap'}}>{question.body}</p>}
          <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#8B95A1'}}>
            <span style={{fontWeight:600,color:'#3182F6'}}>{question.users?.name || '익명'}</span>
            <span>·</span>
            <span>{formatTime(question.created_at)}</span>
            <span>·</span>
            <span>답변 {question.answer_count || 0}개</span>
          </div>
        </div>

        <hr style={{border:'none',borderTop:'1px solid #F2F4F6',marginBottom:20}}/>

        {/* 답변 목록 */}
        <div style={{marginBottom:24}}>
          <h2 style={{fontSize:15,fontWeight:700,marginBottom:16,color:'#191F28'}}>
            답변 {answers.length}개
          </h2>
          {answers.length === 0 ? (
            <div style={{textAlign:'center',padding:'32px 0',color:'#8B95A1'}}>
              <p style={{fontSize:14}}>아직 답변이 없어요.</p>
              <p style={{fontSize:13,marginTop:4}}>첫 번째 답변을 남겨보세요!</p>
            </div>
          ) : (
            answers.map(a => (
              <div key={a.id} style={{padding:'16px',background: a.is_adopted ? '#F0FDF4' : '#FAFAFA',borderRadius:12,marginBottom:12,border: a.is_adopted ? '1.5px solid #86EFAC' : '1.5px solid #F2F4F6'}}>
                {a.is_adopted && <div style={{fontSize:12,fontWeight:700,color:'#00C73C',marginBottom:8}}>✅ 채택된 답변</div>}
                <p style={{fontSize:14,color:'#191F28',lineHeight:1.7,marginBottom:12,whiteSpace:'pre-wrap'}}>{a.body}</p>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#8B95A1'}}>
                    <span style={{fontWeight:600,color:'#3182F6'}}>{a.users?.name || '익명'}</span>
                    <span>·</span>
                    <span>{formatTime(a.created_at)}</span>
                  </div>
                  <div style={{display:'flex',gap:6,alignItems:'center'}}>
                    <button style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',background:'white',border:'1px solid #E5E8EB',borderRadius:8,fontSize:12,cursor:'pointer',color:'#4E5968'}}>
                      <ThumbsUp size={12}/> {a.like_count || 0}
                    </button>
                    {/* 질문 작성자만 채택 가능 */}
                    {user && question.author_id === user.id && !question.is_answered && (
                      <button
                        onClick={() => adoptAnswer(a.id)}
                        style={{padding:'4px 10px',background:'#00C73C',border:'none',borderRadius:8,fontSize:12,color:'white',cursor:'pointer',fontWeight:600}}
                      >
                        채택하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 답변 입력 */}
        {user ? (
          <div style={{background:'#FAFAFA',borderRadius:12,padding:16,border:'1.5px solid #E5E8EB'}}>
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:12,color:'#191F28'}}>답변 남기기</h3>
            <textarea
              value={answerBody}
              onChange={e => setAnswerBody(e.target.value)}
              placeholder="도움이 될 답변을 남겨주세요. 경험담도 좋아요!"
              rows={4}
              style={{width:'100%',padding:'12px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box',background:'white',lineHeight:1.6}}
            />
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
              <button
                onClick={submitAnswer}
                disabled={submitting || !answerBody.trim()}
                style={{padding:'10px 24px',background: answerBody.trim() ? '#00C73C' : '#E5E8EB',border:'none',borderRadius:8,color: answerBody.trim() ? 'white' : '#8B95A1',fontSize:14,fontWeight:700,cursor: answerBody.trim() ? 'pointer' : 'default',transition:'all .2s'}}
              >
                {submitting ? '등록 중...' : '답변 등록'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{textAlign:'center',padding:'24px',background:'#FAFAFA',borderRadius:12,border:'1.5px solid #E5E8EB'}}>
            <p style={{fontSize:14,color:'#4E5968',marginBottom:12}}>답변을 남기려면 로그인이 필요해요.</p>
            <button onClick={() => router.push(`/auth?next=/q/${slug}`)} style={{padding:'10px 24px',background:'#00C73C',border:'none',borderRadius:8,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              로그인하고 답변하기
            </button>
          </div>
        )}
      </div>

      {toast && (
        <div style={{position:'fixed',bottom:80,left:'50%',transform:'translateX(-50%)',background:'#191F28',color:'white',padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:500,zIndex:999,whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}
    </div>
  );
}
