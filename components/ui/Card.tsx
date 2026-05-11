import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './Card.module.css';

type CardPad = 'sm' | 'md' | 'lg';

export function Card({
  children,
  pad = 'lg',
  muted = false,
  flush = false,
  className,
  href,
  as: As = 'section',
}: {
  children: ReactNode;
  pad?: CardPad;
  muted?: boolean;
  flush?: boolean;
  className?: string;
  href?: string;
  as?: 'section' | 'article' | 'div';
}) {
  const padCls = pad === 'sm' ? styles.padSm : pad === 'md' ? styles.padMd : styles.padLg;
  const cls = [styles.card, padCls, muted && styles.muted, flush && styles.flush, className]
    .filter(Boolean)
    .join(' ');

  if (href) {
    return (
      <Link href={href} className={`${cls} ${styles.cardInteractive}`}>
        {children}
      </Link>
    );
  }

  return <As className={cls}>{children}</As>;
}

export function CardHead({ label, right }: { label: ReactNode; right?: ReactNode }) {
  return (
    <header className={styles.head}>
      <span className={styles.headLabel}>{label}</span>
      {right && <span className={styles.headRight}>{right}</span>}
    </header>
  );
}
