/**
 * Claude API wrapper — Haiku 모델 + Supabase 캐시 + 비용 가드.
 *
 * 사용:
 *   const text = await generate({
 *     scope: 'etf_signal',
 *     prompt: '...',
 *     ttlHours: 24,
 *   });
 *
 * 캐시:
 *  - 같은 (model + system + prompt) 해시는 DB 에서 재사용
 *  - expires_at 지나면 만료, 새로 호출
 *
 * 비용 가드:
 *  - 일일 한도 ($AI_DAILY_BUDGET_USD, 기본 $1)
 *  - 한도 초과 시 null 반환 (호출자가 fallback)
 */
import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { TONE_SYSTEM, INTENT_HINTS, type Intent } from './tone';

const MODEL_HAIKU = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
const MAX_TOKENS_DEFAULT = 400;

// Haiku 4.5 가격 (per 1M tokens)
const PRICE_INPUT_PER_M = 1.0;     // $1.00 / 1M
const PRICE_OUTPUT_PER_M = 5.0;    // $5.00 / 1M

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const DAILY_BUDGET_USD = Number(process.env.AI_DAILY_BUDGET_USD || '1');

export type GenerateOpts = {
  scope: Intent | string;
  prompt: string;
  intent?: Intent;            // INTENT_HINTS 의 한 줄을 user prompt 앞에 prepend
  ttlHours?: number;          // 캐시 유효 시간. 기본 24, 0 = no cache
  maxTokens?: number;
};

function hashKey(model: string, system: string, prompt: string): string {
  return createHash('sha256').update(`${model}\n${system}\n${prompt}`).digest('hex');
}

export async function generate(opts: GenerateOpts): Promise<string | null> {
  if (!client) return null;
  const model = MODEL_HAIKU;
  const sys = TONE_SYSTEM;
  const userPrompt = opts.intent
    ? `${INTENT_HINTS[opts.intent]}\n\n${opts.prompt}`
    : opts.prompt;
  const key = hashKey(model, sys, userPrompt);

  // 1. 캐시 조회
  const admin = createAdminClient();
  if (admin && (opts.ttlHours ?? 24) > 0) {
    const { data: cached } = await admin
      .from('ai_cache')
      .select('response, expires_at')
      .eq('cache_key', key)
      .maybeSingle();
    if (cached) {
      const stillValid = !cached.expires_at || new Date(cached.expires_at).getTime() > Date.now();
      if (stillValid) return cached.response;
    }
  }

  // 2. 일일 한도 체크
  if (admin) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await admin
      .from('ai_usage_daily')
      .select('total_cost_usd')
      .eq('date', today)
      .maybeSingle();
    const spent = Number(usage?.total_cost_usd || 0);
    if (spent >= DAILY_BUDGET_USD) {
      console.warn(`[ai] daily budget exceeded ($${spent.toFixed(3)} >= $${DAILY_BUDGET_USD})`);
      return null;
    }
  }

  // 3. Claude 호출 (prompt caching: system 을 cache_control 처리)
  let response: string;
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: opts.maxTokens ?? MAX_TOKENS_DEFAULT,
      system: [
        { type: 'text', text: sys, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });
    inputTokens = msg.usage.input_tokens;
    outputTokens = msg.usage.output_tokens;
    response = msg.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim();
  } catch (err: any) {
    console.error('[ai] Claude error:', err?.message || err);
    return null;
  }

  // 4. 비용 계산
  const cost =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;

  // 5. 캐시 저장 + 일일 사용량 누적
  if (admin) {
    const expires = (opts.ttlHours ?? 24) > 0
      ? new Date(Date.now() + (opts.ttlHours ?? 24) * 3600_000).toISOString()
      : null;
    await admin.from('ai_cache').upsert({
      cache_key: key,
      scope: opts.scope,
      model,
      prompt_hash: key,
      response,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
      expires_at: expires,
    });

    // ai_usage_daily 누적 (upsert + RPC 가 깔끔하지만 간단히 select + update)
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await admin
      .from('ai_usage_daily')
      .select('*')
      .eq('date', today)
      .maybeSingle();
    if (row) {
      await admin.from('ai_usage_daily').update({
        total_input_tokens: (row.total_input_tokens || 0) + inputTokens,
        total_output_tokens: (row.total_output_tokens || 0) + outputTokens,
        total_cost_usd: Number(row.total_cost_usd || 0) + cost,
        call_count: (row.call_count || 0) + 1,
      }).eq('date', today);
    } else {
      await admin.from('ai_usage_daily').insert({
        date: today,
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
        total_cost_usd: cost,
        call_count: 1,
      });
    }
  }

  return response;
}

/** 사용량 조회 (어드민 대시보드용) */
export async function getDailyUsage(days = 7) {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from('ai_usage_daily')
    .select('*')
    .order('date', { ascending: false })
    .limit(days);
  return data || [];
}
