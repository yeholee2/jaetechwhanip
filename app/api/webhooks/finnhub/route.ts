/**
 * Finnhub Webhook 수신 엔드포인트.
 *
 * Finnhub 대시보드에서 등록할 URL:
 *   https://we.hannipmoney.com/api/webhooks/finnhub
 *
 * 인증: X-Finnhub-Secret 헤더로 시크릿 검증
 *
 * 받는 이벤트 (Finnhub Webhook 종류):
 *  - 'press-release'  : 기업 보도자료
 *  - 'earnings'       : 실적 발표
 *  - 'news'           : 뉴스
 *  - 'ipo'            : IPO 일정
 *  - 'sentiment'      : 시장 감성
 *
 * 현재 동작:
 *  1. 시크릿 검증
 *  2. 페이로드 로그 (Vercel 로그에서 확인 가능)
 *  3. 200 응답 (재시도 방지)
 *
 * 다음 단계 (구독자 알림):
 *  - Supabase user_event_subscriptions 조회
 *  - 매칭되는 구독자에게 push/email 발송
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type FinnhubWebhookPayload = {
  event?: string;
  symbol?: string;
  date?: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
};

export async function POST(req: NextRequest) {
  const secret = process.env.FINNHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[finnhub-webhook] FINNHUB_WEBHOOK_SECRET not set');
    return NextResponse.json({ ok: false, error: 'webhook not configured' }, { status: 503 });
  }

  // Finnhub 시크릿 검증 (X-Finnhub-Secret 헤더)
  const receivedSecret = req.headers.get('x-finnhub-secret');
  if (receivedSecret !== secret) {
    console.warn(`[finnhub-webhook] secret mismatch — got: ${receivedSecret ? '[redacted]' : '(none)'}`);
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // 페이로드 파싱
  let payload: FinnhubWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  // 로그 (Vercel 로그 + 추후 알림 시스템 연결점)
  console.log('[finnhub-webhook]', JSON.stringify({
    event: payload.event,
    symbol: payload.symbol,
    date: payload.date,
    receivedAt: new Date().toISOString(),
    keys: Object.keys(payload),
  }));

  // TODO: 구독자 알림 발송 (Supabase + push/email)
  // 1. payload.event + payload.symbol 매칭 구독자 조회
  // 2. 알림 발송
  // 3. 발송 로그 저장

  return NextResponse.json({ ok: true });
}

// GET 으로 시크릿 검증 테스트 가능 (Finnhub 등록 시 ping)
export async function GET(req: NextRequest) {
  const secret = process.env.FINNHUB_WEBHOOK_SECRET;
  const provided = req.headers.get('x-finnhub-secret') || req.nextUrl.searchParams.get('secret');

  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook not configured' }, { status: 503 });
  }
  if (provided !== secret) {
    return NextResponse.json({ ok: true, status: 'ready', authenticated: false });
  }
  return NextResponse.json({ ok: true, status: 'ready', authenticated: true });
}
