import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Page.module.css';

/**
 * 페이지 hero — 진입 영역의 제목·서브·우측 액션.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  aside,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroBody}>
        {eyebrow && <span className={styles.heroEyebrow}>{eyebrow}</span>}
        <h1 className={styles.heroTitle}>{title}</h1>
        {lead && <p className={styles.heroLead}>{lead}</p>}
      </div>
      {aside && <div className={styles.heroAside}>{aside}</div>}
    </header>
  );
}

/**
 * 섹션 — title (h2) + 우측 메타(개수/링크) + body.
 */
export function Section({
  title,
  sub,
  link,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  link?: { href: string; label: ReactNode };
  /** 헤더 우측 영역 — sub/link보다 우선 (예: admin 액션 버튼) */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={[styles.section, className].filter(Boolean).join(' ')}>
      {(title || sub || link || actions) && (
        <div className={styles.sectionHead}>
          {title && <h2 className={styles.sectionTitle}>{title}</h2>}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
            {sub && <span className={styles.sectionSub}>{sub}</span>}
            {link && (
              <Link href={link.href} className={styles.sectionLink}>
                {link.label}
              </Link>
            )}
            {actions}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
