/**
 * 토스 스타일 위험 등급 메터 + 투자 포인트 카드.
 *
 * 1~5 단계 dot 시각화 + 톤 색상 + 이유 chip + 포인트 불릿.
 */

import styles from './RiskMeter.module.css';

type Point = { text: string; tone: 'good' | 'neutral' | 'warn' };

type Props = {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  tone: 'good' | 'neutral' | 'warn';
  reasons: string[];
  points: Point[];
};

const TONE_COLOR: Record<Props['tone'], string> = {
  good: 'var(--rw-green50)',
  neutral: 'var(--rw-text-muted)',
  warn: 'var(--rw-red60)',
};

const POINT_ICON: Record<Point['tone'], { ch: string; bg: string }> = {
  good: { ch: '✓', bg: 'var(--rw-green50)' },
  neutral: { ch: 'i', bg: 'var(--rw-text-muted)' },
  warn: { ch: '!', bg: 'var(--rw-red60)' },
};

export function RiskMeter({ level, label, tone, reasons, points }: Props) {
  const toneColor = TONE_COLOR[tone];

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>위험 등급</span>
        <span className={styles.value} style={{ color: toneColor }}>
          {label} <span style={{ color: 'var(--rw-text-muted)', fontWeight: 600 }}>· {level}/5</span>
        </span>
      </div>

      <div className={styles.dots} aria-label={`위험도 ${level} / 5`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            className={`${styles.dot} ${i <= level ? styles.dotOn : ''}`}
            style={i <= level ? { background: toneColor } : undefined}
          />
        ))}
      </div>

      {reasons.length > 0 && (
        <div className={styles.reasons}>
          {reasons.map(r => (
            <span key={r} className={styles.reasonChip}>{r}</span>
          ))}
        </div>
      )}

      {points.length > 0 && (
        <ul className={styles.points}>
          {points.map((p, idx) => {
            const ic = POINT_ICON[p.tone];
            return (
              <li key={idx} className={styles.point}>
                <span
                  className={styles.pointIcon}
                  style={{ background: ic.bg }}
                  aria-hidden="true"
                >
                  {ic.ch}
                </span>
                <span>{p.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
