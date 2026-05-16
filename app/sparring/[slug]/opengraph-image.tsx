/**
 * 스파링 동적 OG 이미지 — 카톡·X·스레드 공유용.
 *
 * 카드 구조:
 *  - 좌측: side A 라벨 + 투표 비율
 *  - 우측: side B 라벨 + 투표 비율
 *  - 중앙: VS 큰 글자
 *  - 상단: 라운드·총 투표수·D-day
 *  - 하단: 스파링 제목 + 브랜드 워터마크
 *
 * 진행중/마감 상태에 따라 톤 살짝 다름.
 */
import { ImageResponse } from 'next/og';
import { getSparringBySlug } from '@/lib/sparring';

export const runtime = 'nodejs';
export const alt = '스파링 — ETF한입';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { slug: string } }) {
  const { sparring } = await getSparringBySlug(decodeURIComponent(params.slug));
  if (!sparring) return fallbackImage('스파링을 찾을 수 없어요');

  const a = sparring.stats.votes_a || 0;
  const b = sparring.stats.votes_b || 0;
  const total = a + b;
  const pctA = total > 0 ? Math.round((a / total) * 100) : 50;
  const pctB = 100 - pctA;

  const deadline = new Date(sparring.deadline_at).getTime();
  const now = Date.now();
  const ended = deadline <= now;
  const daysLeft = Math.max(0, Math.ceil((deadline - now) / 86_400_000));

  const aWin = pctA > pctB;
  const tied = pctA === pctB;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0F1A2D 0%, #15294A 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          padding: '48px 56px',
        }}
      >
        {/* 상단 메타 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 20,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span
              style={{
                padding: '8px 16px',
                background: 'rgba(49,130,246,0.18)',
                borderRadius: 999,
                color: '#7AB1FF',
                fontWeight: 900,
                fontSize: 18,
                letterSpacing: 0.5,
              }}
            >
              ⚔️ 스파링 라운드 {sparring.round_number}
            </span>
            <span>{total.toLocaleString('ko-KR')}명 투표 중</span>
          </div>
          <div
            style={{
              padding: '8px 18px',
              background: ended ? 'rgba(255,255,255,0.12)' : '#E42939',
              borderRadius: 12,
              fontSize: 20,
              fontWeight: 900,
              letterSpacing: -0.5,
            }}
          >
            {ended ? '마감' : daysLeft === 0 ? '오늘 마감' : `D-${daysLeft}`}
          </div>
        </div>

        {/* 제목 */}
        <div
          style={{
            marginTop: 36,
            fontSize: 44,
            fontWeight: 900,
            lineHeight: 1.25,
            letterSpacing: -1.2,
            color: '#fff',
            maxHeight: 168,
            overflow: 'hidden',
            display: '-webkit-box',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            WebkitLineClamp: 3 as any,
            WebkitBoxOrient: 'vertical' as any,
          }}
        >
          {sparring.title}
        </div>

        {/* VS 양분 — 라벨 + 비율 */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'stretch',
            gap: 12,
            height: 220,
          }}
        >
          {/* Side A */}
          <div
            style={{
              flex: pctA,
              minWidth: '20%',
              background: aWin || tied ? '#E42939' : 'rgba(228,41,57,0.35)',
              borderRadius: 20,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, opacity: 0.85 }}>A</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: -0.5,
                }}
              >
                {sparring.side_a_label}
              </span>
              <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>{pctA}%</span>
            </div>
          </div>

          {/* VS 중앙 */}
          <div
            style={{
              flex: 0,
              minWidth: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: -1,
            }}
          >
            VS
          </div>

          {/* Side B */}
          <div
            style={{
              flex: pctB,
              minWidth: '20%',
              background: !aWin || tied ? '#1B64DA' : 'rgba(27,100,218,0.35)',
              borderRadius: 20,
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              textAlign: 'right',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 800, opacity: 0.85, alignSelf: 'flex-end' }}>B</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  letterSpacing: -0.5,
                }}
              >
                {sparring.side_b_label}
              </span>
              <span style={{ fontSize: 44, fontWeight: 900, letterSpacing: -1 }}>{pctB}%</span>
            </div>
          </div>
        </div>

        {/* 하단 워터마크 */}
        <div
          style={{
            marginTop: 22,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 700,
          }}
        >
          <span style={{ fontWeight: 900, color: '#fff' }}>재테크한입 · 스파링</span>
          <span>we.hannipmoney.com/sparring</span>
        </div>
      </div>
    ),
    { ...size },
  );
}

function fallbackImage(msg: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F1A2D',
          color: '#fff',
          fontSize: 40,
          fontWeight: 900,
        }}
      >
        {msg}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
