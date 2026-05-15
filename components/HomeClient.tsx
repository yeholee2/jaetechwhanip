'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Swords } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { CATEGORY_DEFINITIONS, CATEGORY_EMOJI, CATEGORY_LABELS, getCategoryLabel } from '@/lib/categories';
import type { Question } from '@/lib/sampleData';
import { LEVELS, EMOJI, sampleQuestions } from '@/lib/sampleData';
import { mapDbRowToHomeQuestion, isUsefulQuestion as isUsefulQ, formatTime as fmtTime } from '@/lib/home-questions';
import { trackEvent } from '@/lib/analytics';
import { Sparkline } from '@/components/Sparkline';
import type { Sparring } from '@/lib/sparring';
import { createQuestionSlug, ensureUniqueSlug } from '@/lib/slugs';
import { getAuthNickname, syncFinanceNickname } from '@/lib/nicknames';
import { useAutoTranslation } from '@/lib/useAutoTranslation';
import { FaIcon } from './FaIcon';
import { AppShell } from './AppShell';
import { Chip, Badge, Tooltip } from '@/components/ui';
import { MarketTickerView, type TickerQuote } from '@/app/etf/MarketTicker';
import type { CalendarEvent } from '@/lib/marketCalendar';
import { lookupGlossary } from '@/lib/etfGlossary';
import SparringMiniCard from './sparring/SparringMiniCard';
import { HomeWatchWidget } from './HomeWatchWidget';
import { etfs, etfPath } from '@/lib/etfs';
import styles from './HomeClient.module.css';

const HOME_INDICES_FALLBACK: { name: string; val: string; chg: string; up: boolean; series: number[] }[] = [
  { name: '코스피', val: '—', chg: '—', up: true, series: [] },
  { name: 'S&P500', val: '—', chg: '—', up: true, series: [] },
  { name: '나스닥', val: '—', chg: '—', up: true, series: [] },
  { name: '원달러', val: '—', chg: '—', up: true, series: [] },
];
const HOME_KEYWORDS = ['반도체', '월배당', 'AI전력', '나스닥100', 'S&P500', '커버드콜', '밸류업'];

const CATS = CATEGORY_LABELS;
const CAT_EMOJI = CATEGORY_EMOJI;
const PAGE_SIZE = 20;
const FEED_TABS = [
  { key: 'popular', label: '인기' },
  { key: 'latest', label: '최신' },
  { key: 'waiting', label: '답변대기' },
] as const;
type FeedTab = typeof FEED_TABS[number]['key'];

const STOCK_ETF_TAGS = ['S&P500', '나스닥100', '미국 ETF', '국내 ETF', '배당 ETF', '월배당', '환헤지', '분할매수'];

function getUserName(user: any): string {
  if (!user) return '';
  return getAuthNickname(user) || 'ME';
}

