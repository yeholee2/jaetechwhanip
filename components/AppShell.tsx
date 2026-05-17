'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Swords } from 'lucide-react';
import { getAuthNickname, syncFinanceNickname } from '@/lib/nicknames';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { searchInline } from '@/lib/searchInline';
import { listRecentSearches, pushRecentSearch, clearRecentSearches } from '@/lib/recentActivity';
import { etfPath } from '@/lib/etfs';
import { FaIcon } from './FaIcon';
import { Footer } from './Footer';
import { BottomPromoBar } from './BottomPromoBar';
import { FloatingThemeToggle } from './FloatingThemeToggle';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import styles from './AppShell.module.css';

export type AppNavKey = 'home' | 'etf' | 'portfolio' | 'topics' | 'sparring' | 'feed' | 'mission' | 'my' | 'creators';

const NAV_ITEMS: { key: AppNavKey; label: string; href: string }[] = [
  { key: 'home', label: 'Q&A', href: '/' },
  { key: 'etf', label: 'ETF', href: '/etf' },
  { key: 'portfolio', label: 'MY포트폴리오', href: '/portfolio' },
  { key: 'creators', label: '핀플루언서', href: '/creators' },
  { key: 'sparring', label: '스파링', href: '/sparring' },
];

function getUserName(user: any) {
  if (!user) return '';
  return getAuthNickname(user) || 'ME';
}

function getUserAvatar(user: any, dbProfile: { avatar_url?: string | null } | null) {
  // DB profile 의 avatar (사용자가 마이페이지에서 직접 설정한 이모지/URL) 우선
  if (dbProfile?.avatar_url) return dbProfile.avatar_url;
  return (
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.profile_image ||
    ''
  );
}

