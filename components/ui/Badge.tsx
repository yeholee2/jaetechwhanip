import type { ReactNode } from 'react';
import styles from './Badge.module.css';

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'purple'
  | 'orange'
  | 'fresh';

export function Badge({
  tone = 'neutral',
  pill = false,
  solid = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  pill?: boolean;
  solid?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = [styles.badge, styles[tone], pill && styles.pill, solid && styles.solid, className]
    .filter(Boolean)
    .join(' ');
  return <span className={cls}>{children}</span>;
}
