'use client';

/**
 * 스파링 공유 버튼 — 카카오톡 / X / 링크 복사.
 *
 * 카카오톡: Kakao SDK 가 OG 자동으로 가져옴.
 *   SDK 없으면 그냥 URL 클립보드 복사로 fallback.
 * X: 텍스트 + URL 로 새 창
 * 링크: 클립보드 복사
 */

import { useState } from 'react';
import styles from './ShareButtons.module.css';

declare global {
  interface Window {
    Kakao?: any;
  }
}

export function ShareButtons({
  url,
  title,
  text,
}: {
  url: string;        // 절대 URL
  title: string;
  text?: string;
}) {
  const [toast, setToast] = useState('');

  const showToast = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(''), 1800);
  };

  const shareKakao = () => {
    if (typeof window === 'undefined') return;
    const Kakao = window.Kakao;
    if (Kakao && Kakao.Share) {
      try {
        Kakao.Share.sendDefault({
          objectType: 'feed',
          content: {
            title,
            description: text || '재테크한입 스파링 — 너의 의견은?',
            imageUrl: `${url}/opengraph-image`,
            link: { mobileWebUrl: url, webUrl: url },
          },
          buttons: [
            {
              title: '의견 남기러 가기',
              link: { mobileWebUrl: url, webUrl: url },
            },
          ],
        });
      } catch (err) {
        copyLink();
      }
    } else {
      // Kakao SDK 미설치 — 모바일이면 카톡 공유 시트 (Web Share API)
      tryWebShare() || copyLink();
    }
  };

  const shareTwitter = () => {
    const t = encodeURIComponent(`${title}${text ? `\n\n${text}` : ''}`);
    const u = encodeURIComponent(url);
    window.open(
      `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareThreads = () => {
    const t = encodeURIComponent(`${title}\n${url}`);
    window.open(
      `https://www.threads.net/intent/post?text=${t}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copyLink = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('링크가 복사됐어요'));
    } else {
      // fallback — input 생성해서 복사
      const i = document.createElement('input');
      i.value = url;
      document.body.appendChild(i);
      i.select();
      try { document.execCommand('copy'); showToast('링크가 복사됐어요'); } catch {}
      document.body.removeChild(i);
    }
  };

  const tryWebShare = (): boolean => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title, text, url }).catch(() => {});
      return true;
    }
    return false;
  };

  return (
    <div className={styles.wrap} aria-label="공유">
      <span className={styles.label}>공유</span>
      <button type="button" onClick={shareKakao} className={`${styles.btn} ${styles.btnKakao}`} aria-label="카카오톡 공유">
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 3c-5.5 0-10 3.6-10 8 0 2.8 1.9 5.3 4.7 6.7-.2.6-.7 2.4-.8 2.7 0 0 0 .3.2.4.2.1.4 0 .4 0 .3-.1 3.4-2.2 3.9-2.5.5.1 1.1.1 1.6.1 5.5 0 10-3.6 10-8s-4.5-8.4-10-8.4z"
          />
        </svg>
        카카오톡
      </button>
      <button type="button" onClick={shareTwitter} className={`${styles.btn} ${styles.btnX}`} aria-label="X 공유">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"
          />
        </svg>
        X
      </button>
      <button type="button" onClick={shareThreads} className={`${styles.btn} ${styles.btnThreads}`} aria-label="스레드 공유">
        Threads
      </button>
      <button type="button" onClick={copyLink} className={`${styles.btn} ${styles.btnLink}`} aria-label="링크 복사">
        🔗 링크
      </button>
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
