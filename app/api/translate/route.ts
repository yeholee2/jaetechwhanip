import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type TranslationItem = {
  id: string;
  type?: string;
  text: string;
};

type CachedTranslation = {
  cache_key: string;
  translated_text: string;
};

const MAX_ITEMS = 24;
const MAX_TEXT_LENGTH = 1200;
const TARGET_LOCALE = 'en-US';

function cacheKey(text: string, targetLocale: string) {
  return createHash('sha256')
    .update(`${targetLocale}:${text.trim()}`)
    .digest('hex');
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : '';
}

function hasKorean(text: string) {
  return /[ㄱ-ㅎ가-힣]/.test(text);
}

function extractOutputText(response: any) {
  if (typeof response?.output_text === 'string') return response.output_text;
  const chunks = response?.output
    ?.flatMap((item: any) => item?.content || [])
    ?.map((part: any) => part?.text || '')
    ?.filter(Boolean);
  return chunks?.join('\n') || '';
}

function parseJsonObject(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

async function readCachedTranslations(keys: string[], targetLocale: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || keys.length === 0) return new Map<string, string>();

  const params = new URLSearchParams({
    select: 'cache_key,translated_text',
    target_locale: `eq.${targetLocale}`,
    cache_key: `in.(${keys.join(',')})`,
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/translations?${params}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) return new Map<string, string>();
  const rows = (await res.json()) as CachedTranslation[];
  return new Map(rows.map(row => [row.cache_key, row.translated_text]));
}

async function writeCachedTranslations(rows: Array<{
  cache_key: string;
  source_text: string;
  translated_text: string;
  target_locale: string;
  item_type: string;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey || rows.length === 0) return;

  await fetch(`${supabaseUrl}/rest/v1/translations?on_conflict=cache_key,target_locale`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(rows),
  });
}

async function translateWithOpenAI(items: TranslationItem[], targetLocale: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4.1-mini';

  if (!apiKey || items.length === 0) return [];

  const prompt = {
    targetLocale,
    style: 'Natural American English for a Reddit-like personal finance community.',
    rules: [
      'Translate only the provided text. Do not answer the financial question.',
      'Preserve numbers, percentages, dates, ticker symbols, product names, and risk wording.',
      'For Korea-specific financial terms, translate naturally and add a short clarifying phrase only if needed.',
      'Keep the tone human, concise, and community-native, not corporate or textbook-like.',
      'Return JSON only: {"items":[{"id":"...","text":"..."}]}',
    ],
    items: items.map(item => ({
      id: item.id,
      type: item.type || 'text',
      text: item.text,
    })),
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: 'system',
          content: 'You are a financial community localization editor. Produce faithful, natural translations only.',
        },
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
      max_output_tokens: 2200,
    }),
  });

  if (!res.ok) return [];

  const data = await res.json();
  const parsed = parseJsonObject(extractOutputText(data));
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetLocale = body?.targetLocale === TARGET_LOCALE ? TARGET_LOCALE : TARGET_LOCALE;
    const rawItems = Array.isArray(body?.items) ? body.items : [];

    const items = rawItems
      .slice(0, MAX_ITEMS)
      .map((item: any) => ({
        id: String(item?.id || ''),
        type: typeof item?.type === 'string' ? item.type : 'text',
        text: cleanText(item?.text),
      }))
      .filter((item: TranslationItem) => item.id && item.text && hasKorean(item.text)) as TranslationItem[];

    const keyed = items.map(item => ({ ...item, cacheKey: cacheKey(item.text, targetLocale) }));
    const cached = await readCachedTranslations(keyed.map(item => item.cacheKey), targetLocale);
    const missing = keyed.filter(item => !cached.has(item.cacheKey));
    const translated = await translateWithOpenAI(missing, targetLocale);
    const translatedMap = new Map<string, string>(
      translated
        .filter((item: any) => item?.id && typeof item.text === 'string' && item.text.trim())
        .map((item: any) => [String(item.id), item.text.trim()]),
    );

    await writeCachedTranslations(
      missing
        .filter(item => translatedMap.has(item.id))
        .map(item => ({
          cache_key: item.cacheKey,
          source_text: item.text,
          translated_text: translatedMap.get(item.id)!,
          target_locale: targetLocale,
          item_type: item.type || 'text',
        })),
    );

    return NextResponse.json({
      targetLocale,
      items: keyed.map(item => ({
        id: item.id,
        text: cached.get(item.cacheKey) || translatedMap.get(item.id) || item.text,
        translated: cached.has(item.cacheKey) || translatedMap.has(item.id),
      })),
    });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
