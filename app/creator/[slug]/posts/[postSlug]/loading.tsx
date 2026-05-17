/**
 * 크리에이터 글 로딩 스켈레톤 — 커버 + 제목 + 본문 단락.
 */
import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
      <Skel.Line w={120} h={14} />
      <Skel.Box w="100%" h={320} radius={12} />
      <div style={{ marginTop: 20 }}>
        <Skel.Line w="85%" h={28} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Skel.Line w={80} h={14} />
          <Skel.Line w={6} h={14} />
          <Skel.Line w={100} h={14} />
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skel.Line w="100%" />
        <Skel.Line w="95%" />
        <Skel.Line w="98%" />
        <Skel.Line w="60%" />
        <Skel.Box w="100%" h={180} radius={10} />
        <Skel.Line w="100%" />
        <Skel.Line w="92%" />
        <Skel.Line w="88%" />
      </div>
    </div>
  );
}
