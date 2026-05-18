/**
 * <Stat> — 큰 숫자 + 변화 표시 (Toss 스타일).
 *
 * 사용:
 *   <Stat label="현재가" value="API 시세" delta="+0.00%" tone="up" size="lg" />
 *   <Stat label="평가액" value={formatKRW(value)} foot="시세 기준" size="md" />
 */

import styles from './Stat.module.css';

type StatSize = 'sm' | 'md' | 'lg' | 'xl';
type Tone = 'up' | 'down' | 'flat';

type Props = {
  label?: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  tone?: Tone;
  size?: StatSize;
  foot?: React.ReactNode;
  className?: string;
};

const SIZE_CLASS: Record<StatSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
  xl: styles.sizeXl,
};

export function Stat({ label, value, delta, tone = 'flat', size = 'lg', foot, className }: Props) {
  return (
    <div className={`${styles.wrap} ${className || ''}`}>
      {label && <span className={styles.label}>{label}</span>}
      <div className={styles.row}>
        <span className={`${styles.value} ${SIZE_CLASS[size]}`}>{value}</span>
        {delta && <span className={`${styles.delta} ${styles[tone]}`}>{delta}</span>}
      </div>
      {foot && <span className={styles.foot}>{foot}</span>}
    </div>
  );
}