export function AppShell({
  active,
  children,
  wide = false,
  hideSlogan = false,
}: {
  active: AppNavKey;
  children: ReactNode;
  wide?: boolean;
  hideSlogan?: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [dbProfile, setDbProfile] = useState<{ avatar_url?: string | null; name?: string | null } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userName = dbProfile?.name || getUserName(user);
  const userAvatar = getUserAvatar(user, dbProfile);
  const profileHref = user ? `/u/${user.id}` : '/auth';
  const ask = () => router.push(user ? '/questions/create' : '/auth?next=/questions/create');

  // 검색 popup 외부 클릭 닫기
  useEffect(() => {
    if (!showSearch) return undefined;
    const handler = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSearch]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    pushRecentSearch(q);
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setShowSearch(false);
    setSearchQuery('');
  };

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  // Cmd/Ctrl+K 단축키로 검색 열기
  // ⌘+K 는 GlobalSearch 컴포넌트가 처리 (모달). AppShell 내부 토글은 사용 안 함.

  // 인라인 결과 + 최근 검색
  const [recents, setRecents] = useState<string[]>([]);
  const inlineHits = useMemo(() => searchInline(searchQuery, 6), [searchQuery]);
  useEffect(() => {
    if (showSearch) setRecents(listRecentSearches());
  }, [showSearch]);

  const goTo = (href: string, q?: string) => {
    if (q) pushRecentSearch(q);
    router.push(href);
    setShowSearch(false);
    setSearchQuery('');
  };

  const [bellNotice, setBellNotice] = useState(false);
  const showBellNotice = () => {
    setBellNotice(true);
    setTimeout(() => setBellNotice(false), 2400);
  };

  useEffect(() => {
    if (!hasSupabase()) {
      return undefined;
    }

    const supabase = createClient();

    const refreshDbProfile = (uid: string) => {
      supabase.from('users').select('role, avatar_url, name').eq('id', uid).maybeSingle()
        .then(({ data: profile }) => {
          setIsAdmin(profile?.role === 'admin');
          setDbProfile({ avatar_url: profile?.avatar_url ?? null, name: profile?.name ?? null });
        });
    };

    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void syncFinanceNickname(supabase, nextUser);
        refreshDbProfile(nextUser.id);
      } else {
        setDbProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        void syncFinanceNickname(supabase, nextUser);
        refreshDbProfile(nextUser.id);
      }
    });

    // 마이페이지에서 프로필 저장 시 dispatch — 즉시 헤더 아바타·이름 반영
    const onProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.avatar_url !== undefined || detail.name !== undefined) {
        setDbProfile(p => ({ ...(p || {}), ...detail }));
      } else {
        // detail 없으면 fresh fetch
        const uid = (supabase.auth as any)?.currentSession?.user?.id;
        if (uid) refreshDbProfile(uid);
      }
    };
    window.addEventListener('profile-updated', onProfileUpdated as EventListener);

    return () => {
      authSub.subscription.unsubscribe();
      window.removeEventListener('profile-updated', onProfileUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    };

    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleSignOut = async () => {
    if (hasSupabase()) {
      await createClient().auth.signOut();
    }
    setUser(null);
    setShowProfile(false);
    if (active === 'my') {
      router.push('/auth');
      return;
    }
    router.refresh();
  };

  return (
    <div className={styles.shell}>
      <nav className={styles.pcNav}>
        <Link className={`${styles.logo} logo-font`} href="/">재테크<em>한입</em></Link>
        <ul className={styles.pcMenu}>
          {NAV_ITEMS.map(item => (
            <li key={item.key}>
              <Link href={item.href} className={active === item.key ? styles.active : ''}>
                {item.label}
              </Link>
            </li>
          ))}
          <li><div className={styles.sep} /></li>
          <li><a href="#" style={{ fontSize: 13, color: 'var(--t3)' }}>전문가 신청</a></li>
        </ul>
        <div className={styles.pcRight}>
          <div className={styles.searchWrap} ref={searchRef}>
            <Link
              className={styles.iconBtn}
              aria-label="검색"
              href="/search"
            >
              <FaIcon name="magnifying-glass" size={18} />
            </Link>
            {showSearch && (
              <div className={styles.searchDropdown}>
                <form className={styles.searchPopup} onSubmit={submitSearch} role="search">
                  <FaIcon name="magnifying-glass" size={14} />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="질문·ETF·키워드 검색"
                    aria-label="검색어"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className={styles.searchClear}
                      onClick={() => setSearchQuery('')}
                      aria-label="검색어 지우기"
                    >
                      <FaIcon name="xmark" size={12} />
                    </button>
                  )}
                </form>

                {/* 인라인 결과 또는 최근 검색 */}
                {searchQuery.trim() && inlineHits.length > 0 && (
                  <div className={styles.searchResults}>
                    <div className={styles.searchResultsHead}>빠른 결과</div>
                    {inlineHits.map((hit, i) => {
                      if (hit.kind === 'etf') {
                        return (
                          <button
                            key={`etf-${hit.etf.code}`}
                            className={styles.searchHit}
                            type="button"
                            onClick={() => goTo(etfPath(hit.etf.slug), searchQuery)}
                          >
                            <span className={styles.hitKind}>ETF</span>
                            <span className={styles.hitTitle}>{hit.etf.shortName}</span>
                            <span className={styles.hitMeta}>{hit.etf.code}</span>
                          </button>
                        );
                      }
                      if (hit.kind === 'template') {
                        return (
                          <button
                            key={`tpl-${hit.slug}`}
                            className={styles.searchHit}
                            type="button"
                            onClick={() => goTo(`/portfolio/templates/${hit.slug}`, searchQuery)}
                          >
                            <span className={styles.hitKind}>대가 모델</span>
                            <span className={styles.hitTitle}>{hit.name}</span>
                            <span className={styles.hitMeta}>{hit.author}</span>
                          </button>
                        );
                      }
                      if (hit.kind === 'whale') {
                        return (
                          <button
                            key={`wh-${hit.slug}`}
                            className={styles.searchHit}
                            type="button"
                            onClick={() => goTo(`/portfolio/whales/${hit.slug}`, searchQuery)}
                          >
                            <span className={styles.hitKind}>실시간 13F</span>
                            <span className={styles.hitTitle}>{hit.manager}</span>
                            <span className={styles.hitMeta}>{hit.fund}</span>
                          </button>
                        );
                      }
                      return (
                        <button
                          key={`q-${hit.slug}`}
                          className={styles.searchHit}
                          type="button"
                          onClick={() => goTo(`/q/${hit.slug}`, searchQuery)}
                        >
                          <span className={styles.hitKind}>질문</span>
                          <span className={styles.hitTitle}>{hit.title}</span>
                          <span className={styles.hitMeta}>{hit.category}</span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.searchAll}
                      onClick={() => goTo(`/search?q=${encodeURIComponent(searchQuery)}`, searchQuery)}
                    >
                      &quot;{searchQuery}&quot; 전체 결과 보기 →
                    </button>
                  </div>
                )}

                {searchQuery.trim() && inlineHits.length === 0 && (
                  <div className={styles.searchResults}>
                    <div className={styles.searchEmpty}>
                      바로 매칭되는 게 없어요.
                      <button
                        type="button"
                        className={styles.searchAll}
                        onClick={() => goTo(`/search?q=${encodeURIComponent(searchQuery)}`, searchQuery)}
                      >
                        통합 검색에서 더 찾기 →
                      </button>
                    </div>
                  </div>
                )}

                {!searchQuery.trim() && recents.length > 0 && (
                  <div className={styles.searchResults}>
                    <div className={styles.searchResultsHead}>
                      최근 검색
                      <button
                        type="button"
                        className={styles.searchClearAll}
                        onClick={() => { clearRecentSearches(); setRecents([]); }}
                      >
                        지우기
                      </button>
                    </div>
                    {recents.map(r => (
                      <button
                        key={r}
                        type="button"
                        className={styles.searchHit}
                        onClick={() => goTo(`/search?q=${encodeURIComponent(r)}`, r)}
                      >
                        <span className={styles.hitKind}>↺</span>
                        <span className={styles.hitTitle}>{r}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {user ? (
            <NotificationBell />
          ) : (
            <button
              className={styles.iconBtn}
              aria-label="알림 (로그인 필요)"
              type="button"
              onClick={showBellNotice}
            >
              <FaIcon name="bell" size={18} />
            </button>
          )}
          {user ? (
            <div className={styles.profileWrap} ref={profileRef}>
              <button
                className={styles.profileButton}
                aria-label="내 정보"
                aria-haspopup="menu"
                aria-expanded={showProfile}
                onClick={() => setShowProfile(value => !value)}
                title={userName}
                type="button"
              >
                {userAvatar ? (
                  /^https?:\/\//.test(userAvatar)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={userAvatar} alt="" />
                    : <span className="tf" style={{ fontSize: '18px', lineHeight: 1 }}>{userAvatar}</span>
                ) : (
                  userName[0]?.toUpperCase() || 'U'
                )}
              </button>
              {showProfile && (
                <div className={styles.profileMenu} role="menu">
                  <div className={styles.profileName}>{userName}</div>
                  <Link href="/mypage" onClick={() => setShowProfile(false)} role="menuitem">
                    🏠 마이페이지
                  </Link>
                  <Link href={profileHref} onClick={() => setShowProfile(false)} role="menuitem">
                    공개 프로필
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setShowProfile(false)} role="menuitem">
                      🛠 관리자 대시보드
                    </Link>
                  )}
                  {/* 화면 테마 토글 — 우측 하단 floating 버튼으로 이동 */}
                  <button className={styles.signOut} onClick={handleSignOut} role="menuitem" type="button">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link className={styles.iconBtn} href="/auth" aria-label="내 정보" title="내 정보">
                <FaIcon name="user" size={18} />
              </Link>
            </>
          )}
          <button className={styles.askBtn} onClick={ask}>나도 질문하기</button>
        </div>
      </nav>

      <header className={styles.moHeader}>
        <div className={styles.moTop}>
          <Link className={`${styles.moLogo} logo-font`} href="/">재테크<em>한입</em></Link>
          <div className={styles.moIcons}>
            <Link
              className={styles.moIcon}
              aria-label="검색"
              href="/search"
            >
              <FaIcon name="magnifying-glass" size={19} />
            </Link>
            {user ? (
              <NotificationBell />
            ) : (
              <button
                className={styles.moIcon}
                aria-label="알림 (로그인 필요)"
                type="button"
                onClick={showBellNotice}
              >
                <FaIcon name="bell" size={19} />
              </button>
            )}
            {user ? (
              <Link className={styles.moAvatar} href={profileHref} aria-label="내 정보">
                {userAvatar ? (
                  /^https?:\/\//.test(userAvatar)
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={userAvatar} alt="" />
                    : <span className="tf" style={{ fontSize: '18px', lineHeight: 1 }}>{userAvatar}</span>
                ) : (
                  userName[0]?.toUpperCase() || 'U'
                )}
              </Link>
            ) : (
              <Link className={styles.moIcon} href="/auth" aria-label="내 정보" title="내 정보">
                <FaIcon name="user" size={18} />
              </Link>
            )}
          </div>
        </div>
        {showSearch && (
          <form className={styles.moSearchBar} onSubmit={submitSearch} role="search">
            <FaIcon name="magnifying-glass" size={14} />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="질문·ETF·키워드 검색"
              aria-label="검색어"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
              >
                <FaIcon name="xmark" size={12} />
              </button>
            )}
          </form>
        )}
        <nav className={styles.moGnav}>
          {NAV_ITEMS.map(item => (
            <Link key={item.key} href={item.href} className={active === item.key ? styles.active : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {!hideSlogan && <Slogan />}
      <div className={`${styles.content} ${wide ? styles.wideContent : ''}`}>{children}</div>

      {bellNotice && (
        <div className={styles.toast} role="status">
          🔔 알림 기능은 곧 열려요. 관심 ETF 가격·답변·스파링 결과를 미리 받아볼 수 있어요.
        </div>
      )}

      <Footer />

      <BottomPromoBar />

      {/* 우측 하단 화면 테마 토글 (모든 페이지에 표시) */}
      <FloatingThemeToggle />

      {/* 글로벌 검색 (⌘+K) — 모든 페이지에서 동작 */}
      <GlobalSearch />

      <button
        className={styles.moAskFab}
        onClick={ask}
        type="button"
        aria-label="질문하기"
      >
        <FaIcon name="pen" size={20} color="#fff" />
      </button>

      <nav className={styles.bottomNav}>
        <Link className={`${styles.bnav} ${active === 'home' ? styles.active : ''}`} href="/">
          <FaIcon name="house" size={21} /><span>홈</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'etf' ? styles.active : ''}`} href="/etf">
          <FaIcon name="chart-line" size={21} /><span>ETF</span>
        </Link>
        <Link className={`${styles.bnav} ${styles.bnavAsk} ${active === 'home' ? styles.active : ''}`} href="/">
          <span className={styles.bnavAskIcon}><FaIcon name="comments" size={22} /></span>
          <span>Q&amp;A</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'sparring' ? styles.active : ''}`} href="/sparring">
          <Swords size={22} /><span>스파링</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'my' ? styles.active : ''}`} href={profileHref}>
          <FaIcon name="user" size={21} /><span>마이</span>
        </Link>
      </nav>
    </div>
  );
}

export function Slogan() {
  return (
    <p className={styles.slogan}>
      <strong>재테크 고민, 여기서 해결해요</strong> · Q&A·ETF·포트폴리오·토론까지 한 곳에서.
    </p>
  );
}

export function UnifiedFilterBar({
  tabs,
  activeTab,
  onTabChange,
  categories,
  activeCategory,
  onCategoryChange,
}: {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange?: (key: string) => void;
  categories: { key: string; label: string }[];
  activeCategory: string;
  onCategoryChange?: (key: string) => void;
}) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filterTabs}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? styles.on : ''}
            onClick={() => onTabChange?.(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.chips}>
        {categories.map(category => (
          <button
            key={category.key}
            className={`${styles.chip} ${activeCategory === category.key ? styles.chipOn : ''}`}
            onClick={() => onCategoryChange?.(category.key)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  );
}
