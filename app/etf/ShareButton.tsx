'use client';

import { useState } from 'react';
import { FaIcon } from '@/components/FaIcon';
import styles from './ShareButton.module.css';

export function ShareButton({ title, text }: { title: string; text?: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      // navigator.share 우선 (모바일)
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch {
      /* 사용자가 share dialog를 닫음 — 무시 */
    }
    // fallback: clipboard
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard 실패 시도 */
    }
  };

  return (
    <button
      type="button"
      className={styles.share}
      onClick={onClick}
      aria-label="공유"
    >
      <FaIcon name="share-nodes" size={14} />
      {copied ? '링크 복사됨!' : '공유'}
    </button>
  );
}
