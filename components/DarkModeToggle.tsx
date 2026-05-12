'use client';

/**
 * 라이트/다크 모드 토글.
 * - localStorage 'etfhanip:theme' 에 'light'|'dark' 저장
 * - 시스템 preference 도 존중 (저장값 없을 때)
 * - <html data-theme="dark"> 토글로 모든 토큰 자동 전환
 */

import { useEffect, useState } from 'react';
import styles from './DarkModeToggle.module.css';

type Theme = 'light' | 'dark';
const KEY = 'etfhanip:theme';

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(KEY) as Theme | null;
    if (stored === 'dark' || stored === 'light') return stored;
  } catch { /* ignore */ }
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function apply(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  try { window.localStorage.setItem(KEY, theme); } catch { /* quota */ }
}

export function DarkModeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const init = getInitial();
    setTheme(init);
    apply(init);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    apply(next);
  };

  if (!mounted) {
    return (
      <button type="button" className={styles.btn} aria-label="테마 전환">
        <span className={styles.iconLight} aria-hidden="true">☀️</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggle}
      aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
    >
      <span className={theme === 'dark' ? styles.iconDark : styles.iconLight} aria-hidden="true">
        {theme === 'dark' ? '🌙' : '☀️'}
      </span>
    </button>
  );
}
