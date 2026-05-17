'use client';

/**
 * 태그 입력 — chip-input. Enter/comma/space 로 확정, BackSpace 로 마지막 chip 삭제.
 *
 * Fanding 동일: 최대 15개, 개당 20자 이하.
 */

import { useState } from 'react';
import styles from './TagsInput.module.css';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxLen?: number;
  placeholder?: string;
};

export function TagsInput({
  value,
  onChange,
  max = 15,
  maxLen = 20,
  placeholder = '태그 입력 후 Enter — 예: NVDA, AI반도체',
}: Props) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const next = raw.trim().replace(/^#/, '');
    if (!next) return;
    if (next.length > maxLen) return;
    if (value.includes(next)) {
      setDraft('');
      return;
    }
    if (value.length >= max) return;
    onChange([...value, next]);
    setDraft('');
  };

  const remove = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      commit(draft);
      return;
    }
    if (e.key === 'Backspace' && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.field}>
        {value.map(t => (
          <span key={t} className={styles.chip}>
            <span className={styles.chipHash}>#</span>
            {t}
            <button
              type="button"
              className={styles.chipRemove}
              onClick={() => remove(t)}
              aria-label={`${t} 태그 제거`}
            >
              ×
            </button>
          </span>
        ))}
        {value.length < max && (
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => commit(draft)}
            placeholder={value.length === 0 ? placeholder : ''}
            className={styles.input}
            maxLength={maxLen}
          />
        )}
      </div>
      <div className={styles.hint}>
        {value.length}/{max} · 개당 최대 {maxLen}자 · Enter·쉼표·스페이스로 추가
      </div>
    </div>
  );
}
