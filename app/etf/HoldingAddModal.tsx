'use client';

/**
 * 보유 ETF 추가 모달.
 * ETF 자동완성(etfs.ts) + 수량/평단/계좌라벨 입력.
 */
import { useMemo, useState } from 'react';
import { etfs, type EtfInfo } from '@/lib/etfs';
import { addHolding, type UserEtfHolding } from '@/lib/etfPortfolio';
import styles from './HoldingAddModal.module.css';

type Props = {
  onClose: () => void;
  onAdded: (row: UserEtfHolding) => void;
  /** DB 전체 ETF — 없으면 정적 샘플 5개 fallback */
  candidates?: EtfInfo[];
};

const ACCOUNT_LABELS = ['일반', 'ISA', '연금저축', 'IRP'] as const;

export function HoldingAddModal({ onClose, onAdded, candidates }: Props) {
  const pool = candidates ?? etfs;
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<{ code: string; name: string } | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [account, setAccount] = useState<string>('일반');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.code.includes(q) ||
        e.shortName.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [search, pool]);

  const submit = async () => {
    setError('');
    if (!picked) return setError('ETF를 선택해 주세요.');
    const qty = parseFloat(quantity);
    const avg = parseFloat(avgPrice.replace(/,/g, ''));
    if (!qty || qty <= 0) return setError('수량을 입력해 주세요.');
    if (!avg || avg <= 0) return setError('평단을 입력해 주세요.');
    setSubmitting(true);
    const row = await addHolding({
      etf_code: picked.code,
      etf_name: picked.name,
      quantity: qty,
      avg_price: avg,
      account_label: account,
    });
    setSubmitting(false);
    if (row) {
      onAdded(row);
    } else {
      setError('저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="ETF 추가">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <header className={styles.head}>
          <strong>보유 ETF 추가</strong>
          <button type="button" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className={styles.body}>
          {!picked ? (
            <>
              <label className={styles.field}>
                <span>ETF 검색</span>
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이름, 코드 (예: 360750, S&P500)"
                />
              </label>
              {suggestions.length > 0 && (
                <ul className={styles.suggestions}>
                  {suggestions.map(s => (
                    <li key={s.code}>
                      <button
                        type="button"
                        onClick={() => {
                          setPicked({ code: s.code, name: s.shortName });
                          setSearch('');
                        }}
                      >
                        <strong>{s.shortName}</strong>
                        <span>{s.code} · {s.theme}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {search.trim() && suggestions.length === 0 && (
                <p className={styles.noResult}>
                  검색 결과가 없어요. 코드를 정확히 입력하거나 다른 키워드를 시도해 주세요.
                </p>
              )}
            </>
          ) : (
            <>
              <div className={styles.pickedRow}>
                <div>
                  <strong>{picked.name}</strong>
                  <span>{picked.code}</span>
                </div>
                <button type="button" className={styles.changeBtn} onClick={() => setPicked(null)}>
                  변경
                </button>
              </div>

              <label className={styles.field}>
                <span>수량 (주)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="예: 100"
                />
              </label>

              <label className={styles.field}>
                <span>평균 매입가 (원)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={avgPrice}
                  onChange={e => setAvgPrice(e.target.value)}
                  placeholder="예: 19,500"
                />
              </label>

              <div className={styles.field}>
                <span>계좌</span>
                <div className={styles.accountRow}>
                  {ACCOUNT_LABELS.map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`${styles.accountChip} ${account === a ? styles.accountChipActive : ''}`}
                      onClick={() => setAccount(a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}
            </>
          )}
        </div>

        <footer className={styles.foot}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            disabled={!picked || submitting}
            onClick={submit}
          >
            {submitting ? '저장 중…' : '추가'}
          </button>
        </footer>
      </div>
    </div>
  );
}
