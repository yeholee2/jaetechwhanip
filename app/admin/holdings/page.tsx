import Link from 'next/link';
import { HoldingsUploadClient } from './HoldingsUploadClient';

export const dynamic = 'force-dynamic';

export default function AdminHoldingsPage() {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>ETF 보유종목 채우기</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--rw-text-muted)' }}>
          한국 ETF 처럼 자동 소스가 없는 종목은 운용사 공시(CSV)를 붙여넣어 채워요.
          미국 ETF 는 Yahoo 에서 자동 채우므로 보통 필요 없어요.
        </p>
        <Link href="/admin" style={{ fontSize: 12, fontWeight: 700, color: 'var(--rw-primary)' }}>← 어드민 홈</Link>
      </div>
      <HoldingsUploadClient />
    </>
  );
}
