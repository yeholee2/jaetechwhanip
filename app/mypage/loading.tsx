import { Skel } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* profile card */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, background: 'var(--rw-card, #fff)', border: '1px solid var(--rw-border, #e5e8eb)', borderRadius: 14 }}>
        <Skel.Circle size={64} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skel.Line w="35%" h={18} />
          <Skel.Line w="60%" h={13} />
        </div>
        <Skel.Box w={70} h={32} radius={8} />
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ padding: 14, background: 'var(--rw-card-muted, #F9FAFB)', borderRadius: 10 }}>
            <Skel.Line w="50%" h={12} />
            <div style={{ height: 6 }} />
            <Skel.Line w="70%" h={20} />
          </div>
        ))}
      </div>

      {/* sections */}
      {[0,1].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Skel.Line w={140} h={18} />
          {[0,1,2].map(j => <Skel.Box key={j} w="100%" h={56} radius={10} />)}
        </div>
      ))}
    </div>
  );
}
