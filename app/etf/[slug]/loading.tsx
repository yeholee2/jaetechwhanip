/**
 * ETF 상세 로딩 스켈레톤 — header + price + chart + sections.
 */
import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* breadcrumb */}
      <Skel.Line w={140} h={14} />

      {/* header — 로고 + 코드 + 가격 */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Skel.Circle size={56} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel.Line w="40%" h={22} />
          <Skel.Line w="25%" h={14} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <Skel.Line w={120} h={26} />
          <Skel.Line w={90} h={14} />
        </div>
      </div>

      {/* 차트 */}
      <Skel.Box w="100%" h={380} radius={12} />

      {/* 기간 탭 */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[0,1,2,3,4].map(i => <Skel.Box key={i} w={48} h={28} radius={6} />)}
      </div>

      {/* 핵심 지표 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ padding: 14, background: 'var(--rw-card-muted, #F9FAFB)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel.Line w="70%" h={12} />
            <Skel.Line w="50%" h={18} />
          </div>
        ))}
      </div>

      {/* 구성 종목 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skel.Line w={120} h={18} />
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottom: '1px solid var(--rw-hairline, rgba(0,27,55,0.06))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skel.Circle size={28} />
              <Skel.Line w={140} h={14} />
            </div>
            <Skel.Line w={50} h={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
