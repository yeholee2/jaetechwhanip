import { ImageResponse } from 'next/og';
import { getEtfBySlug } from '@/lib/etfs';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '재테크한입 — ETF 정보';

export default async function Image({ params }: { params: { slug: string } }) {
  const etf = getEtfBySlug(params.slug);

  if (!etf) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#f6f7f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            color: '#333d4b',
            fontFamily: 'sans-serif',
          }}
        >
          재테크한입
        </div>
      ),
      { ...size },
    );
  }

  const changeColor = etf.changeTone === 'down' ? '#3182f6' : '#e42939';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f6f7f8 0%, #ffffff 60%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* 상단 brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            fontWeight: 800,
            color: '#3182f6',
            marginBottom: 40,
          }}
        >
          <span style={{ display: 'flex' }}>재테크</span>
          <span style={{ color: '#191f28' }}>한입</span>
        </div>

        {/* 코드 + 카테고리 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '8px 20px',
              background: '#f2f4f6',
              borderRadius: 999,
              fontSize: 24,
              fontWeight: 800,
              color: '#4e5968',
            }}
          >
            {etf.code}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: '#8b95a1', fontWeight: 700 }}>
            {etf.issuer} · {etf.category}
          </div>
        </div>

        {/* ETF 이름 */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 900,
            color: '#191f28',
            lineHeight: 1.1,
            marginBottom: 32,
            maxWidth: 1040,
          }}
        >
          {etf.name}
        </div>

        {/* 가격 + 변동 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 20,
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 900, color: '#191f28' }}>
            {etf.price}
          </div>
          <div style={{ display: 'flex', fontSize: 32, fontWeight: 800, color: changeColor }}>
            {etf.change}
          </div>
        </div>

        {/* 한입 요약 */}
        <div
          style={{
            display: 'flex',
            padding: '24px 28px',
            background: '#ffffff',
            border: '1px solid #e5e8eb',
            borderRadius: 16,
            fontSize: 24,
            color: '#4e5968',
            fontWeight: 600,
            lineHeight: 1.5,
            maxWidth: 1040,
          }}
        >
          {etf.oneLine || etf.summary}
        </div>

        {/* 하단 메타 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginTop: 'auto',
            fontSize: 22,
            color: '#8b95a1',
            fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex' }}>총보수 {etf.fee}</div>
          <div style={{ display: 'flex' }}>·</div>
          <div style={{ display: 'flex' }}>순자산 {etf.aum}</div>
          <div style={{ display: 'flex' }}>·</div>
          <div style={{ display: 'flex' }}>{etf.distribution}</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
