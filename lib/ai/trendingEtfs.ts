/**
 * 지금 핫한 ETF — AI 추세 정리.
 *
 * 1. 라이브 변동률 큰 ETF Top 10 추출
 * 2. 카테고리/테마별 묶어서 컨텍스트화
 * 3. Claude 가 한입 톤으로 "어떤 흐름이 만들어지고 있는지" 요약
 *
 * 캐시: 6시간 (하루 4번 갱신)
 */

import { generate } from './claude';
import type { EtfInfo } from '@/lib/etfs';
import { fetchEtfs } from '@/lib/etfsDb';

export type TrendingBucket = {
  theme: string;       // "반도체·AI", "월배당", ...
  direction: 'up' | 'down' | 'mixed';
  etfs: { code: string; slug: string; shortName: string; change: string }[];
};

export type TrendingResult = {
  generatedAt: string;
  buckets: TrendingBucket[];
  aiSummary: string;
  topMovers: { code: string; slug: string; shortName: string; change: string; tone: 'up' | 'down' | 'flat' }[];
};

export async function fetchTrendingEtfs(): Promise<TrendingResult> {
  const all = await fetchEtfs(2000);

  // 변동률 파싱 + 절댓값 큰 순
  const ranked = all
    .map(e => ({
      etf: e,
      pct: parseFloat((e.change || '').replace(/[^0-9.\-]/g, '')) || 0,
    }))
    .filter(x => Math.abs(x.pct) >= 0.5) // 0.5% 미만은 제외
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

  const topMovers = ranked.slice(0, 12).map(({ etf, pct }) => ({
    code: etf.code,
    slug: etf.slug,
    shortName: etf.shortName || etf.name,
    change: etf.change,
    tone: pct > 0 ? 'up' as const : pct < 0 ? 'down' as const : 'flat' as const,
  }));

  // 테마/카테고리 별 묶기
  const groupMap = new Map<string, { up: typeof topMovers; down: typeof topMovers }>();
  for (const { etf } of ranked.slice(0, 30)) {
    const key = etf.theme || etf.category || '기타';
    if (!groupMap.has(key)) groupMap.set(key, { up: [], down: [] });
    const item = {
      code: etf.code,
      slug: etf.slug,
      shortName: etf.shortName || etf.name,
      change: etf.change,
      tone: etf.changeTone || 'flat',
    };
    const pct = parseFloat((etf.change || '').replace(/[^0-9.\-]/g, '')) || 0;
    if (pct > 0) groupMap.get(key)!.up.push(item);
    else if (pct < 0) groupMap.get(key)!.down.push(item);
  }

  const buckets: TrendingBucket[] = Array.from(groupMap.entries())
    .filter(([, g]) => g.up.length + g.down.length >= 2)
    .map(([theme, g]): TrendingBucket => ({
      theme,
      direction: (g.up.length > g.down.length * 1.5 ? 'up'
        : g.down.length > g.up.length * 1.5 ? 'down'
        : 'mixed') as 'up' | 'down' | 'mixed',
      etfs: [...g.up.slice(0, 3), ...g.down.slice(0, 3)].slice(0, 4).map(e => ({
        code: e.code,
        slug: e.slug,
        shortName: e.shortName,
        change: e.change,
      })),
    }))
    .slice(0, 6);

  // AI 요약 — RAG context 조립
  const ragContext = buckets.map(b => {
    const dir = b.direction === 'up' ? '↑ 상승' : b.direction === 'down' ? '↓ 하락' : '⇄ 혼조';
    const list = b.etfs.map(e => `${e.shortName}(${e.change})`).join(', ');
    return `[${b.theme}] ${dir} — ${list}`;
  }).join('\n');

  const aiPrompt = `오늘 ETF 시장에서 변동 큰 테마들이에요:

${ragContext}

위 흐름을 한 입에 정리해줘.
- 3-4문장. 130자 이내.
- 어떤 큰 흐름이 만들어지고 있는지 (어떤 테마가 떴고 어떤 테마가 빠졌는지)
- 어떤 사람이 신경 써볼만한지 (구체적으로)
- 투자 추천 X. 사실 + 맥락 + "챙겨볼 것" 만`;

  const aiSummary = await generate({
    scope: 'trending_etf',
    intent: 'trending_etf',
    prompt: aiPrompt,
    ttlHours: 6,
    maxTokens: 300,
  });

  return {
    generatedAt: new Date().toISOString(),
    buckets,
    aiSummary: aiSummary || '오늘 변동 큰 테마 흐름을 아래에서 확인하세요.',
    topMovers,
  };
}
