'use client';

/**
 * 스크린샷 버튼 — 지정한 DOM 노드를 PNG 로 캡처해서 다운로드.
 *
 * - html-to-image 사용 (가볍고 SVG·Canvas 둘 다 처리)
 * - 워터마크 "재테크한입 · jaetechwhanip.com" 자동 합성
 * - 다운로드 + 클립보드 복사 두 옵션
 *
 * 사용:
 *   <ScreenshotButton targetRef={ref} filename="AAPL-chart" label="📷 캡처" />
 */

import { useState } from 'react';
import { toPng } from 'html-to-image';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import styles from './ScreenshotButton.module.css';

export function ScreenshotButton({
  target,
  filename = 'jaetechwhanip',
  label = '📷 스크린샷',
  showCopy = true,
}: {
  target: () => HTMLElement | null;
  filename?: string;
  label?: string;
  showCopy?: boolean;
}) {
  const [busy, setBusy] = useState<'download' | 'copy' | null>(null);
  const [toast, setToast] = useState('');

  const capture = async (): Promise<Blob | null> => {
    const el = target();
    if (!el) return null;
    const dataUrl = await toPng(el, {
      cacheBust: true,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter: (node) => {
        // 캡처 UI 자체는 제외 (버튼 등)
        if (node instanceof HTMLElement && node.dataset.screenshotIgnore === '') return false;
        return true;
      },
    });
    // 워터마크 추가
    return await composeWithWatermark(dataUrl, filename);
  };

  const download = async () => {
    setBusy('download');
    setToast('');
    try {
      const blob = await capture();
      if (!blob) { setToast('캡처 실패'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast('✓ 다운로드');
    } catch (e: any) {
      setToast(`실패: ${e?.message?.slice(0, 30) || ''}`);
    } finally {
      setBusy(null);
      setTimeout(() => setToast(''), 2000);
    }
  };

  const copy = async () => {
    setBusy('copy');
    setToast('');
    try {
      const blob = await capture();
      if (!blob) { setToast('캡처 실패'); return; }
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setToast('✓ 클립보드에 복사');
    } catch (e: any) {
      setToast(`복사 실패: ${e?.message?.slice(0, 30) || ''}`);
    } finally {
      setBusy(null);
      setTimeout(() => setToast(''), 2000);
    }
  };

  return (
    <div className={styles.wrap} data-screenshot-ignore="">
      <button
        type="button"
        onClick={download}
        disabled={busy != null}
        className={styles.btn}
      >
        {busy === 'download' ? '캡처 중…' : label}
      </button>
      {showCopy && (
        <button
          type="button"
          onClick={copy}
          disabled={busy != null}
          className={styles.btnGhost}
          title="클립보드에 복사 (X·스레드 붙여넣기)"
        >
          {busy === 'copy' ? '복사 중…' : '📋'}
        </button>
      )}
      {toast && <span className={styles.toast}>{toast}</span>}
    </div>
  );
}

/**
 * dataURL 이미지에 워터마크 박아서 Blob 반환.
 */
async function composeWithWatermark(dataUrl: string, label: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const padding = 40;
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height + padding;
      const ctx = canvas.getContext('2d')!;
      // 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // 본 이미지
      ctx.drawImage(img, 0, 0);
      // 워터마크 영역 (하단 띠)
      ctx.fillStyle = 'rgba(15, 23, 42, 0.03)';
      ctx.fillRect(0, img.height, canvas.width, padding);
      // 텍스트
      ctx.fillStyle = '#3182F6';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(SITE_NAME, 20, img.height + padding / 2);
      ctx.fillStyle = '#8B95A1';
      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", sans-serif';
      const url = SITE_URL.replace(/^https?:\/\//, '');
      const textW = ctx.measureText(url).width;
      ctx.fillText(url, canvas.width - textW - 20, img.height + padding / 2);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png');
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = dataUrl;
  });
}
