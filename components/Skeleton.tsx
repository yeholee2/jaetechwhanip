/**
 * Skeleton 빌딩 블록 — shimmer 애니메이션 포함.
 *
 * 사용:
 *   <Skel.Box w={120} h={20} />
 *   <Skel.Circle size={48} />
 *   <Skel.Line w="60%" />
 *   <Skel.Stack gap={10}>{...}</Skel.Stack>
 */

import styles from './Skeleton.module.css';

type Dim = number | string;
const px = (v: Dim | undefined) => (typeof v === 'number' ? `${v}px` : v);

function Box({
  w,
  h,
  radius,
  className = '',
}: {
  w?: Dim;
  h?: Dim;
  radius?: Dim;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`${styles.skel} ${className}`}
      style={{
        width: px(w),
        height: px(h),
        borderRadius: px(radius) ?? '6px',
      }}
    />
  );
}

function Circle({ size = 32, className = '' }: { size?: Dim; className?: string }) {
  return (
    <span
      aria-hidden
      className={`${styles.skel} ${className}`}
      style={{ width: px(size), height: px(size), borderRadius: '50%' }}
    />
  );
}

function Line({
  w = '100%',
  h = 12,
  className = '',
}: {
  w?: Dim;
  h?: Dim;
  className?: string;
}) {
  return <Box w={w} h={h} radius={4} className={className} />;
}

function Stack({
  children,
  gap = 8,
  className = '',
}: {
  children: React.ReactNode;
  gap?: number;
  className?: string;
}) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap }}>
      {children}
    </div>
  );
}

export const Skel = { Box, Circle, Line, Stack };
