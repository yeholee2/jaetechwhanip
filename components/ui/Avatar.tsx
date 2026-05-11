import styles from './Avatar.module.css';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export function Avatar({
  src,
  name,
  emoji,
  size = 'md',
  bordered = false,
  className,
}: {
  src?: string | null;
  name?: string;
  emoji?: string;
  size?: Size;
  bordered?: boolean;
  className?: string;
}) {
  const initial = (name?.[0] || '').toUpperCase() || 'U';
  const cls = [styles.avatar, styles[size], bordered && styles.bordered, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} aria-label={name || ''}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : emoji ? (
        emoji
      ) : (
        initial
      )}
    </span>
  );
}
