'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { isEtfWatched, toggleEtfWatch, subscribeWatchChanges } from '@/lib/etfWatch';

export function WatchButton({ code, shortName }: { code: string; shortName: string }) {
  const [watched, setWatched] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatched(isEtfWatched(code));
    return subscribeWatchChanges(codes => setWatched(codes.includes(code)));
  }, [code]);

  const onClick = () => {
    const next = toggleEtfWatch(code);
    setWatched(next);
  };

  // SSR/hydration 안전: 마운트 전엔 기본 outline.
  if (!mounted) {
    return (
      <Button variant="outline" size="md">
        ♡ 관심
      </Button>
    );
  }

  return (
    <Button
      variant={watched ? 'primary' : 'outline'}
      size="md"
      onClick={onClick}
      aria-pressed={watched}
      aria-label={`${shortName} ${watched ? '관심 해제' : '관심 등록'}`}
    >
      {watched ? '♥ 관심중' : '♡ 관심'}
    </Button>
  );
}
