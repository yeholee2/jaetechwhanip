'use client';

import { useRef, useEffect } from 'react';
import { ScreenshotButton } from '@/components/share/ScreenshotButton';

export function StockPageShareBar({
  symbol,
  targetId,
}: {
  symbol: string;
  targetId: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    ref.current = document.getElementById(targetId);
  }, [targetId]);

  return (
    <ScreenshotButton
      target={() => ref.current}
      filename={`${symbol}-jaetechwhanip`}
      label="📷 페이지 캡처"
    />
  );
}
