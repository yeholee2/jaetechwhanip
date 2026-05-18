'use client';

/**
 * 보유 ETF 일괄 붙여넣기 모달.
 *
 * 사용자가 증권사 잔고를 텍스트로 복사해 붙여넣으면
 * 한 줄씩 ETF 이름·수량·평단을 파싱해 미리보기 → 일괄 등록.
 *
 * 예시 입력 (관대한 파서, 다양한 포맷 허용):
 *   TIGER 미국S&P500 10주 19000원
 *   KODEX 200, 30, 32500
 *   360750  5  20100
 */

import { useMemo, useState } from 'react';
import { getStaticEtfMetadata, type EtfInfo } from '@/lib/etfs';
import { addHolding, type UserEtfHolding } from '@/lib/etfPortfolio';
import { Button, Badge } from '@/components/ui';
import styles from './BulkPasteModal.module.css';

const staticEtfMetadata = getStaticEtfMetadata();

type Props = {
  onClose: () => void;
  onAdded: (rows: UserEtfHolding[]) => void;
  /** DB 전체 ETF — 없으면 정적 샘플 5개 fallback */
  candidates?: EtfInfo[];
};

type ParsedRow =
  | { ok: true; code: string; name: string; quantity: number; avgPrice: number; raw: string }
  | { ok: false; raw: string; reason: string };

function findEtf(query: string, pool: EtfInfo[]): { code: string; name: string } | null {
  const q = query.trim();
  if (!q) return null;
  // 1) code exact
  const byCode = pool.find(e => e.code === q);
  if (byCode) return { code: byCode.code, name: byCode.name };
  // 2) name contains
  const lower = q.toLowerCase();
  const byName = pool.find(e =>
    e.name.toLowerCase().includes(lower) ||
    e.shortName.toLowerCase().includes(lower)
  );
  if (byName) return { code: byName.code, name: byName.name };
  return null;
}

function parseLine(raw: string, pool: EtfInfo[]): ParsedRow {
  const line = raw.trim();
  if (!line) return { ok: false, raw, reason: '빈 줄' };
  // 숫자 토큰 추출
  const numbers = line.match(/[\d,]+(?:\.\d+)?/g) || [];
  if (numbers.length < 2) {
    return { ok: false, raw, reason: '수량/평단 인식 실패' };
  }
  // 마지막 두 숫자 → 평단 / 수량 (평단이 보통 더 큼)
  const n1 = parseFloat(numbers[numbers.length - 2].replace(/,/g, ''));
  const n2 = parseFloat(numbers[numbers.length - 1].replace(/,/g, ''));
  const [quantity, avgPrice] = n1 < n2 ? [n1, n2] : [n2, n1];
  if (!quantity || !avgPrice || quantity <= 0 || avgPrice <= 0) {
    return { ok: false, raw, reason: '수량/평단 인식 실패' };
  }
  // 숫자/구분자 제거한 텍스트 → ETF 검색용
  const nameQuery = line
    .replace(/[\d,]+(?:\.\d+)?\s*(주|원|krw)?/gi, ' ')
    .replace(/[,\t|]+/g, ' ')
    .trim();
  const etf = findEtf(nameQuery, pool);
  if (!etf) {
    return { ok: false, raw, reason: `'${nameQuery}' 매칭 실패` };
  }
  return { ok: true, code: etf.code, name: etf.name, quantity, avgPrice, raw };
}

export function BulkPasteModal({ onClose, onAdded, candidates }: Props) {
  const pool = candidates ?? staticEtfMetadata;
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo<ParsedRow[]>(() => {
    return text
      .split(/\r?\n/)
      .filter(l => l.trim())
      .map(line => parseLine(line, pool));
  }, [text, pool]);

  const validCount = parsed.filter(p => p.ok).length;
  const invalidCount = parsed.length - validCount;

  const submit = async () => {
    setError('');
    const valids = parsed.filter((p): p is Extract<ParsedRow, { ok: true }> => p.ok);
    if (valids.length === 0) {
      setError('인식된 줄이 없어요.');
      return;
    }
    setSubmitting(true);
    const added: UserEtfHolding[] = [];
    for (const v of valids) {
      const row = await addHolding({
        etf_code: v.code,
        etf_name: v.name,
        quantity: v.quantity,
        avg_price: v.avgPrice,
        account_label: '일반',
      });
      if (row) added.push(row);
    }
    setSubmitting(false);
    if (added.length === 0) {
      setError('등록에 실패했어요. 로그인 상태를 확인해주세요.');
      return;
    }
    onAdded(added);
    onClose();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <h3>한 번에 붙여넣기</h3>
          <button className={styles.close} onClick={onClose} aria-label="닫기">×</button>
        </div>

        <div className={styles.body}>
          <div className={styles.hint}>
            증권사 잔고를 한 줄씩 붙여넣으세요. 다양한 포맷을 인식합니다.<br />
            <code>TIGER 미국S&P500 10주 19000원</code><br />
            <code>KODEX 200, 30, 32500</code><br />
            <code>360750  5  20100</code>
          </div>

          <textarea
            className={styles.textarea}
            placeholder="한 줄에 한 종목씩 붙여넣으세요..."
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={submitting}
          />

          {parsed.length > 0 && (
            <div className={styles.preview}>
              {parsed.map((p, idx) => (
                <div
                  key={idx}
                  className={`${styles.row} ${p.ok ? styles.rowOk : styles.rowWarn}`}
                >
                  <div className={styles.rowMain}>
                    {p.ok ? (
                      <>
                        <strong>{p.name}</strong>
                        <span>{p.code} · {p.quantity}주 · 평단 {p.avgPrice.toLocaleString()}원</span>
                      </>
                    ) : (
                      <>
                        <strong style={{ color: 'var(--rw-red60)' }}>{p.raw}</strong>
                        <span>{p.reason}</span>
                      </>
                    )}
                  </div>
                  <div className={styles.rowMeta}>
                    <Badge tone={p.ok ? 'success' : 'fresh'}>
                      {p.ok ? '인식 OK' : '실패'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <span className={styles.summary}>
            {parsed.length > 0 && (
              <>인식 <strong>{validCount}</strong>건 · 실패 <strong>{invalidCount}</strong>건</>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={submit}
            disabled={submitting || validCount === 0}
          >
            {submitting ? '등록 중…' : `${validCount}개 등록`}
          </Button>
        </div>
      </div>
    </div>
  );
}
