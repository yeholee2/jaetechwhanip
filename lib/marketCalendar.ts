/**
 * 증시 캘린더 — 경제지표 + 실적 발표 일정.
 *
 * 현재는 시드 데이터 (Toss증권 톤 따라). 추후 외부 API (Investing.com / TradingEconomics) 연동.
 * 모든 시각은 KST 기준.
 */

export type CalendarEventKind = 'economic' | 'earnings';
export type CalendarRegion = 'us' | 'kr';
export type CalendarImportance = 'major' | 'normal';

export type CalendarEvent = {
  id: string;
  date: string;             // YYYY-MM-DD (KST 기준)
  region: CalendarRegion;
  kind: CalendarKind;
  title: string;
  /** 발표값 (released)·예측·이전 — 경제지표만 */
  actual?: string;
  forecast?: string;
  previous?: string;
  /** 회사 코드 (실적용) */
  ticker?: string;
  /** 회사 로고 URL */
  logo?: string;
  importance: CalendarImportance;
  /** earnings: 어닝콜 다시듣기 링크 (있으면) */
  earningsCallUrl?: string;
  /** 발표/예정 시각 한글 표현 (예: '오후 9시 30분 발표 예정', '오전 5시 이후') */
  time?: string;
};

/** 이벤트 종류별 기본 발표 시각 (한국 시간 기준) */
export function getDefaultEventTime(e: CalendarEvent): string {
  if (e.time) return e.time;
  // 미국 경제지표: ET 8:30 AM = KST 오후 9시 30분 (대부분)
  if (e.region === 'us' && e.kind === 'economic') {
    return '오후 9시 30분 발표 예정';
  }
  // 미국 실적: 장 마감 후 발표 (16:00 ET = KST 오전 5시 이후) 또는 장 시작 전
  if (e.region === 'us' && e.kind === 'earnings') {
    return e.importance === 'major' ? '오전 5시 이후' : '장 마감 후';
  }
  // 한국 경제지표: 평균 오전 발표
  if (e.region === 'kr' && e.kind === 'economic') {
    return '오전 8시 발표 예정';
  }
  // 한국 실적: 장 마감 후
  return '장 마감 후';
}

/** 중요도·시각 기준 정렬 — major 먼저, 같으면 시간순 */
export function sortByImportance(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.importance !== b.importance) return a.importance === 'major' ? -1 : 1;
    // 둘 다 같은 importance면 미국 경제지표를 위로 (가장 영향 큼)
    const score = (e: CalendarEvent) => (e.region === 'us' ? 0 : 1) + (e.kind === 'economic' ? 0 : 0.5);
    return score(a) - score(b);
  });
}

type CalendarKind = CalendarEventKind;

