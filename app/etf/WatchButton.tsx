'use client';

import { useEffect, useState } from 'react';
import { isEtfWatched, toggleEtfWatch, subscribeWatchChanges, syncEtfWatchFromServer } from '@/lib/etfWatch';
import styles from './WatchButton.module.css';

/**
 * 관심 ETF 토글.
 * - mode='full'(default): "♡ 관심" 텍스트 버튼
 * - mode='icon': 동그란 ♡ 아이콘만 (헤로 CTA 경쟁 회피용)
 */
export function WatchButton({
  code,
  shortName,
  mode = 'icon',
}: {
  code: string;
  shortName: string;
  mode?: 'full' | 'icon';
}) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatched(isEtfWatched(code));
    void syncEtfWatchFromServer();
    return subscribeWatchChanges(codes => setWatched(codes.includes(code)));
  }, [code]);

  const onClick = () => {
    const next = toggleEtfWatch(code);
    setWatched(next);
  };

  const label = `${shortName} ${watched ? '관심 해제' : '관심 등록'}`;

  if (mode === 'icon') {
    return (
      <button
        type="button"
        className={`${styles.iconBtn} ${watched ? styles.iconActive : ''}`}
        onClick={onClick}
        aria-pressed={watched}
        aria-label={label}
        title={watched ? '관심 해제' : '관심 등록'}
      >
        {mounted && watched ? '♥' : '♡'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`${styles.fullBtn} ${watched ? styles.fullActive : ''}`}
      onClick={onClick}
      aria-pressed={watched}
      aria-label={label}
    >
      {mounted && watched ? '♥ 관심중' : '♡ 관심'}
    </button>
  );
}
