/**
 * 포트폴리오 진단 AI 코멘트 — 사용자 답변 + 추천 결과를 한입 톤으로 1-2문장.
 *
 * 캐시: (answers + buckets) hash 단위로 7일 → 같은 조합은 한 번만 호출
 */
import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@/lib/ai/claude';

export const runtime = 'nodejs';

type Bucket = { key: string; label: string; value: number };

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const ageLabel: string = body.ageLabel || '';
  const goalLabel: string = body.goalLabel || '';
  const amountLabel: string = body.amountLabel || '';
  const riskLabel: string = body.riskLabel || '';
  const horizonLabel: string = body.horizonLabel || '';
  const buckets: Bucket[] = body.buckets || [];
  const expectedReturn: number = Number(body.expectedReturn || 0);

  if (buckets.length === 0) {
    return NextResponse.json({ comment: null }, { status: 200 });
  }

  const bucketStr = buckets
    .map(b => `${b.label} ${b.value.toFixed(0)}%`)
    .join(' · ');

  const prompt = `사용자 프로필:
- 나이대: ${ageLabel || '미상'}
- 목표: ${goalLabel || '미상'}
- 월 투자액: ${amountLabel || '미상'}
- 위험 성향: ${riskLabel || '미상'}
- 투자 기간: ${horizonLabel || '미상'}

추천 포트폴리오:
${bucketStr}
예상 연 수익률 ${expectedReturn.toFixed(1)}%

위 진단 결과를 본 사용자에게 한입 톤으로 한 줄 인사이트 + 한 줄 챙겨볼 것을 써줘.
- 총 2문장. 60자 이내.
- 첫 문장: 이 포트폴리오가 어떤 사람한테 잘 맞는지 (공감)
- 둘째 문장: 챙겨볼 것 한 가지 (구체적, 행동 가능)
- 투자 권유·확정 발언 금지`;

  const out = await generate({
    scope: 'portfolio_comment',
    intent: 'portfolio_comment',
    prompt,
    ttlHours: 7 * 24,
    maxTokens: 180,
  });

  return NextResponse.json({ comment: out });
}
