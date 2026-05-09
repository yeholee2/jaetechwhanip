'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Bell, Home, LayoutList, Plus, Search, Swords, User } from 'lucide-react';
import styles from './AppShell.module.css';

export type AppNavKey = 'home' | 'topics' | 'sparring' | 'feed' | 'mission' | 'my';

const NAV_ITEMS: { key: AppNavKey; label: string; href: string }[] = [
  { key: 'home', label: '홈', href: '/' },
  { key: 'topics', label: '토픽', href: '/topics/재테크-입문' },
  { key: 'sparring', label: '스파링', href: '/sparring' },
  { key: 'feed', label: '피드', href: '/feed' },
  { key: 'mission', label: '미션', href: '#' },
];

export function AppShell({
  active,
  children,
}: {
  active: AppNavKey;
  children: ReactNode;
}) {
  const router = useRouter();
  const ask = () => router.push('/auth?next=/');

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
          <button className={styles.iconBtn} aria-label="검색"><Search size={18} /></button>
          <button className={styles.iconBtn} aria-label="알림"><Bell size={18} /></button>
          <button className={styles.askBtn} onClick={ask}>나도 질문하기</button>
        </div>
      </nav>

      <header className={styles.moHeader}>
        <div className={styles.moTop}>
          <Link className={`${styles.moLogo} logo-font`} href="/">재테크<em>한입</em></Link>
          <div className={styles.moIcons}>
            <button className={styles.moIcon} aria-label="검색"><Search size={20} /></button>
            <button className={styles.moIcon} aria-label="알림"><Bell size={20} /></button>
          </div>
        </div>
        <nav className={styles.moGnav}>
          {NAV_ITEMS.map(item => (
            <Link key={item.key} href={item.href} className={active === item.key ? styles.active : ''}>
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <Slogan />
      <div className={styles.content}>{children}</div>

      <nav className={styles.bottomNav}>
        <Link className={`${styles.bnav} ${active === 'home' ? styles.active : ''}`} href="/">
          <Home size={22} /><span>홈</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'topics' ? styles.active : ''}`} href="/topics/재테크-입문">
          <LayoutList size={22} /><span>토픽</span>
        </Link>
        <button className={`${styles.bnav} ${styles.bnavAsk}`} onClick={ask}>
          <span className={styles.bnavAskIcon}><Plus size={24} /></span>
          <span>질문</span>
        </button>
        <Link className={`${styles.bnav} ${active === 'sparring' ? styles.active : ''}`} href="/sparring">
          <Swords size={22} /><span>스파링</span>
        </Link>
        <Link className={`${styles.bnav} ${active === 'my' ? styles.active : ''}`} href="/auth">
          <User size={22} /><span>마이</span>
        </Link>
      </nav>
    </div>
  );
}

export function Slogan() {
  return (
    <p className={styles.slogan}>
      <strong>질문하고 답변받는 재테크 커뮤니티</strong> · 돈 고민을 한입 크기로 쪼개서 같이 판단해요.
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
