'use client';

/**
 * 우측 하단 떠다니는 라이트/다크 모드 토글.
 * 페이지 어디서든 한 클릭으로 테마 전환.
 */

import { DarkModeToggle } from './DarkModeToggle';
import styles from './FloatingThemeToggle.module.css';

export function FloatingThemeToggle() {
  return (
    <div className={styles.floating} aria-label="화면 테마 전환">
      <DarkModeToggle />
    </div>
  );
}
