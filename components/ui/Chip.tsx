import Link from 'next/link';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import styles from './Chip.module.css';

type Size = 'sm' | 'md' | 'lg';

type CommonProps = {
  children: ReactNode;
  active?: boolean;
  subtle?: boolean;
  size?: Size;
  className?: string;
};

type AsLink = CommonProps & { href: string; onClick?: never };
type AsButton = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & { href?: undefined };

export type ChipProps = AsLink | AsButton;

function cls(active: boolean, subtle: boolean, size: Size, extra?: string) {
  const sizeCls = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : '';
  return [styles.chip, active && styles.active, subtle && styles.subtle, sizeCls, extra].filter(Boolean).join(' ');
}

export function Chip(props: ChipProps) {
  const active = Boolean(props.active);
  const subtle = Boolean(props.subtle);
  const size: Size = props.size || 'md';

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={cls(active, subtle, size, props.className)}>
        {props.children}
      </Link>
    );
  }

  const { children, active: _a, subtle: _s, size: _z, className, ...rest } = props as AsButton;
  return (
    <button type="button" className={cls(active, subtle, size, className)} {...rest}>
      {children}
    </button>
  );
}
