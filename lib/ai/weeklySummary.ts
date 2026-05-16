/**
 * 캘린더 주간 AI 요약 — Claude Haiku.
 *
 * 캐시: 주별 (월요일 ~ 일요일 묶음의 시작 ISO) 키 = scope 'calendar_weekly' + monday_date
 * TTL: 7일 (다음주 월요일까지)
 * Fallback: LLM 실패 시 짧은 시드 문자열
 */

import { generate } from './claude';
import type { CalendarEvent } from '@/lib/marketCalendar';

const FALLBACK = '이번 주 시장 일정은 캘린더에서 확인할 수 있어요.';

export async function getWeeklyAiSummaryLive(
  todayIso: string,
  thisWeekEvents: CalendarEvent[],
): Promise<string> {
  // 월요일 시작 날짜 계산 (캐시 키 일관성용)
  const monday = mondayOf(todayIso);
  if (thisWeekEvents.length === 0) return '이번 주는 큰 이벤트가 없어요. 한 박자 쉬어가도 좋아요.';

  // RAG context — 이번주 major 이벤트 텍스트화
  const lines = thisWeekEvents
    .filter(e => e.importance === 'major')
    .slice(0, 8)
    .map(e => {
      const flag = e.region === 'us' ? '🇺🇸' : '🇰🇷';
      const date = e.date.slice(5); // MM-DD
      const meta = [
        e.actual && `발표 ${e.actual}`,
        e.forecast && `예측 ${e.forecast}`,
        e.previous && `이전 ${e.previous}`,
      ].filter(Boolean).join(', ');
      return `${flag} ${date} ${e.title}${meta ? ` (${meta})` : ''}`;
    })
    .join('\n');

  if (!lines) return '이번 주는 가벼운 한 주예요. 큰 이벤트는 없어요.';

  const prompt = `이번 주 (${monday} 시작) 핵심 시장 이벤트:

${lines}

위 일정을 보고 한입 AI 주간 요약 카드 본문을 써줘.
- 2-3문장. 80자 이내.
- 어떤 흐름의 한 주인지 (예: 경기 지표 몰린 주, 빅테크 실적 주)
- 누가 신경 써야 하는지 (예: 반도체 ETF 들고 있는 사람, 채권 비중 큰 사람)`;

  const out = await generate({
    scope: 'calendar_weekly',
    intent: 'calendar_weekly',
    prompt,
    ttlHours: 7 * 24,
    maxTokens: 240,
  });
  return out || fallbackFromEvents(thisWeekEvents);
}

function mondayOf(iso: string): string {
  const d = new Date(iso);
  const dow = d.getDay(); // 0=일
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function fallbackFromEvents(events: CalendarEvent[]): string {
  const titles = events
    .filter(e => e.importance === 'major')
    .slice(0, 3)
    .map(e => e.title.replace(/발표|예정$/g, '').trim());
  if (titles.length === 0) return FALLBACK;
  return `이번 주는 ${titles.join(' · ')} 같은 주요 일정이 있어요. 캘린더에서 자세히 확인하세요.`;
}
