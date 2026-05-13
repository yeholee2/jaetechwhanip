/**
 * <DataCell> — 통일된 정보 셀.
 *
 * 사용:
 *   <DataCell label="총보수" value="0.07%" sub="동종 평균보다 낮음" tone="good" />
 *
 * <DataCell.Grid> 로 감싸면 자동 반응형 4열 그리드:
 *   <DataCell.Grid>
 *     <DataCell ... />
 *     <DataCell ... />
 *   </DataCell.Grid>
 */

import styles from './DataCell.module.css';

type Tone = 'default' | 'good' | 'warn' | 'info';

type Props = {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  className?: string;
};

const TONE_CLASS: Record<Tone, string> = {
  default: '',
  good: styles.toneGood,
  warn: styles.toneWarn,
  info: styles.toneInfo,
};

function DataCellRoot({ label, value, sub, tone = 'default', className }: Props) {
  return (
    <div className={`${styles.cell} ${className || ''}`}>
      <span className={styles.label}>{label}</span>
      <span className={`${styles.value} ${TONE_CLASS[tone]}`}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}

function Grid({ children, columns = 4 }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 'var(--space-2)',
      }}
    >
      {children}
    </div>
  );
}

export const DataCell = Object.assign(DataCellRoot, { Grid });
