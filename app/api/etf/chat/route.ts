/**
 * ETF AI 챗봇 API — Claude를 활용해 ETF 관련 질문에 답변.
 * 환경변수 ANTHROPIC_API_KEY 필요. 없으면 503 + 안내 메시지.
 *
 * 입력 (POST JSON):
 *   { question: string, etfContext?: { code, name, summary, theme, fee, distribution, hedge, aum } }
 *
 * 출력:
 *   { answer: string }  또는  { error: string }
 *
 * 정책:
 *   - 시스템 프롬프트로 'ETF 한 분야만'·'투자 권유 아님'·'한국 시장 기준' 명시
 *   - 길이 800 토큰 제한
 *   - rate limit (간단 IP 메모리): 1분당 10회
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5';

type EtfContext = {
  code?: string;
  name?: string;
  summary?: string;
  theme?: string;
  fee?: string;
  distribution?: string;
  hedge?: string;
  aum?: string;
};

// 간단 rate limit (IP → 분당 호출 수). 프로세스 메모리라 다중 인스턴스엔 약하지만 비용 가드용.
const callTracker = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_PER_MIN = 10;

function getClientId(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for') || '';
  return fwd.split(',')[0].trim() || 'anonymous';
}

function checkRateLimit(id: string): boolean {
  const now = Date.now();
  const entry = callTracker.get(id);
  if (!entry || entry.resetAt < now) {
    callTracker.set(id, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_PER_MIN) return false;
  entry.count += 1;
  return true;
}

function buildSystemPrompt(etf?: EtfContext): string {
  const base = [
    'You are 한입 — 한국어로 답하는 ETF 전문 도우미예요.',
    '오직 ETF·지수·운용·세금·분배·총보수 같은 ETF 관련 주제에만 답해요.',
    'ETF와 무관한 질문(주식 개별 종목 가격 추천, 부동산, 코인 등)은 정중히 거절하고 ETF 관련 대안을 제안하세요.',
    '"이거 사세요/파세요" 같은 직접 매매 권유는 절대 하지 않아요. 대신 판단 기준을 알려주세요.',
    '한국 시장 기준 (코스피·코스닥·KRX 상장 ETF + 미국 시장에 투자하는 국내 ETF)을 우선 안내해요.',
    '답변은 3~6문장, 한국어, 친근한 존댓말, 마크다운 가능. 마지막에 "※ 투자 권유가 아니며 참고용입니다." 짧게 덧붙여요.',
  ];
  if (etf && etf.name) {
    base.push('');
    base.push(`현재 사용자는 ${etf.name} (${etf.code || ''}) 페이지를 보고 있어요. 컨텍스트:`);
    if (etf.summary) base.push(`- 요약: ${etf.summary}`);
    if (etf.theme) base.push(`- 테마: ${etf.theme}`);
    if (etf.fee) base.push(`- 총보수: ${etf.fee}`);
    if (etf.distribution) base.push(`- 분배: ${etf.distribution}`);
    if (etf.hedge) base.push(`- 환헤지: ${etf.hedge}`);
    if (etf.aum) base.push(`- 순자산: ${etf.aum}`);
    base.push('이 ETF의 컨텍스트를 활용해 답해도 됩니다.');
  }
  return base.join('\n');
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 도우미는 곧 열려요. 운영자가 API 키를 등록하면 자동 활성화됩니다.' },
      { status: 503 },
    );
  }

  const clientId = getClientId(request);
  if (!checkRateLimit(clientId)) {
    return NextResponse.json(
      { error: '잠시 후 다시 시도해 주세요 (분당 호출 한도 초과).' },
      { status: 429 },
    );
  }

  let body: { question?: string; etfContext?: EtfContext };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않아요.' }, { status: 400 });
  }

  const question = (body.question || '').trim();
  if (!question) return NextResponse.json({ error: '질문을 입력해주세요.' }, { status: 400 });
  if (question.length > 500) {
    return NextResponse.json({ error: '질문은 500자 이내로 작성해주세요.' }, { status: 400 });
  }

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 800,
        system: buildSystemPrompt(body.etfContext),
        messages: [{ role: 'user', content: question }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `AI 응답 실패 (${res.status}). 잠시 후 다시 시도해주세요.`, detail: errText.slice(0, 200) },
        { status: 502 },
      );
    }

    const data = await res.json();
    const answer = data?.content?.[0]?.text || '답변을 생성하지 못했어요. 다시 시도해주세요.';
    return NextResponse.json({ answer });
  } catch (error: any) {
    return NextResponse.json(
      { error: `AI 호출 중 오류: ${error?.message || 'unknown'}` },
      { status: 500 },
    );
  }
}
