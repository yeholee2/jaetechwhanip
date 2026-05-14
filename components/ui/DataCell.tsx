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
import { Tooltip } from './Tooltip';

type Tone = 'default' | 'good' | 'warn' | 'info';

type Props = {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  className?: string;
  /** 라벨 옆 i 아이콘에 띄울 툴팁 본문 */
  help?: React.ReactNode;
};

const TONE_CLASS: Record<Tone, string> = {
  default: '',
  good: styles.toneGood,
  warn: styles.toneWarn,
  info: styles.toneInfo,
};

function DataCellRoot({ label, value, sub, tone = 'default', className, help }: Props) {
  return (
    <div className={`${styles.cell} ${className || ''}`}>
      <span className={styles.label}>
        {label}
        {help && (
          <Tooltip
            label={typeof label === 'string' ? label : '도움말'}
            title={typeof label === 'string' ? label : undefined}
          >
            {help}
          </Tooltip>
        )}
      </span>
      <span className={`${styles.value} ${TONE_CLASS[tone]}`}>{value}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  );
}

function Grid({ children, columns = 4 }: { children: React.ReactNode; columns?: 2 | 3 | 4 | 5 }) {
  return (
    <div
      className={styles.grid}
      style={{ '--grid-cols': columns } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export const DataCell = Object.assign(DataCellRoot, { Grid });