// 현재 기준 (2026-05-16) 이후 2주치 시드
export const CALENDAR_EVENTS: CalendarEvent[] = [
  // 5월 3주차
  {
    id: 'us-ism-mfg-may-w3',
    date: '2026-05-18',
    region: 'us',
    kind: 'economic',
    title: 'ISM 제조업 구매관리자지수 발표',
    actual: '52.6',
    previous: '47.9',
    importance: 'major',
  },
  {
    id: 'us-amd-q1-earnings',
    date: '2026-05-19',
    region: 'us',
    kind: 'earnings',
    title: 'AMD 실적발표',
    ticker: 'AMD',
    importance: 'major',
  },
  {
    id: 'us-adp-may-w3',
    date: '2026-05-19',
    region: 'us',
    kind: 'economic',
    title: '비농업부문 고용변화량(ADP) 발표',
    actual: '2.2만 건',
    previous: '4.1만 건',
    importance: 'major',
  },
  {
    id: 'us-abbv-q1',
    date: '2026-05-19',
    region: 'us',
    kind: 'earnings',
    title: '애브비 실적발표',
    ticker: 'ABBV',
    importance: 'major',
  },
  {
    id: 'us-lly-q1',
    date: '2026-05-19',
    region: 'us',
    kind: 'earnings',
    title: '일라이 릴리 실적발표',
    ticker: 'LLY',
    importance: 'major',
  },
  {
    id: 'us-ism-svc-may-w3',
    date: '2026-05-20',
    region: 'us',
    kind: 'economic',
    title: 'ISM 서비스업 구매관리자지수 발표',
    forecast: '53.8',
    previous: '54.4',
    importance: 'major',
  },
  {
    id: 'us-googl-q1',
    date: '2026-05-20',
    region: 'us',
    kind: 'earnings',
    title: '알파벳 실적발표',
    ticker: 'GOOGL',
    importance: 'major',
  },
  {
    id: 'us-jobless-may-w3',
    date: '2026-05-21',
    region: 'us',
    kind: 'economic',
    title: '주간 신규실업수당 청구건수 발표',
    forecast: '23만 명',
    previous: '20만 명',
    importance: 'major',
  },
  {
    id: 'us-jolts-may-w3',
    date: '2026-05-22',
    region: 'us',
    kind: 'economic',
    title: '노동시장 신규 구인건수(JOLTs) 발표',
    forecast: '654.2만 건',
    previous: '714.6만 건',
    importance: 'major',
  },
  {
    id: 'us-amzn-q1',
    date: '2026-05-22',
    region: 'us',
    kind: 'earnings',
    title: '아마존 실적발표',
    ticker: 'AMZN',
    importance: 'major',
  },
  // 5월 4주차
  {
    id: 'kr-meeting-may-w4',
    date: '2026-05-25',
    region: 'kr',
    kind: 'economic',
    title: '한국은행 금융통화위원회',
    forecast: '동결',
    previous: '3.25%',
    importance: 'major',
  },
  {
    id: 'us-cpi-may',
    date: '2026-05-27',
    region: 'us',
    kind: 'economic',
    title: '5월 소비자물가지수(CPI) 발표',
    forecast: '+0.2% MoM',
    previous: '+0.3% MoM',
    importance: 'major',
  },
  {
    id: 'us-nvda-q1',
    date: '2026-05-28',
    region: 'us',
    kind: 'earnings',
    title: '엔비디아 실적발표',
    ticker: 'NVDA',
    importance: 'major',
  },
  {
    id: 'kr-export-may',
    date: '2026-05-30',
    region: 'kr',
    kind: 'economic',
    title: '5월 수출입동향 (잠정)',
    forecast: '+8.4% YoY',
    previous: '+7.2% YoY',
    importance: 'normal',
  },
];

/** 오늘 이후 가장 가까운 major 이벤트 — 데이터 주입 가능 */
export function getNextMajorEvent(
  today: Date = new Date(),
  events: CalendarEvent[] = CALENDAR_EVENTS,
): { event: CalendarEvent; dDay: number } | null {
  const todayStr = isoDate(today);
  const upcoming = events
    .filter(e => e.importance === 'major' && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcoming.length === 0) return null;
  const event = upcoming[0];
  const dDay = daysBetween(todayStr, event.date);
  return { event, dDay };
}

/** 이번 주차 + 다음 주차 이벤트 (월요일 기준) — 데이터 주입 가능 */
export function getWeeklyEvents(
  today: Date = new Date(),
  events: CalendarEvent[] = CALENDAR_EVENTS,
): {
  week: string;
  startDate: string;
  events: CalendarEvent[];
}[] {
  // 이번주 월요일
  const monday = new Date(today);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);

  const weeks: { week: string; startDate: string; events: CalendarEvent[] }[] = [];
  for (let w = 0; w < 4; w++) {
    const weekStart = new Date(monday);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startISO = isoDate(weekStart);
    const endISO = isoDate(weekEnd);
    const inWeek = events.filter(e => e.date >= startISO && e.date <= endISO);
    const monthNum = weekStart.getMonth() + 1;
    const weekNumInMonth = Math.ceil(weekStart.getDate() / 7);
    weeks.push({
      week: `${monthNum}월 ${weekNumInMonth}주차`,
      startDate: startISO,
      events: inWeek.sort((a, b) => a.date.localeCompare(b.date)),
    });
  }
  return weeks;
}

/** 한입 AI 주간 요약 (정적 — 매주 갱신) */
export function getWeeklyAiSummary(): string {
  return '미국 ISM 제조업·서비스업 + 신규실업수당 + JOLTs 등 노동·경기 지표가 한꺼번에 나오는 주예요. AMD·알파벳·아마존 빅테크 실적도 이어집니다.';
}

// ── 유틸 ──
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}
