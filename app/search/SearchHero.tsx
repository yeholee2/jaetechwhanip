'use client';

/**
 * 검색 hero — a-ha.io 톤.
 *
 * - 큰 검색바 (포커스 글로우)
 * - 인기 검색어 chips
 * - 최근 검색 (localStorage, 5개)
 * - 추천 카테고리 칩
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './SearchHero.module.css';

const POPULAR = [
  'S&P500', '월배당 ETF', '나스닥', '반도체', 'ISA', '연금저축',
  '커버드콜', '환헤지', '리츠', '월급쟁이 재테크',
];

const CATEGORIES: { key: string; label: string; emoji: string; query: string }[] = [
  { key: 'etf',      label: 'ETF',          emoji: '📊', query: 'ETF' },
  { key: 'stock',    label: '종목',          emoji: '🏢', query: '종목' },
  { key: 'tax',      label: '절세',          emoji: '🧾', query: '절세' },
  { key: 'pension',  label: '연금',          emoji: '💰', query: '연금저축' },
  { key: 'dividend', label: '배당',          emoji: '💸', query: '배당' },
  { key: 'macro',    label: '시장 흐름',     emoji: '📈', query: '코스피' },
];

const RECENT_KEY = 'hanip:search:recent';

function getRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecent().filter(x => x !== q);
    list.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5)));
  } catch {}
}

export function SearchHero({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecent(getRecent());
    if (!initialQuery && inputRef.current) {
      inputRef.current.focus();
    }
  }, [initialQuery]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    pushRecent(v);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  };

  const pickKeyword = (kw: string) => {
    setQ(kw);
    pushRecent(kw);
    router.push(`/search?q=${encodeURIComponent(kw)}`);
  };

  const clearRecent = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(RECENT_KEY);
    }
    setRecent([]);
  };

  return (
    <section className={styles.wrap} aria-label="검색">
      <header className={styles.heroHead}>
        <h1>무엇을 찾고 있나요?</h1>
        <p>ETF·대가·종목·질문·뉴스까지 한 번에.</p>
      </header>

      <form onSubmit={submit} className={styles.searchForm}>
        <span className={styles.searchIcon} aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="예: S&P500, 월배당 ETF, 나스닥 100, ISA…"
          className={styles.searchInput}
          aria-label="검색어"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); inputRef.current?.focus(); }}
            className={styles.clearBtn}
            aria-label="검색어 지우기"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <button type="submit" className={styles.submitBtn} disabled={!q.trim()}>
          검색
        </button>
      </form>

      {/* 추천 카테고리 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>카테고리</h2>
        <div className={styles.catGrid}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => pickKeyword(c.query)}
              className={styles.catCard}
            >
              <span className={styles.catEmoji}>{c.emoji}</span>
              <span className={styles.catLabel}>{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 인기 검색어 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span>🔥 인기 검색어</span>
        </h2>
        <div className={styles.chipRow}>
          {POPULAR.map((kw, i) => (
            <button
              key={kw}
              type="button"
              onClick={() => pickKeyword(kw)}
              className={styles.popChip}
            >
              <span className={styles.popRank}>{i + 1}</span>
              <span>{kw}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 최근 검색 */}
      {recent.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <span>🕓 최근 검색</span>
            <button type="button" onClick={clearRecent} className={styles.clearAll}>
              모두 지우기
            </button>
          </h2>
          <div className={styles.chipRow}>
            {recent.map(kw => (
              <button
                key={kw}
                type="button"
                onClick={() => pickKeyword(kw)}
                className={styles.recentChip}
              >
                {kw}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
