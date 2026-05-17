'use client';

/**
 * 글 템플릿 선택 — 빈 페이지 공포 제거.
 *
 * - 시스템 템플릿 (종목분석/ETF리뷰/시황/포트폴리오/백테스트) + 본인 저장 템플릿
 * - "빈 페이지에서 시작" 옵션 포함
 * - 선택 시 onPick(template | null) 콜백
 */

import type { PostTemplate } from '@/lib/creatorTemplatesTypes';
import { KIND_LABELS } from '@/lib/creatorTemplatesTypes';
import styles from './TemplatePicker.module.css';

export function TemplatePicker({
  templates,
  onPick,
  onSkip,
}: {
  templates: PostTemplate[];
  onPick: (t: PostTemplate) => void;
  onSkip: () => void;
}) {
  const system = templates.filter(t => t.is_system);
  const mine = templates.filter(t => !t.is_system);

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h2>어떤 글을 쓸까요?</h2>
        <p>템플릿으로 시작하면 빈 페이지 공포 없이 빠르게 박을 수 있어요.</p>
      </header>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기본 템플릿</h3>
        <div className={styles.grid}>
          {system.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onPick(t)}
              className={styles.card}
            >
              <span className={styles.cardEmoji}>{t.emoji || '📝'}</span>
              <strong>{t.name}</strong>
              <span className={styles.cardDesc}>{t.description}</span>
              <span className={styles.cardKind}>{KIND_LABELS[t.kind]}</span>
            </button>
          ))}
        </div>
      </section>

      {mine.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>내 템플릿</h3>
          <div className={styles.grid}>
            {mine.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(t)}
                className={`${styles.card} ${styles.cardMine}`}
              >
                <span className={styles.cardEmoji}>{t.emoji || '🗂️'}</span>
                <strong>{t.name}</strong>
                <span className={styles.cardDesc}>{t.description}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className={styles.skipRow}>
        <button type="button" onClick={onSkip} className={styles.skipBtn}>
          빈 페이지에서 시작 →
        </button>
      </div>
    </div>
  );
}
