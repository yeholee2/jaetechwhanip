'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle, ThumbsUp } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';

function ft(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [tab, setTab] = useState<'questions'|'answers'>('questions');
  const [loading, setLoading] = useState(true);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.id === userId) setIsMe(true);
    });

    // 프로필 로드
    supabase.from('users').select('*').eq('id', userId).single()
      .then(({ data }) => { if (data) setProfile(data); });

    // 질문 로드 — 필요한 컬럼만
    supabase.from('questions')
      .select('id, title, slug, category, answer_count, is_answered, created_at')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setQuestions(data || []); setLoading(false); });

    // 답변 로드 — 필요한 컬럼만
    supabase.from('answers')
      .select('id, body, is_adopted, like_count, created_at, question_id, questions:question_id(id, title, slug)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setAnswers(data || []); });
  }, [userId]);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#8B95A1'}}>
      <div style={{width:32,height:32,border:'3px solid #E5E8EB',borderTopColor:'var(--primary)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const name = profile?.name || '익명';
  const initial = name[0]?.toUpperCase() || 'U';

  return (
    <div style={{maxWidth:680,margin:'0 auto',background:'white',minHeight:'100vh'}}>
      <header style={{position:'sticky',top:0,background:'white',borderBottom:'1px solid #F2F4F6',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,zIndex:10}}>
        <button onClick={() => router.back()} style={{background:'none',border:'none',cursor:'pointer',padding:6,display:'flex',color:'#4E5968'}}>
          <ChevronLeft size={22}/>
        </button>
        <span className="logo-font" style={{fontSize:16,flex:1,cursor:'pointer'}} onClick={() => router.push('/')}>
          재테크<em style={{fontStyle:'normal',color:'var(--primary)'}}>한입</em>
        </span>
      </header>

      {/* 프로필 헤더 */}
      <div style={{padding:'28px 20px 20px',borderBottom:'6px solid #F9FAFB'}}>
        <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:16}}>
          <div style={{width:64,height:64,borderRadius:'50%',background:'var(--primary)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:800,flexShrink:0}}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} alt={name}/>
              : initial}
          </div>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,color:'#191F28',marginBottom:4}}>{name}</h1>
            <div style={{display:'flex',gap:16,fontSize:13,color:'#4E5968'}}>
              <span><b style={{color:'#191F28'}}>{questions.length}</b> 질문</span>
              <span><b style={{color:'#191F28'}}>{answers.length}</b> 답변</span>
              <span><b style={{color:'#191F28'}}>{answers.filter(a=>a.is_adopted).length}</b> 채택</span>
            </div>
          </div>
        </div>
        {isMe && (
          <div style={{padding:'12px 14px',background:'#F9FAFB',borderRadius:10,fontSize:13,color:'#8B95A1',border:'1px solid #E5E8EB'}}>
            내 프로필이에요. 앞으로 프로필 편집 기능이 생길 거예요!
          </div>
        )}
      </div>

      {/* 탭 */}
      <div style={{display:'flex',borderBottom:'1px solid #F2F4F6',position:'sticky',top:53,background:'white',zIndex:9}}>
        {(['questions','answers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1,padding:'14px 0',border:'none',background:'none',
            fontSize:14,fontWeight: tab===t ? 700 : 400,
            color: tab===t ? 'var(--primary)' : '#8B95A1',
            borderBottom: tab===t ? '2px solid var(--primary)' : '2px solid transparent',
            cursor:'pointer',transition:'all .15s'
          }}>
            {t === 'questions' ? `질문 ${questions.length}` : `답변 ${answers.length}`}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div style={{padding:'8px 0'}}>
        {tab === 'questions' ? (
          questions.length === 0
            ? <Empty msg="아직 질문이 없어요"/>
            : questions.map(q => (
              <Link key={q.id} href={`/q/${q.slug || q.id}`} style={{display:'block',padding:'16px 20px',borderBottom:'1px solid #F9FAFB',cursor:'pointer',transition:'background .15s',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <div style={{display:'flex',gap:6,marginBottom:8,alignItems:'center'}}>
                  <span style={{fontSize:11,fontWeight:700,background:'#F2F4F6',color:'#4E5968',padding:'3px 8px',borderRadius:20}}>{q.category}</span>
                  {q.is_answered && <span style={{fontSize:11,fontWeight:700,background:'var(--blue-bg)',color:'var(--primary)',padding:'3px 8px',borderRadius:20}}>✅ 채택됨</span>}
                </div>
                <p style={{fontSize:15,fontWeight:600,color:'#191F28',marginBottom:6,lineHeight:1.4}}>{q.title}</p>
                <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#8B95A1'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><MessageCircle size={12}/>{q.answer_count || 0}개 답변</span>
                  <span>·</span>
                  <span>{ft(q.created_at)}</span>
                </div>
              </Link>
            ))
        ) : (
          answers.length === 0
            ? <Empty msg="아직 답변이 없어요"/>
            : answers.map(a => {
              const questionPath = a.questions?.slug || a.questions?.id || a.question_id;

              return (
              <Link key={a.id} href={`/q/${questionPath}`} style={{display:'block',padding:'16px 20px',borderBottom:'1px solid #F9FAFB',cursor:'pointer',transition:'background .15s',textDecoration:'none'}} onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'} onMouseLeave={e=>e.currentTarget.style.background='white'}>
                {a.is_adopted && <div style={{fontSize:11,fontWeight:700,color:'var(--primary)',marginBottom:6}}>✅ 채택된 답변</div>}
                <p style={{fontSize:13,color:'#8B95A1',marginBottom:6,fontWeight:500}}>→ {a.questions?.title || '질문'}</p>
                <p style={{fontSize:14,color:'#191F28',lineHeight:1.6,marginBottom:8,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{a.body}</p>
                <div style={{display:'flex',alignItems:'center',gap:8,fontSize:12,color:'#8B95A1'}}>
                  <span style={{display:'flex',alignItems:'center',gap:4}}><ThumbsUp size={12}/>{a.like_count || 0}</span>
                  <span>·</span>
                  <span>{ft(a.created_at)}</span>
                </div>
              </Link>
              );
            })
        )}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div style={{textAlign:'center',padding:'60px 20px',color:'#8B95A1'}}>
      <div style={{fontSize:40,marginBottom:12}}>📭</div>
      <p style={{fontSize:15,fontWeight:600}}>{msg}</p>
    </div>
  );
}
