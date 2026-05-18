/**
 * 52주(또는 일중) 범위 range bar — Toss증권 패턴.
 *
 * 좌 = low, 우 = high, 가운데 = current 위치 점.
 * 범위 안에서 현재가가 어디 있는지 한눈에.
 */
import styles from './RangeBar.module.css';

type Props = {
  label: string;            // 예: '52주 범위'
  low: number;
  high: number;
  current: number;
  /** 숫자 포맷터 (기본: 천 단위 구분 + 원) */
  formatter?: (n: number) => string;
};

export function RangeBar({ label, low, high, current, formatter }: Props) {
  if (!Number.isFinite(low) || !Number.isFinite(high) || !Number.isFinite(current)) return null;
  if (high <= low) return null;

  const fmt = formatter || ((n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`);
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.current}>{fmt(current)}</span>
      </div>
      <div className={styles.barWrap}>
        <span className={styles.low}>{fmt(low)}</span>
        <div className={styles.bar} aria-hidden="true">
          <div className={styles.barFill} style={{ width: `${pct}%` }} />
          <div className={styles.dot} style={{ left: `${pct}%` }} />
        </div>
        <span className={styles.high}>{fmt(high)}</span>
      </div>
    </div>
  );
}
