type FaIconVariant = 'solid' | 'regular' | 'brands';

type FaIconProps = {
  name: string;
  variant?: FaIconVariant;
  className?: string;
  size?: number;
  color?: string;
};

export function FaIcon({
  name,
  variant = 'solid',
  className = '',
  size,
  color,
}: FaIconProps) {
  const prefix = variant === 'brands'
    ? 'fa-brands'
    : variant === 'regular'
      ? 'fa-regular'
      : 'fa-solid';
  const style = size || color ? { fontSize: size, color } : undefined;

  return (
    <i
      className={`${prefix} fa-${name}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={style}
    />
  );
}
