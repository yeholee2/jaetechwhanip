/**
 * 크리에이터 페이지 로딩 스켈레톤 — hero + 액션 + 글 리스트 구조 매칭.
 */
import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
      {/* 커버 */}
      <Skel.Box w="100%" h={180} radius={16} />

      {/* 헤더: 아바타 + 이름 + 액션 */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginTop: -40, position: 'relative', zIndex: 2, padding: '0 8px' }}>
        <Skel.Circle size={88} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 44 }}>
          <Skel.Line w="40%" h={22} />
          <Skel.Line w="70%" h={14} />
          <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
            <Skel.Line w={70} h={14} />
            <Skel.Line w={70} h={14} />
            <Skel.Line w={70} h={14} />
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <Skel.Box w={110} h={40} radius={10} />
        <Skel.Box w={130} h={40} radius={10} />
      </div>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, borderBottom: '1px solid var(--rw-hairline, rgba(0,27,55,0.1))', paddingBottom: 8 }}>
        <Skel.Line w={48} h={18} />
        <Skel.Line w={56} h={18} />
        <Skel.Line w={60} h={18} />
        <Skel.Line w={60} h={18} />
      </div>

      {/* 글 카드 3개 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--rw-card-muted, #F9FAFB)', borderRadius: 12 }}>
            <Skel.Box w={120} h={68} radius={8} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skel.Line w="80%" h={16} />
              <Skel.Line w="100%" h={12} />
              <Skel.Line w="60%" h={12} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
