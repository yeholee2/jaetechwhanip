import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skel.Line w={140} h={26} />
      <Skel.Line w={240} h={13} />

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
        {/* 좌측 미니캘 */}
        <div style={{ padding: 16, background: 'var(--rw-card, #fff)', border: '1px solid var(--rw-border, #e5e8eb)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skel.Line w="50%" h={14} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginTop: 6 }}>
            {Array.from({ length: 35 }).map((_, i) => <Skel.Box key={i} w="100%" h={28} radius={6} />)}
          </div>
          {/* AI 요약 */}
          <div style={{ marginTop: 12, padding: 12, background: 'var(--rw-primary-bg, rgba(49,130,246,0.06))', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel.Line w="40%" h={12} />
            <Skel.Line w="95%" />
            <Skel.Line w="80%" />
          </div>
        </div>

        {/* 우측 메인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* filter bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: 'var(--rw-card, #fff)', border: '1px solid var(--rw-border, #e5e8eb)', borderRadius: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Skel.Box w={150} h={30} radius={999} />
              <Skel.Box w={150} h={30} radius={999} />
            </div>
            <Skel.Box w={90} h={30} radius={8} />
          </div>

          {/* week heads + days */}
          {[0,1].map(w => (
            <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skel.Line w={80} h={16} />
              {[0,1,2,3,4].map(d => (
                <div key={d} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 12, padding: '8px 0' }}>
                  <Skel.Line w={40} h={14} />
                  <Skel.Box w="100%" h={48} radius={10} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
