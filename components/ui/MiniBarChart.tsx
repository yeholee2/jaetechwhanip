/**
 * 토스 스타일 mini bar chart.
 * 분배금 히스토리, 월별 거래량 등 짧은 시계열 가벼운 표시용.
 */

import styles from './MiniBarChart.module.css';

export type BarPoint = {
  label: string;   // x축 라벨 ('25Q1', '4월' 등)
  value: number;   // 막대 값
  tooltip?: string; // 호버 시 보일 텍스트
};

type Props = {
  label: string;
  caption?: string;
  data: BarPoint[];
  unit?: string;
  formatValue?: (n: number) => string;
  /** 합계/평균 등 하단 요약 */
  summary?: { label: string; value: string }[];
};

export function MiniBarChart({ label, caption, data, unit = '원', formatValue, summary }: Props) {
  if (!data.length) return null;
  const fmt = formatValue || ((n: number) => `${n.toLocaleString()}${unit}`);
  const max = Math.max(...data.map(d => d.value), 1);
  const latestIdx = data.length - 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        {caption && <span className={styles.sub}>{caption}</span>}
      </div>

      <div className={styles.chart} role="img" aria-label={`${label} 막대 차트`}>
        {data.map((d, idx) => {
          const h = Math.max(4, (d.value / max) * 100);
          return (
            <div key={`${d.label}-${idx}`} className={styles.col}>
              <span
                className={`${styles.bar} ${idx === latestIdx ? styles.barLatest : ''}`}
                style={{ height: `${h}%` }}
                title={d.tooltip || `${d.label} ${fmt(d.value)}`}
                aria-label={`${d.label} ${fmt(d.value)}`}
              />
              <span className={styles.tick}>{d.label}</span>
            </div>
          );
        })}
      </div>

      {summary && summary.length > 0 && (
        <div className={styles.summary}>
          {summary.map(s => (
            <span key={s.label}>
              {s.label}<strong>{s.value}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
