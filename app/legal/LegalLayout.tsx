import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Legal.module.css';

export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className={styles.wrap}>
      <nav className={styles.nav}>
        <Link href="/legal/terms" className={styles.navItem}>이용약관</Link>
        <Link href="/legal/privacy" className={styles.navItem}>개인정보처리방침</Link>
        <Link href="/legal/refund" className={styles.navItem}>환불 정책</Link>
      </nav>

      <header className={styles.head}>
        <h1>{title}</h1>
        <p className={styles.updated}>최종 업데이트: {updatedAt}</p>
      </header>

      <article className={styles.content}>
        {children}
      </article>
    </main>
  );
}
