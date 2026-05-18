'use client';

/**
 * 크리에이터 이미지 업로더 — 아바타·커버·썸네일 공용.
 *
 * 사용:
 *  <ImageUploader value={url} onChange={setUrl} scope="avatar" />
 *
 * 동작:
 *  1. 파일 선택 → /api/creator/upload POST
 *  2. 응답 URL → onChange
 *  3. 미리보기 표시
 */

import { useRef, useState } from 'react';
import styles from './ImageUploader.module.css';

type Scope = 'avatar' | 'cover' | 'post-thumb' | 'user-avatar';

export function ImageUploader({
  value,
  onChange,
  scope,
  shape = 'square',
  label,
}: {
  value: string;
  onChange: (url: string) => void;
  scope: Scope;
  shape?: 'circle' | 'square' | 'wide';
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (file: File) => {
    setErr('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('scope', scope);
      const r = await fetch('/api/creator/upload', {
        method: 'POST',
        body: fd,
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || '업로드 실패');
        return;
      }
      onChange(j.url);
    } finally {
      setUploading(false);
    }
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void upload(f);
    e.target.value = '';
  };

  const shapeCls = shape === 'circle' ? styles.circle : shape === 'wide' ? styles.wide : styles.square;

  return (
    <div className={styles.wrap}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <button
          type="button"
          className={`${styles.preview} ${shapeCls}`}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {value ? (
            value.length <= 4 ? (
              <span className={styles.emoji}>{value}</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" />
            )
          ) : (
            <span className={styles.placeholder}>
              {uploading ? '업로드 중…' : '+ 이미지'}
            </span>
          )}
          {uploading && <div className={styles.loadingDim} aria-hidden />}
        </button>
        <div className={styles.controls}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={styles.uploadBtn}
            disabled={uploading}
          >
            {uploading ? '업로드 중…' : value ? '이미지 변경' : '이미지 업로드'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className={styles.removeBtn}
              disabled={uploading}
            >
              제거
            </button>
          )}
          <span className={styles.hint}>5MB 이하 · PNG/JPG/WEBP</span>
        </div>
      </div>
      {err && <div className={styles.err}>{err}</div>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPick}
        className={styles.hidden}
      />
    </div>
  );
}
