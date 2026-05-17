/**
 * Root loading — App Router 가 라우트 전환 중 자동 렌더.
 * 페이지별 loading.tsx 가 있는 경우 그걸 우선 사용.
 */
import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skel.Line w="40%" h={28} />
      <Skel.Line w="70%" h={16} />
      <Skel.Box w="100%" h={200} radius={12} />
      <Skel.Stack gap={10}>
        <Skel.Line w="100%" />
        <Skel.Line w="95%" />
        <Skel.Line w="80%" />
        <Skel.Line w="90%" />
      </Skel.Stack>
    </div>
  );
}
