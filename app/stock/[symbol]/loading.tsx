import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Skel.Line w={140} h={14} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Skel.Circle size={48} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel.Line w="45%" h={22} />
          <Skel.Line w="25%" h={13} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <Skel.Line w={120} h={24} />
          <Skel.Line w={90} h={13} />
        </div>
      </div>

      <Skel.Box w="100%" h={380} radius={12} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ padding: 12, background: 'var(--rw-card-muted, #F9FAFB)', borderRadius: 10 }}>
            <Skel.Line w="60%" h={12} />
            <div style={{ height: 6 }} />
            <Skel.Line w="50%" h={18} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skel.Line w={140} h={18} />
        {[0,1,2].map(i => (
          <Skel.Box key={i} w="100%" h={56} radius={10} />
        ))}
      </div>
    </div>
  );
}
