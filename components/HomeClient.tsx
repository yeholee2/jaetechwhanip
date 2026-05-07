'use client';
// OAuth: Google ✅ | Naver Custom ✅ | Kakao 준비중

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, Plus, Home as HomeIcon, LayoutList, Swords, ThumbsUp, MessageCircle, Share2, Briefcase, ShoppingBag, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import type { Question } from '@/lib/sampleData';
import { LEVELS, EMOJI, sampleQuestions } from '@/lib/sampleData';
import styles from './HomeClient.module.css';

export default function HomeClient({ initialQuestions }: { initialQuestions: Question[] }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [allQs, setAllQs] = useState<Question[]>(initialQuestions);
  const [currentCat, setCurrentCat] = useState('전체');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // auth 상태 + hash token 처리
  useEffect(() => {
    if (!hasSupabase()) { setAuthLoading(false); return; }
    const supabase = createClient();

    // 해시 토큰 처리 (네이버/구글 매직링크 콜백)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      supabase.auth.getSession().then(({ data }) => {
        setUser(data.session?.user ?? null);
        setAuthLoading(false);
        // 해시 제거
        window.history.replaceState(null, '', window.location.pathname);
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Supabase에서 질문 로드
  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    supabase
      .from('questions')
      .select(`*, users:author_id(name, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return; // DB 비어있으면 샘플 유지
        // DB 데이터를 Question 타입으로 변환
        const mapped: Question[] = data.map((q: any, i: number) => ({
          id: i + 1,
          cat: q.category || '재테크 입문',
          topic: '일반',
          author: q.users?.name || '익명',
          time: formatTime(q.created_at),
          em: EMOJI[i % EMOJI.length] || '🐯',
          lv: 0,
          title: q.title,
          body: q.body || '',
          ans: q.answer_count || 0,
          adopted: q.is_answered || false,
          slug: q.slug || q.id,
          dbId: q.id,
        }));
        setAllQs(mapped);
      });

    // 실시간 구독
    const channel = supabase
      .channel('questions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, (payload) => {
        const q = payload.new as any;
        setAllQs(prev => [{
          id: prev.length + 1,
          cat: q.category || '재테크 입문',
          topic: '일반',
          author: '나',
          time: '방금 전',
          em: '🐯',
          lv: 0,
          title: q.title,
          body: q.body || '',
          ans: 0,
          adopted: false,
          slug: q.slug || q.id,
          dbId: q.id,
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const tryAsk = () => {
    if (authLoading) return;
    if (!user) { router.push('/auth?next=/'); return; }
    setShowModal(true);
  };

  const handleSignOut = async () => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setShowDropdown(false);
    showT('👋 로그아웃 되었어요');
  };

  const submitQ = async (title: string, body: string, cat: string) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').slice(0, 60) + '-' + Date.now();
    if (hasSupabase() && user) {
      const supabase = createClient();
      const { error } = await supabase.from('questions').insert({
        title, body: body || '',
        category: cat,
        slug,
        author_id: user.id,
        answer_count: 0,
      });
      if (error) {
        showT('❌ 오류가 생겼어요. 다시 시도해주세요.');
        return;
      }
    } else {
      // 로컬 임시 추가
      const newQ: Question = {
        id: allQs.length + 1, cat, topic: '일반',
        author: user?.user_metadata?.name || '나',
        time: '방금 전', em: '🐯', lv: 0,
        title, body: body || '답변을 기다리고 있어요.',
        ans: 0, adopted: false, slug,
      };
      setAllQs([newQ, ...allQs]);
    }
    setShowModal(false);
    showT('✅ 질문이 등록되었어요!');
  };

  const filtered = currentCat === '전체' ? allQs : allQs.filter(q => q.cat === currentCat);
  const cats = ['전체','재테크 입문','주식·ETF','절세','보험','대출·부채'];
  const catEmoji: Record<string,string> = { '재테크 입문':'💡', '주식·ETF':'📈', '절세':'🏦', '보험':'🛡️', '대출·부채':'💳' };
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || '';

  return (
    <div className={styles.app}>
      {/* PC 네비 */}
      <nav className={styles.pcNav}>
        <div className={`${styles.pcLogo} logo-font`}>재테크<em>한입</em></div>
        <ul className={styles.pcMenu}>
          <li><a href="#" className={styles.on}>홈</a></li>
          <li><a href="#">토픽</a></li>
          <li><a href="#">스파링</a></li>
          <li><a href="#">잉크</a></li>
          <li><a href="#">미션</a></li>
          <li><div className={styles.sep}/></li>
          <li><a href="#" style={{fontSize:13,color:'var(--t3)'}}>전문가 신청</a></li>
          <li><a href="#" style={{fontSize:13,color:'var(--t3)'}}><span className="tf">🫐</span> 베리몰</a></li>
        </ul>
        <div className={styles.pcRight}>
          <button className={styles.iconBtn}><Search size={18}/></button>
          <button className={styles.iconBtn}><Bell size={18}/></button>
          {!authLoading && (user ? (
            <div style={{position:'relative'}} ref={dropRef}>
              <div
                style={{width:32,height:32,borderRadius:'50%',background:'var(--green)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:13,cursor:'pointer'}}
                title={userName}
                onClick={() => setShowDropdown(v => !v)}
              >
                {userName[0]?.toUpperCase() || 'U'}
              </div>
              {showDropdown && (
                <div style={{position:'absolute',right:0,top:40,background:'white',border:'1px solid #E5E8EB',borderRadius:10,boxShadow:'0 4px 16px rgba(0,0,0,.1)',minWidth:140,zIndex:100}}>
                  <div style={{padding:'10px 14px',fontSize:13,color:'#4E5968',borderBottom:'1px solid #F2F4F6'}}>{userName}</div>
                  <button onClick={handleSignOut} style={{width:'100%',padding:'10px 14px',border:'none',background:'none',textAlign:'left',fontSize:13,color:'#FF3B30',cursor:'pointer'}}>로그아웃</button>
                </div>
              )}
            </div>
          ) : (
            <button className={styles.iconBtn} onClick={() => router.push('/auth')}><User size={18}/></button>
          ))}
          <button className={styles.btnAsk} onClick={tryAsk}>나도 질문하기</button>
        </div>
      </nav>

      {/* PC 본문 */}
      <div className={styles.pcBody}>
        <div className={styles.pcFeed}>
          <div className={styles.feedTabs}>
            <button className={`${styles.ftab} ${styles.on}`}>인기</button>
            <button className={styles.ftab}>관심</button>
            <button className={styles.ftab}>답변</button>
          </div>
          <div className={styles.catRow}>
            {cats.map(c => (
              <button key={c} className={`${styles.ctag} ${currentCat===c?styles.on:''}`} onClick={() => setCurrentCat(c)}>
                {catEmoji[c] && <span className="tf">{catEmoji[c]}</span>} {c}
              </button>
            ))}
          </div>
          <div className={styles.refBanner}>
            <div>
              <strong style={{fontSize:13,display:'block',marginBottom:2,color:'#fff'}}><span className="tf">🎁</span> 친구 초대하고 베리 받기</strong>
              <span style={{fontSize:11,color:'rgba(255,255,255,.7)'}}>초대한 친구가 첫 질문 올리면 100 베리!</span>
            </div>
            <button className={styles.refCopy} onClick={() => { navigator.clipboard?.writeText('https://jaetechwhanip.vercel.app'); showT('🔗 초대 링크 복사됐어요!'); }}>초대 링크 복사</button>
          </div>
          <FeedList questions={filtered} mobile={false}/>
        </div>

        <aside className={styles.pcSide}>
          <div className={styles.widget}>
            <div className={styles.sparW}>
              <div className={styles.sparTag}><span className="tf">🔥</span> 지금 투표 중</div>
              <div className={styles.sparTitle}>지금 S&P500<br/>들어가도 될까요?</div>
              <div className={styles.sparFoot}>
                <span style={{fontSize:11,color:'rgba(255,255,255,.5)'}}>⏱ 3일 남았어요</span>
                <button className={styles.sparJoin}>참여하기</button>
              </div>
            </div>
            <a href="#" className={styles.wlink}><Briefcase size={14}/><span>전문가 신청하기</span><span style={{marginLeft:'auto',color:'var(--t3)'}}>›</span></a>
            <a href="#" className={styles.wlink}><ShoppingBag size={14}/><span>베리몰 구경하기</span><span style={{marginLeft:'auto',color:'var(--t3)'}}>›</span></a>
            <a href="#" className={styles.wlink}><TrendingUp size={14}/><span>ETF 시세 보기</span><span style={{marginLeft:'auto',color:'var(--t3)'}}>›</span></a>
          </div>
          <div className={styles.widget}>
            <div className={styles.whead}><span className="tf">🔍</span> 지금 많이 찾는 키워드</div>
            <div style={{padding:'11px 15px',display:'flex',flexWrap:'wrap',gap:5}}>
              {['S&P500','ISA계좌','연금저축','실손보험','학자금대출','ETF추천','청년적금','절세계좌'].map((k,i) => (
                <div key={k} className={styles.kw}><span className={styles.kwn}>{i+1}</span>{k}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* 모바일 헤더 */}
      <header className={styles.moHeader}>
        <div className={styles.moTop}>
          <div className={`${styles.moLogo} logo-font`}>재테크<em>한입</em></div>
          <div className={styles.moIcons}>
            <button className={styles.moIcon}><Search size={20}/></button>
            <button className={styles.moIcon}><Bell size={20}/></button>
            <button className={styles.moIcon} onClick={() => router.push(user ? '/' : '/auth')}>
              {user ? <span style={{fontSize:12,fontWeight:700,color:'var(--green)'}}>{userName[0]?.toUpperCase()}</span> : <User size={20}/>}
            </button>
          </div>
        </div>
        <nav className={styles.moGnav}>
          <a href="#" className={styles.on}>홈</a>
          <a href="#">토픽</a><a href="#">스파링</a><a href="#">잉크</a><a href="#">미션</a>
        </nav>
      </header>

      <div className={styles.moMain}>
        <div className={styles.moFeedHd}>
          <button className={`${styles.ftab} ${styles.on}`}>인기</button>
          <button className={styles.ftab}>관심</button>
          <button className={styles.ftab}>답변</button>
        </div>
        <div className={styles.moCat}>
          {cats.map(c => (
            <button key={c} className={`${styles.ctag} ${currentCat===c?styles.on:''}`} onClick={() => setCurrentCat(c)}>
              {catEmoji[c] && <span className="tf">{catEmoji[c]}</span>} {c}
            </button>
          ))}
        </div>
        <FeedList questions={filtered} mobile={true}/>
      </div>

      <button className={styles.fab} onClick={tryAsk}><Plus size={24} color="white"/></button>

      <nav className={styles.bottomNav}>
        <button className={`${styles.bnav} ${styles.on}`}><HomeIcon size={22}/><span>홈</span></button>
        <button className={styles.bnav}><LayoutList size={22}/><span>토픽</span></button>
        <button className={styles.bnav}><Swords size={22}/><span>스파링</span></button>
        <button className={styles.bnav}><Bell size={22}/><span>알림</span></button>
        <button className={styles.bnav} onClick={() => router.push(user ? '/' : '/auth')} style={user ? {color:'var(--green)'} : {}}>
          <User size={22}/><span>{user ? (userName[0]?.toUpperCase() || 'MY') : '로그인'}</span>
        </button>
      </nav>

      {/* 질문하기 모달 */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={() => setShowModal(false)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,boxShadow:'0 24px 60px rgba(0,0,0,.18)'}} onClick={e => e.stopPropagation()}>
            <div style={{padding:'18px 22px 14px',borderBottom:'1px solid #E5E8EB',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h2 style={{fontSize:16,fontWeight:700}}>질문하기</h2>
              <button onClick={() => setShowModal(false)} style={{width:30,height:30,border:'none',background:'#F9FAFB',borderRadius:7,cursor:'pointer',fontSize:20,color:'#4E5968'}}>×</button>
            </div>
            <div style={{padding:'18px 22px 20px'}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>카테고리</label>
                <select id="modal-cat" defaultValue="재테크 입문" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none'}}>
                  {['재테크 입문','주식·ETF','절세','보험','대출·부채'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>질문 제목</label>
                <input id="modal-title" placeholder="궁금한 점을 간단히 써주세요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',boxSizing:'border-box' as const}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>상세 내용 <span style={{fontWeight:400,color:'#8B95A1'}}>(선택)</span></label>
                <textarea id="modal-body" rows={4} placeholder="상황을 더 설명해주시면 더 좋은 답변을 받을 수 있어요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',resize:'none' as const,boxSizing:'border-box' as const}}/>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button onClick={() => setShowModal(false)} style={{height:38,padding:'0 18px',background:'#F9FAFB',border:'1px solid #E5E8EB',borderRadius:8,fontSize:14,cursor:'pointer'}}>취소</button>
                <button onClick={() => {
                  const title = (document.getElementById('modal-title') as HTMLInputElement)?.value.trim();
                  const body = (document.getElementById('modal-body') as HTMLTextAreaElement)?.value.trim();
                  const cat = (document.getElementById('modal-cat') as HTMLSelectElement)?.value;
                  if (title) { submitQ(title, body || '', cat || '재테크 입문'); }
                }} style={{height:38,padding:'0 22px',background:'#00C73C',border:'none',borderRadius:8,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}>질문 올리기</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && <div className={`${styles.toast} ${styles.show}`}>{toast}</div>}
    </div>
  );
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

function FeedList({ questions, mobile }: { questions: Question[], mobile: boolean }) {
  return (
    <div className={mobile ? styles.moFeed : styles.pcFeedList}>
      {questions.map(q => (
        <article key={q.id} className={styles.qcard}>
          <div className={styles.qcardRow}>
            <div className={`${styles.qavatar} tf`}>
              {q.em}
              <span className={`${styles.lv} ${styles['lv'+q.lv]}`}>{LEVELS[q.lv]?.l}</span>
            </div>
            <div className={styles.qinfo}>
              <div className={styles.qmeta}>
                <span style={{fontSize:12,fontWeight:700}}>{q.cat}</span>
                <span style={{fontSize:10,color:'var(--t3)'}}>·</span>
                <span style={{fontSize:12,color:'var(--blue)',fontWeight:600}}>{q.author}</span>
                <span style={{fontSize:10,color:'var(--t3)'}}>·</span>
                <span style={{fontSize:12,color:'var(--t3)'}}>{q.time}</span>
                {q.adopted && <span className={styles.adopted}>✅ 채택됨</span>}
              </div>
              <h3 className={styles.qtitle}><a href={`/q/${q.slug}`}>{q.title}</a></h3>
              <p className={styles.qbody}>{q.body}</p>
              <div className={styles.qfoot}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{display:'flex'}}>
                    {Array.from({length:Math.min(3,q.ans)}).map((_,i) => (
                      <div key={i} className={`${styles.av} tf`}>{EMOJI[i]}</div>
                    ))}
                  </div>
                  <span style={{fontSize:12,color:'var(--t2)'}}><b>{q.ans}명</b>이 답변했어요</span>
                </div>
                <div style={{display:'flex',gap:2}}>
                  <button className={styles.qbtn}><ThumbsUp size={14}/></button>
                  <button className={styles.qbtn}><MessageCircle size={14}/></button>
                  <button className={styles.qbtn}><Share2 size={14}/></button>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
