'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, User, Plus, Home as HomeIcon, LayoutList, Swords, ThumbsUp, MessageCircle, Share2, Briefcase, ShoppingBag, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import type { Question } from '@/lib/sampleData';
import { LEVELS, EMOJI } from '@/lib/sampleData';
import styles from './HomeClient.module.css';

export default function HomeClient({ initialQuestions }: { initialQuestions: Question[] }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [allQs, setAllQs] = useState(initialQuestions);
  const [currentCat, setCurrentCat] = useState('전체');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabase()) { setAuthLoading(false); return; }
    const supabase = createClient();

    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    // URL에 access_token이 있으면 (네이버/Google 매직링크 로그인 후)
    // Supabase가 hash를 파싱해서 SIGNED_IN 이벤트를 발생시킴
    if (hash.includes('access_token')) {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (session?.user) {
          setUser(session.user);
          setAuthLoading(false);
          window.history.replaceState(null, '', window.location.pathname);
        }
      });
      return () => sub.subscription.unsubscribe();
    }

    // 일반 세션 체크
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const tryAsk = () => {
    if (authLoading) return;
    if (!user) { router.push('/auth?next=/'); return; }
    setShowModal(true);
  };

  const filtered = currentCat === '전체' ? allQs : allQs.filter(q => q.cat === currentCat);

  const cats = ['전체','재테크 입문','주식·ETF','절세','보험','대출·부채'];
  const catEmoji: Record<string,string> = { '재테크 입문':'💡', '주식·ETF':'📈', '절세':'🏦', '보험':'🛡️', '대출·부채':'💳' };

  const submitQ = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value.trim();
    const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value.trim();
    const cat = (form.elements.namedItem('cat') as HTMLSelectElement).value;
    if (!title) return;
    const newQ = {
      id: allQs.length + 1, cat, topic: '일반', author: user?.user_metadata?.name || '나',
      time: '방금 전', em: '🐯', lv: 0, title, body: body || '답변을 기다리고 있어요.', ans: 0, adopted: false,
      slug: title.toLowerCase().replace(/\s+/g, '-').slice(0, 50),
    };
    setAllQs([newQ, ...allQs]);
    setShowModal(false);
  };

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
          {user ? (
            <div className={styles.userAvatar} onClick={() => {}} title={user.email}>
              {user.user_metadata?.name?.[0] || user.email?.[0] || 'U'}
            </div>
          ) : (
            <button className={styles.iconBtn} onClick={() => router.push('/auth')}><User size={18}/></button>
          )}
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
            <button className={styles.refCopy} onClick={() => {
              navigator.clipboard?.writeText('https://jaetechwhanip.vercel.app/invite/abc');
              showT('🔗 초대 링크 복사됐어요!');
            }}>초대 링크 복사</button>
          </div>
          <FeedList questions={filtered} mobile={false}/>
        </div>

        {/* 사이드바 */}
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
            <button className={styles.moIcon} onClick={() => router.push('/auth')}><User size={20}/></button>
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
        <button className={styles.bnav} onClick={() => router.push(user ? '/mypage' : '/auth')} style={user ? {color:'var(--green)'} : {}}><User size={22}/><span>{user ? 'MY' : '로그인'}</span></button>
      </nav>

      {toast && <div className={`${styles.toast} ${styles.show}`}>{toast}</div>}
    </div>
      {/* 질문하기 모달 */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={() => setShowModal(false)}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,boxShadow:'0 24px 60px rgba(0,0,0,.18)'}} onClick={e => e.stopPropagation()}>
            <div style={{padding:'18px 22px 14px',borderBottom:'1px solid #E5E8EB',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <h2 style={{fontSize:16,fontWeight:700}}>질문하기</h2>
              <button onClick={() => setShowModal(false)} style={{width:30,height:30,border:'none',background:'#F9FAFB',borderRadius:7,cursor:'pointer',fontSize:20,color:'#4E5968'}}>×</button>
            </div>
            <form onSubmit={submitQ} style={{padding:'18px 22px 20px'}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>카테고리</label>
                <select name="cat" style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none'}}>
                  <option>재테크 입문</option>
                  <option>주식·ETF</option>
                  <option>절세</option>
                  <option>보험</option>
                  <option>대출·부채</option>
                </select>
              </div>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>질문 제목</label>
                <input name="title" required placeholder="궁금한 점을 간단히 써주세요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{marginBottom:16}}>
                <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>상세 내용 <span style={{fontWeight:400,color:'#8B95A1'}}>(선택)</span></label>
                <textarea name="body" rows={4} placeholder="상황을 더 설명해주시면 더 좋은 답변을 받을 수 있어요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',resize:'none',boxSizing:'border-box'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" onClick={() => setShowModal(false)} style={{height:38,padding:'0 18px',background:'#F9FAFB',border:'1px solid #E5E8EB',borderRadius:8,fontSize:14,cursor:'pointer'}}>취소</button>
                <button type="submit" style={{height:38,padding:'0 22px',background:'#00C73C',border:'none',borderRadius:8,color:'white',fontSize:14,fontWeight:700,cursor:'pointer'}}>질문 올리기</button>
              </div>
            </form>
          </div>
        </div>
      )}
  );
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
                <span style={{fontSize:12,color:'var(--t3)'}}>{q.topic}</span>
                <span style={{fontSize:10,color:'var(--t3)'}}>·</span>
                <span style={{fontSize:12,color:'var(--blue)',fontWeight:600}}>{q.author}</span>
                <span style={{fontSize:10,color:'var(--t3)'}}>·</span>
                <span style={{fontSize:12,color:'var(--t3)'}}>{q.time}</span>
                {q.adopted && <span className={styles.adopted}>✅ 채택됨</span>}
              </div>
              <h3 className={styles.qtitle}><a href={`/questions/${q.slug}`}>{q.title}</a></h3>
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
