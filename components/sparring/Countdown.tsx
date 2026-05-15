'use client';

import { useEffect, useMemo, useState } from 'react';

type CountdownProps = {
  deadlineAt: string;
  compact?: boolean;
  expiredLabel?: string;
};

function getParts(deadlineAt: string) {
  const diff = Math.max(0, new Date(deadlineAt).getTime() - Date.now());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((diff / (60 * 1000)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { diff, days, hours, minutes, seconds };
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

export default function Countdown({ deadlineAt, compact = false, expiredLabel = '마감' }: CountdownProps) {
  const [tick, setTick] = useState(0);
  const parts = useMemo(() => getParts(deadlineAt), [deadlineAt, tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick(value => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (parts.diff <= 0) return <>{expiredLabel}</>;
  if (compact) {
    // 사람이 읽기 좋은 단위 — 큰 두 단위만 노출
    if (parts.days >= 1) return <>{parts.days}일 {parts.hours}시간 남음</>;
    if (parts.hours >= 1) return <>{parts.hours}시간 {pad(parts.minutes)}분 남음</>;
    if (parts.minutes >= 1) return <>{parts.minutes}분 {pad(parts.seconds)}초 남음</>;
    return <>{parts.seconds}초 남음</>;
  }
  return <>{parts.days}일 {parts.hours}:{pad(parts.minutes)}:{pad(parts.seconds)}</>;
}