export default function HomeClient({
  initialQuestions,
  featuredSparring,
  marketIndices,
  siteBanner,
  siteKeywords,
  tickerQuotes,
  nextEvent,
}: {
  initialQuestions: Question[];
  featuredSparring?: Sparring | null;
  marketIndices?: { name: string; val: string; chg: string; up: boolean; series?: number[] }[];
  siteBanner?: { enabled: boolean; message: string; link: string };
  siteKeywords?: string[];
  tickerQuotes?: (TickerQuote | null)[];
  nextEvent?: { event: CalendarEvent; dDay: number } | null;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allQs, setAllQs] = useState<Question[]>(initialQuestions);
  const [currentCat, setCurrentCat] = useState('전체');
  const [feedTab, setFeedTab] = useState<FeedTab>('popular');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // AppShell의 검색 popup이 /?q=... 로 navigate하면 받음
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) setSearchQuery(q);
  }, []);

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // auth — Google full_name 포함 처리
  useEffect(() => {
    if (!hasSupabase()) { setAuthLoading(false); return; }
    const supabase = createClient();

    // onAuthStateChange가 URL hash의 access_token 자동 파싱 → SIGNED_IN 이벤트 발생
    // getSession보다 먼저 등록해야 hash 처리가 됨
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        syncFinanceNickname(supabase, nextUser);
        supabase.from('users').select('role').eq('id', nextUser.id).maybeSingle()
          .then(({ data: p }) => setIsAdmin(p?.role === 'admin'));
      } else {
        setIsAdmin(false);
      }
      setAuthLoading(false);
      // 로그인 후 hash 제거 (깔끔한 URL)
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    // 이미 세션 있는 경우 처리 (페이지 새로고침 등)
    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) syncFinanceNickname(supabase, nextUser);
      setAuthLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authLoading || typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('ask') !== '1') return;

    if (user) {
      setShowModal(true);
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    router.replace('/auth?next=/?ask=1');
  }, [authLoading, router, user]);

  // 질문 로드 — DB에서 페이지네이션
  const loadQuestions = useCallback(async (cat: string, tab: FeedTab, pageNum: number, replace = false) => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    // 패킷 최적화: 홈 피드에 필요한 컬럼만 select
    let query = supabase
      .from('questions')
      .select('id, title, body, category, slug, answer_count, like_count, view_count, is_answered, created_at, author_id, users:author_id(name,avatar_url)')
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    // 카테고리 필터는 DB에서 — 클라이언트 필터 X
    if (cat !== '전체') query = query.eq('category', cat);
    if (tab === 'waiting') query = query.eq('answer_count', 0);

    if (tab === 'popular') {
      query = query
        .order('answer_count', { ascending: false })
        .order('like_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error || !data) return;

    const usefulRows = data.filter((q: any) => isUsefulQ(q.title, q.body));
    const mapped: Question[] = usefulRows.map((q: any, i: number) =>
      mapDbRowToHomeQuestion(q, i, pageNum * PAGE_SIZE),
    );

    if (replace) {
      setAllQs(mergeQuestions(mapped, seedQuestionsFor(cat, tab)));
    } else {
      setAllQs(prev => [...prev, ...mapped]);
    }
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  }, []);

  // SSR로 받은 initialQuestions가 있으면 첫 마운트(전체/popular)에서는 재요청 스킵
  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (!didInitialLoad.current && currentCat === '전체' && feedTab === 'popular' && initialQuestions.length > 0) {
      didInitialLoad.current = true;
      return;
    }
    didInitialLoad.current = true;
    setPage(0);
    loadQuestions(currentCat, feedTab, 0, true);
  }, [currentCat, feedTab, loadQuestions, initialQuestions.length]);

  // 실시간 신규 질문 구독
  useEffect(() => {
    if (!hasSupabase()) return;
    const supabase = createClient();
    const channel = supabase
      .channel('home-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'questions' }, (payload) => {
        const q = payload.new as any;
        if (currentCat !== '전체' && q.category !== currentCat) return;
        if (feedTab === 'waiting' && (q.answer_count || 0) > 0) return;
        setAllQs(prev => [{
          id: Date.now(), cat: q.category || '재테크입문', topic: '일반',
          author: '방금 전', time: '방금 전', em: '🐯', lv: 0,
          title: q.title, body: q.body || '', ans: 0, adopted: false,
          slug: q.slug || q.id, dbId: q.id, likeCount: 0, createdAt: q.created_at,
        }, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCat, feedTab]);

  // 무한스크롤
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore) {
        setLoadingMore(true);
        const nextPage = page + 1;
        setPage(nextPage);
        loadQuestions(currentCat, feedTab, nextPage, false);
      }
    }, { threshold: 0.1 });
    const sentinel = document.getElementById('feed-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, page, currentCat, feedTab, loadQuestions]);

  // 드롭다운 외부 클릭
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const showT = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const tryAsk = () => {
    if (authLoading) return;
    if (!user) { router.push('/auth?next=/'); return; }
    setShowModal(true);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setShowDropdown(false);
    showT('👋 로그아웃 되었어요');
  };

  const submitQ = async (title: string, body: string, cat: string, tags: string[] = []) => {
    let slug = createQuestionSlug(title);
    const bodyWithTags = tags.length
      ? [body, `관심 태그: ${tags.join(', ')}`].filter(Boolean).join('\n\n')
      : body;
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
      const basePayload = {
        title,
        body,
        category: cat,
        slug,
        author_id: user.id,
        answer_count: 0,
      };
      const insertPayload: Record<string, unknown> = tags.length ? { ...basePayload, tags } : basePayload;
      let { data, error } = await supabase.from('questions').insert(
        insertPayload as typeof basePayload,
      ).select('id, slug').single();

      if (error && tags.length && /tags/i.test(error.message || '')) {
        const retry = await supabase.from('questions').insert({
          ...basePayload,
          body: bodyWithTags,
        }).select('id, slug').single();
        data = retry.data;
        error = retry.error;
      }

      if (error) { showT('❌ 오류가 생겼어요. 다시 시도해주세요.'); return; }
      setShowModal(false);
      showT('✅ 질문이 등록되었어요!');
      router.push(`/q/${data?.slug || data?.id || slug}`);
      return;
    }
    setShowModal(false);
    showT('✅ 질문이 등록되었어요!');
  };

  // 검색 필터 (클라이언트)
  const filtered = sortQuestions(
    searchQuery.trim()
      ? allQs.filter(q => q.title.includes(searchQuery) || q.body?.includes(searchQuery))
      : allQs,
    feedTab,
  );
  const activeTabLabel = FEED_TABS.find(tab => tab.key === feedTab)?.label || '인기';

  const userName = getUserName(user);

  return (
    <AppShell active="home" wide hideSlogan>
      {/* 시장 시세 ticker — 페이지 최상단, 전체 폭 */}
      {tickerQuotes && tickerQuotes.length > 0 && (
        <div className={styles.tickerWrap}>
          <MarketTickerView quotes={tickerQuotes} nextEvent={nextEvent} />
        </div>
      )}

      {/* PC 본문 */}
      <div className={styles.pcBody}>
        <div className={styles.pcFeed}>
          {siteBanner?.enabled && siteBanner.message && (
            <SiteBannerStrip banner={siteBanner} />
          )}
          <div className={styles.feedTabs}>
            {FEED_TABS.map(tab => (
              <button
                key={tab.key}
                className={`${styles.ftab} ${feedTab === tab.key ? styles.on : ''}`}
                onClick={() => setFeedTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className={styles.catRow}>
            {CATS.map(c => (
              <Chip key={c} active={currentCat === c} size="sm" onClick={() => setCurrentCat(c)}>
                {CAT_EMOJI[c] && <span className="tf">{CAT_EMOJI[c]}</span>}
                {c === '전체' ? c : getCategoryLabel(c)}
              </Chip>
            ))}
          </div>
          {/* 검색창 (모바일 인라인) */}
          {showSearch && (
            <div style={{padding:'8px 0',display:'flex',alignItems:'center',gap:8,borderBottom:'1px solid #F2F4F6',marginBottom:4}}>
              <FaIcon name="magnifying-glass" size={14} color="#8B95A1"/>
              <input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="질문 검색..." style={{flex:1,border:'none',outline:'none',fontSize:14}}/>
              {searchQuery && <button onClick={()=>setSearchQuery('')} style={{background:'none',border:'none',cursor:'pointer',padding:0,color:'#8B95A1'}}><FaIcon name="xmark" size={14}/></button>}
            </div>
          )}
          <FeedSummary
            activeTabLabel={activeTabLabel}
            currentCat={currentCat}
            count={filtered.length}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
          <FeedList questions={filtered} mobile={false} router={router}/>
          {hasMore && !searchQuery && (
            <div id="feed-sentinel" style={{padding:20,textAlign:'center',color:'#8B95A1',fontSize:13}}>
              {loadingMore ? '불러오는 중...' : ''}
            </div>
          )}
        </div>
        <aside className={styles.pcSide}>
          {/* 1. 스파링 — 최상단 (시장 지수는 페이지 상단 ticker 로 대체) */}
          <SparringMiniCard sparring={featuredSparring} isAdmin={isAdmin} />

          {/* 2. 내 관심 ETF */}
          <HomeWatchWidget />

          {/* 3. 오늘의 ETF */}
          {etfs[0] && (
            <Link href={etfPath(etfs[0].slug)} className={styles.sideWidget}>
              <div className={styles.sideHead}>오늘의 ETF</div>
              <div className={styles.etfWidgetTitle}>{etfs[0].shortName}</div>
              <div className={styles.etfWidgetMeta}>{etfs[0].code} · {etfs[0].theme}</div>
              <div className={styles.etfWidgetRow}>
                <strong>{etfs[0].price}</strong>
                <span className={etfs[0].changeTone === 'down' ? styles.sideDown : styles.sideUp}>
                  {etfs[0].change}
                </span>
              </div>
              <span className={styles.sideMore}>전체 ETF 보기 →</span>
            </Link>
          )}

          {/* 4. 인기 키워드 */}
          <div className={styles.sideWidget}>
            <div className={styles.sideHead}>인기 키워드</div>
            <div className={styles.keywordChips}>
              {(siteKeywords && siteKeywords.length > 0 ? siteKeywords : HOME_KEYWORDS).map(kw => {
                const entry = lookupGlossary(kw);
                const link = (
                  <Link
                    className={styles.keywordChip}
                    href={`/etf?q=${encodeURIComponent(kw)}`}
                    onClick={() => trackEvent({ kind: 'click', target: `keyword:${kw}` })}
                  >
                    #{kw}
                  </Link>
                );
                return entry ? (
                  <Tooltip
                    key={kw}
                    label={`${kw} 설명`}
                    title={entry.title}
                    trigger={link}
                  >
                    {entry.body}
                  </Tooltip>
                ) : (
                  <span key={kw}>{link}</span>
                );
              })}
            </div>
          </div>

        </aside>
      </div>

      <div className={styles.moMain}>
        <div className={styles.moFeedHd}>
          {FEED_TABS.map(tab => (
            <button
              key={tab.key}
              className={`${styles.ftab} ${feedTab === tab.key ? styles.on : ''}`}
              onClick={() => setFeedTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={styles.moCat}>
          {CATS.map(c => (
            <Chip key={c} active={currentCat === c} size="sm" onClick={() => setCurrentCat(c)}>
              {CAT_EMOJI[c] && <span className="tf">{CAT_EMOJI[c]}</span>}
              {c === '전체' ? c : getCategoryLabel(c)}
            </Chip>
          ))}
        </div>
        <FeedSummary
          activeTabLabel={activeTabLabel}
          currentCat={currentCat}
          count={filtered.length}
          searchQuery={searchQuery}
          onClearSearch={() => setSearchQuery('')}
        />
        <FeedList questions={filtered} mobile={true} router={router}/>
        {hasMore && !searchQuery && (
          <div id="feed-sentinel-mo" style={{padding:20,textAlign:'center',color:'#8B95A1',fontSize:13}}>
            {loadingMore ? '불러오는 중...' : ''}
          </div>
        )}
      </div>

      {/* 질문하기 모달 */}
      {showModal && <AskModal onClose={() => setShowModal(false)} onSubmit={submitQ} />}
      {toast && <div className={`${styles.toast} ${styles.show}`}>{toast}</div>}
    </AppShell>
  );
}

function sortQuestions(questions: Question[], tab: FeedTab) {
  const copy = [...questions];
  if (tab === 'popular') {
    return copy.sort((a, b) => (
      (b.ans + (b.likeCount || 0)) - (a.ans + (a.likeCount || 0))
      || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    ));
  }
  if (tab === 'waiting') return copy.filter(q => q.ans === 0);
  return copy.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
}

function seedQuestionsFor(cat: string, tab: FeedTab) {
  return sampleQuestions
    .filter(q => cat === '전체' || q.cat === cat)
    .filter(q => tab !== 'waiting' || q.ans === 0);
}

function mergeQuestions(primary: Question[], fallback: Question[]) {
  const seen = new Set<string>();
  return [...primary, ...fallback].filter(question => {
    const key = question.slug || question.dbId || String(question.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function SiteBannerStrip({ banner }: { banner: { enabled: boolean; message: string; link: string } }) {
  // 노출 임프레션 1회 기록
  useEffect(() => {
    trackEvent({ kind: 'impression', target: 'banner', meta: { message: banner.message } });
  }, [banner.message]);

  const inner = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '12px 16px',
      background: 'var(--rw-primary-bg, rgba(49,130,246,.08))',
      border: '1px solid rgba(49,130,246,.18)',
      borderRadius: 10,
      marginBottom: 14,
      fontSize: 14,
      color: 'var(--rw-text-strong, var(--t1))',
      fontWeight: 600,
    }}>
      <span style={{ fontSize: 16 }}>📢</span>
      <span style={{ flex: 1 }}>{banner.message}</span>
      {banner.link && <span style={{ color: 'var(--blue)', fontSize: 12, fontWeight: 700 }}>자세히 →</span>}
    </div>
  );

  if (!banner.link) return inner;
  return (
    <Link
      href={banner.link}
      onClick={() => trackEvent({ kind: 'click', target: 'banner', meta: { link: banner.link } })}
      style={{ textDecoration: 'none' }}
    >
      {inner}
    </Link>
  );
}

function FeedSummary({
  activeTabLabel,
  currentCat,
  count,
  searchQuery,
  onClearSearch,
}: {
  activeTabLabel: string;
  currentCat: string;
  count: number;
  searchQuery: string;
  onClearSearch: () => void;
}) {
  return (
    <div className={styles.feedSummary}>
      <div>
        <span>{currentCat === '전체' ? '전체 토픽' : getCategoryLabel(currentCat)} · {count}개 질문</span>
      </div>
      {searchQuery && (
        <button onClick={onClearSearch}>
          "{searchQuery}" 검색 해제
        </button>
      )}
    </div>
  );
}

// formatTime, isUsefulQuestion → lib/home-questions.ts 로 이동 (SSR/CSR 공용)

function FeedList({ questions, mobile, router }: { questions: Question[], mobile: boolean, router: any }) {
  const translation = useAutoTranslation(
    questions.flatMap(q => [
      { id: `q:${q.slug || q.dbId || q.id}:title`, type: 'question_title', text: q.title },
      { id: `q:${q.slug || q.dbId || q.id}:body`, type: 'question_body', text: q.body || '' },
    ]),
  );

  return (
    <div className={mobile ? styles.moFeed : styles.pcFeedList}>
      {questions.length === 0 && (
        <div style={{textAlign:'center',padding:'60px 20px',color:'#8B95A1'}}>
          <div style={{fontSize:40,marginBottom:12}}>🔍</div>
          <p style={{fontSize:15,fontWeight:600}}>검색 결과가 없어요</p>
        </div>
      )}
      {questions.map(q => {
        const questionPath = q.slug || q.dbId || String(q.id);
        const titleId = `q:${questionPath}:title`;
        const bodyId = `q:${questionPath}:body`;
        const title = translation.text(titleId, q.title);
        const body = translation.text(bodyId, q.body || '');
        const translated = translation.isTranslated(titleId) || translation.isTranslated(bodyId);

        return (
        <article key={q.id} className={styles.qcard} onClick={() => router.push(`/q/${questionPath}`)} style={{cursor:'pointer'}}>
          <div className={styles.qcardRow}>
            <div className={`${styles.qavatar} tf`}>
              {q.em}
            </div>
            <div className={styles.qinfo}>
              {/* 메타: 작성자+채택됨 아이콘 / 카테고리·날짜 2줄 */}
              <div className={styles.qmeta}>
                <div className={styles.qmetaTop}>
                  <span className={styles.qauthor}>{q.author}</span>
                  {q.adopted && <span className={styles.qadopted} title="채택된 답변 있음">✅</span>}
                  {translated && <Badge tone="primary">Translated</Badge>}
                </div>
                <div className={styles.qmetaBot}>
                  <span className={styles.qcat}>{getCategoryLabel(q.cat)}</span>
                  {q.topic && q.topic !== '일반' && (
                    <><span className={styles.qdivider}>·</span><span className={styles.qtopic}>{q.topic}</span></>
                  )}
                  <span className={styles.qdivider}>·</span>
                  <span className={styles.qtime}>{q.time}</span>
                </div>
              </div>
              <h3 className={styles.qtitle}>
                <Link href={`/q/${questionPath}`}>{title}</Link>
              </h3>
              <p className={styles.qbody}>{body}</p>
              <div className={styles.qfoot} onClick={e => e.stopPropagation()}>
                <div className={styles.qfootStats}>
                  <span className={styles.qstat}>
                    <FaIcon name="comment" size={12}/>
                    {q.ans > 0 ? q.ans : '첫 답변'}
                  </span>
                  <span className={styles.qstat}>
                    <FaIcon name="thumbs-up" size={12}/>
                    {(q as any).likeCount ?? 0}
                  </span>
                </div>
                <button className={styles.qbtn} onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard?.writeText(`${window.location.origin}/q/${questionPath}`);
                }}><FaIcon name="share-nodes" size={13}/></button>
              </div>
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

function AskModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (t: string, b: string, c: string, tags: string[]) => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [cat, setCat] = useState('재테크입문');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(item => item !== tag) : [...prev, tag].slice(0, 4));
  };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,boxShadow:'0 24px 60px rgba(0,0,0,.18)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid #E5E8EB',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontSize:16,fontWeight:700}}>질문하기</h2>
          <button onClick={onClose} style={{width:30,height:30,border:'none',background:'#F9FAFB',borderRadius:7,cursor:'pointer',fontSize:18,color:'#4E5968',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
        </div>
        <div style={{padding:'18px 22px 20px'}}>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>카테고리</label>
            <select value={cat} onChange={e=>setCat(e.target.value)} style={{width:'100%',padding:'10px 12px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none'}}>
              {CATEGORY_DEFINITIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          {cat === '국내주식·ETF' && (
            <div className={styles.askTags}>
              <label><FaIcon name="tags" size={13}/> 관련 태그</label>
              <div>
                {STOCK_ETF_TAGS.map(tag => (
                  <button
                    key={tag}
                    className={selectedTags.includes(tag) ? styles.selected : ''}
                    onClick={() => toggleTag(tag)}
                    type="button"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{marginBottom:12}}>
            <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>질문 제목</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="궁금한 점을 간단히 써주세요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',boxSizing:'border-box' as const}} onFocus={e=>e.target.style.borderColor='#00C73C'} onBlur={e=>e.target.style.borderColor='#E5E8EB'}/>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{fontSize:12,fontWeight:600,color:'#4E5968',display:'block',marginBottom:6}}>상세 내용 <span style={{fontWeight:400,color:'#8B95A1'}}>(선택)</span></label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} placeholder="상황을 더 설명해주시면 더 좋은 답변을 받을 수 있어요" style={{width:'100%',padding:'11px 13px',border:'1.5px solid #E5E8EB',borderRadius:9,fontSize:14,outline:'none',resize:'none' as const,boxSizing:'border-box' as const}} onFocus={e=>e.target.style.borderColor='#00C73C'} onBlur={e=>e.target.style.borderColor='#E5E8EB'}/>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            <button onClick={onClose} style={{height:38,padding:'0 18px',background:'#F9FAFB',border:'1px solid #E5E8EB',borderRadius:8,fontSize:14,cursor:'pointer'}}>취소</button>
            <button onClick={() => { if(title.trim()) onSubmit(title.trim(), body.trim(), cat, selectedTags); }} disabled={!title.trim()} style={{height:38,padding:'0 22px',background:title.trim()?'#00C73C':'#E5E8EB',border:'none',borderRadius:8,color:title.trim()?'white':'#8B95A1',fontSize:14,fontWeight:700,cursor:title.trim()?'pointer':'default',transition:'all .2s'}}>질문 올리기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
