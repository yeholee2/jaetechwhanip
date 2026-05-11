'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Swords } from 'lucide-react';
import { getAuthNickname, syncFinanceNickname } from '@/lib/nicknames';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { FaIcon } from './FaIcon';
import styles from './AppShell.module.css';

export type AppNavKey = 'home' | 'etf' | 'topics' | 'sparring' | 'feed' | 'mission' | 'my';

const NAV_ITEMS: { key: AppNavKey; label: string; href: string }[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'etf', label: 'ETF', href: '/etf' },
  { key: 'feed', label: '피드', href: '/feed' },
  { key: 'sparring', label: '스파링', href: '/sparring' },
];

function getUserName(user: any) {
  if (!user) return '';
  return getAuthNickname(user) || 'ME';
}

function getUserAvatar(user: any) {
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
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const userName = getUserName(user);
  const userAvatar = getUserAvatar(user);
  const profileHref = user ? `/u/${user.id}` : '/auth';
  const ask = () => router.push(user ? '/?ask=1' : '/auth?next=/?ask=1');

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
    // 홈으로 검색 결과 전달 (홈에서 question filter 처리)
    router.push(`/?q=${encodeURIComponent(q)}`);
    setShowSearch(false);
  };

  const openSearch = () => {
    setShowSearch(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (!hasSupabase()) {
      return undefined;
    }

    const supabase = createClient();
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) void syncFinanceNickname(supabase, nextUser);
    });

    supabase.auth.getSession().then(({ data }) => {
      const nextUser = data.session?.user ?? null;
      setUser(nextUser);
      if (nextUser) void syncFinanceNickname(supabase, nextUser);
    });

    return () => authSub.subscription.unsubscribe();
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
        <Link className={`${styles.logo} logo-font`} href="/">ETF<em>한입</em></Link>
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
            <button
              className={styles.iconBtn}
              aria-label="검색"
              aria-expanded={showSearch}
              type="button"
              onClick={() => showSearch ? setShowSearch(false) : openSearch()}
            >
              <FaIcon name="magnifying-glass" size={18} />
            </button>
            {showSearch && (
              <form className={styles.searchPopup} onSubmit={submitSearch} role="search">
                <FaIcon name="magnifying-glass" size={14} />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="질문·ETF·키워드 검색"
                  aria-label="검색어"
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
          </div>
          <button className={styles.iconBtn} aria-label="알림"><FaIcon name="bell" size={18} /></button>
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
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt="" />
                ) : (
                  userName[0]?.toUpperCase() || 'U'
                )}
              </button>
              {showProfile && (
                <div className={styles.profileMenu} role="menu">
                  <div className={styles.profileName}>{userName}</div>
                  <Link href={profileHref} onClick={() => setShowProfile(false)} role="menuitem">
                    내 정보 보기
                  </Link>
                  <button className={styles.signOut} onClick={handleSignOut} role="menuitem" type="button">
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link className={styles.iconBtn} href="/auth" aria-label="내 정보" title="내 정보">
              <FaIcon name="user" size={18} />
            </Link>
          )}
          <button className={styles.askBtn} onClick={ask}>나도 질문하기</button>
        </div>
      </nav>

      <header className={styles.moHeader}>
        <div className={styles.moTop}>
          <Link className={`${styles.moLogo} logo-font`} href="/">ETF<em>한입</em></Link>
          <div className={styles.moIcons}>
            <button
              className={styles.moIcon}
              aria-label="검색"
              type="button"
              onClick={() => showSearch ? setShowSearch(false) : openSearch()}
            >
              <FaIcon name="magnifying-glass" size={19} />
            </button>
            <button className={styles.moIcon} aria-label="알림"><FaIcon name="bell" size={19} /></button>
            {user ? (
              <Link className={styles.moAvatar} href={profileHref} aria-label="내 정보">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt="" />
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

      <nav className={styles.bottomNav}>
        <Link className={`${styles.bnav} ${active === 'home' ? styles.active : ''}`} href="/">
          <FaIcon name="house" size={21} /><span>홈</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'etf' ? styles.active : ''}`} href="/etf">
          <FaIcon name="chart-line" size={21} /><span>ETF</span>
        </Link>
        <Link className={`${styles.bnav} ${styles.bnavAsk} ${active === 'feed' ? styles.active : ''}`} href="/feed">
          <span className={styles.bnavAskIcon}><FaIcon name="comments" size={22} /></span>
          <span>피드</span>
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
      <strong>ETF 자산을 한입에 관리해요</strong> · 시장 흐름·내 포트폴리오·토론까지 한 곳에서.
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
