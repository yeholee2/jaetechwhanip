'use client';

/**
 * 가격 알림 추가 모달.
 * ETF 상세 페이지의 '알림 추가' 버튼에서 호출.
 *
 * 조건 4개:
 * - 가격이 N원 위로 (price_above)
 * - 가격이 N원 아래로 (price_below)
 * - 일일 등락률 +N% 이상 (change_above_pct)
 * - 일일 등락률 -N% 이하 (change_below_pct)
 */

import { useState } from 'react';
import { Button } from '@/components/ui';
import { createAlert, type AlertCondition } from '@/lib/alerts';
import styles from './AlertModal.module.css';

type Props = {
  etfCode: string;
  etfName: string;
  currentPrice?: string;
  onClose: () => void;
  onCreated?: () => void;
};

const CONDS: { key: AlertCondition; title: string; suffix: string; placeholder: string }[] = [
  { key: 'price_above',      title: '가격 상승 알림', suffix: '원 이상', placeholder: '예: 25000' },
  { key: 'price_below',      title: '가격 하락 알림', suffix: '원 이하', placeholder: '예: 18000' },
  { key: 'change_above_pct', title: '급등 알림',       suffix: '% 이상', placeholder: '예: 3' },
  { key: 'change_below_pct', title: '급락 알림',       suffix: '% 이하', placeholder: '예: -3' },
];

export function AlertModal({ etfCode, etfName, currentPrice, onClose, onCreated }: Props) {
  const [cond, setCond] = useState<AlertCondition>('price_above');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selected = CONDS.find(c => c.key === cond)!;

  const submit = async () => {
    setError('');
    const num = parseFloat(value.replace(/,/g, ''));
    if (!Number.isFinite(num)) {
      setError('숫자를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    const row = await createAlert({
      etf_code: etfCode,
      etf_name: etfName,
      condition: cond,
      threshold: num,
    });
    setSubmitting(false);
    if (!row) {
      setError('알림 등록에 실패했어요. 로그인 상태를 확인해주세요.');
      return;
    }
    onCreated?.();
    onClose();
  };

  const isPriceCond = cond === 'price_above' || cond === 'price_below';

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <h3>가격 알림 추가</h3>
          <button className={styles.close} onClick={onClose} aria-label="닫기">×</button>
        </div>
        <div className={styles.body}>
          <div className={styles.field}>
            <span className={styles.label}>{etfName} ({etfCode})</span>
            {currentPrice && (
              <span style={{ fontSize: 12, color: 'var(--rw-text-muted)' }}>
                현재가 {currentPrice}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>알림 종류</span>
            <div className={styles.condGrid}>
              {CONDS.map(c => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.condBtn} ${c.key === cond ? styles.condBtnOn : ''}`}
                  onClick={() => setCond(c.key)}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>
              {isPriceCond ? '알림 가격' : '등락률 기준 (%)'}
            </span>
            <input
              type="text"
              inputMode="decimal"
              className={styles.input}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={selected.placeholder}
              disabled={submitting}
            />
          </div>

          {value && Number.isFinite(parseFloat(value.replace(/,/g, ''))) && (
            <div className={styles.preview}>
              {etfName} <strong>
                {parseFloat(value.replace(/,/g, '')).toLocaleString('ko-KR')}{selected.suffix}
              </strong> 도달 시 알림을 보내드릴게요.
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.footer}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
          <Button variant="primary" size="sm" onClick={submit} disabled={submitting || !value}>
            {submitting ? '등록 중…' : '알림 추가'}
          </Button>
        </div>
      </div>
    </div>
  );
}
