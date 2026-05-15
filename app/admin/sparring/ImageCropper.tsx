'use client';

/**
 * 이미지 크롭 모달 — 16:9 비율 (스파링 카드 표준).
 *
 * - 사용자가 사진 업로드하면 모달 열림
 * - 드래그로 위치 조정, 휠/슬라이더로 확대/축소
 * - 확인 시 1200×675 canvas 에 그려서 webp(.85) 로 변환
 * - 결과 Blob 을 onConfirm 콜백으로 전달
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './ImageCropper.module.css';

const TARGET_W = 1200;
const TARGET_H = 675; // 16:9
const PREVIEW_W = 560;
const PREVIEW_H = 315;

type Props = {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
};

export function ImageCropper({ file, onCancel, onConfirm }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [working, setWorking] = useState(false);

  // 파일 → preview URL
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // 이미지 로드 → 초기 fit-cover 스케일 계산
  const onImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    // 초기: 프레임을 cover하는 최소 스케일
    const sx = PREVIEW_W / img.naturalWidth;
    const sy = PREVIEW_H / img.naturalHeight;
    const initScale = Math.max(sx, sy);
    setScale(initScale);
    setOffset({ x: 0, y: 0 });
  }, []);

  // 드래그 시작
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current || !imgSize) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newX = dragRef.current.origX + dx;
      const newY = dragRef.current.origY + dy;
      // 경계 제한 (이미지가 프레임 밖으로 너무 벗어나지 않게)
      const imgW = imgSize.w * scale;
      const imgH = imgSize.h * scale;
      const maxX = Math.max(0, (imgW - PREVIEW_W) / 2);
      const maxY = Math.max(0, (imgH - PREVIEW_H) / 2);
      setOffset({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [scale, imgSize]);

  const handleScale = (next: number) => {
    setScale(next);
    if (!imgSize) return;
    // 스케일 변경 후 경계 재제한
    const imgW = imgSize.w * next;
    const imgH = imgSize.h * next;
    const maxX = Math.max(0, (imgW - PREVIEW_W) / 2);
    const maxY = Math.max(0, (imgH - PREVIEW_H) / 2);
    setOffset(o => ({
      x: Math.max(-maxX, Math.min(maxX, o.x)),
      y: Math.max(-maxY, Math.min(maxY, o.y)),
    }));
  };

  // 확인 → 1200×675 canvas 로 크롭 후 webp Blob
  const handleConfirm = async () => {
    if (!imgSize) return;
    setWorking(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('image load failed'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = TARGET_W;
      canvas.height = TARGET_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas 2d unavailable');

      // 프레임 안에서 실제로 보이는 이미지 영역 계산
      const previewToTarget = TARGET_W / PREVIEW_W; // = TARGET_H / PREVIEW_H
      const imgDisplayW = imgSize.w * scale;
      const imgDisplayH = imgSize.h * scale;
      // 프레임 중앙 + offset 이 이미지 어디를 보여주는지
      const cx = imgSize.w / 2 - (offset.x / scale);
      const cy = imgSize.h / 2 - (offset.y / scale);
      const srcW = PREVIEW_W / scale;
      const srcH = PREVIEW_H / scale;
      const srcX = cx - srcW / 2;
      const srcY = cy - srcH / 2;

      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, TARGET_W, TARGET_H);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/webp',
          0.85,
        );
      });
      onConfirm(blob);
    } catch (err) {
      console.error('[ImageCropper]', err);
      alert('이미지 변환에 실패했어요. 다른 이미지로 시도해주세요.');
    } finally {
      setWorking(false);
    }
  };

  if (!imageUrl) return null;

  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.head}>
          <h2>썸네일 영역 조정</h2>
          <button type="button" className={styles.close} onClick={onCancel} aria-label="닫기">✕</button>
        </header>

        <p className={styles.hint}>
          드래그로 위치 · 슬라이더로 확대 — 16:9 비율로 잘려서 저장돼요.
        </p>

        <div
          ref={containerRef}
          className={styles.frame}
          style={{ width: PREVIEW_W, height: PREVIEW_H }}
          onMouseDown={onMouseDown}
        >
          {imgSize && (
            <img
              src={imageUrl}
              alt="크롭 미리보기"
              draggable={false}
              onLoad={onImgLoad}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: imgSize.w * scale,
                height: imgSize.h * scale,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          )}
          {!imgSize && (
            <img
              src={imageUrl}
              alt="크롭 미리보기"
              onLoad={onImgLoad}
              style={{ position: 'absolute', visibility: 'hidden' }}
            />
          )}
          <div className={styles.frameGrid} aria-hidden="true" />
        </div>

        <div className={styles.controls}>
          <label className={styles.zoomRow}>
            <span>확대</span>
            <input
              type="range"
              min={imgSize ? Math.max(PREVIEW_W / imgSize.w, PREVIEW_H / imgSize.h) : 0.5}
              max={3}
              step={0.01}
              value={scale}
              onChange={e => handleScale(Number(e.target.value))}
              className={styles.range}
            />
          </label>
        </div>

        <div className={styles.foot}>
          <button type="button" className={styles.cancel} onClick={onCancel} disabled={working}>취소</button>
          <button type="button" className={styles.confirm} onClick={handleConfirm} disabled={working || !imgSize}>
            {working ? '변환 중…' : '✓ 이대로 사용하기 (webp 저장)'}
          </button>
        </div>
      </div>
    </div>
  );
}
