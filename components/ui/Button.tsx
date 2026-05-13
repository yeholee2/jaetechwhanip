import Link from 'next/link';
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: undefined;
};

type ButtonAsLink = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  external?: boolean;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function classes(variant: ButtonVariant, size: ButtonSize, block: boolean, extra?: string) {
  return [styles.btn, styles[variant], styles[size], block && styles.block, extra]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps) {
  const variant: ButtonVariant = props.variant || 'primary';
  const size: ButtonSize = props.size || 'md';
  const block = Boolean(props.block);

  if ('href' in props && props.href) {
    const { href, external, className, children, variant: _v, size: _s, block: _b, ...rest } = props;
    const cls = classes(variant, size, block, className);
    if (external) {
      return (
        <a href={href} className={cls} target="_blank" rel="noopener noreferrer" {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...rest as any}>
        {children}
      </Link>
    );
  }

  const { className, children, variant: _v, size: _s, block: _b, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes(variant, size, block, className)} {...rest}>
      {children}
    </button>
  );
}
