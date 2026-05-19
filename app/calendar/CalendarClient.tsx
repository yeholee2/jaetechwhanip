'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarEvent } from '@/lib/marketCalendar';
import { getDefaultEventTime, sortByImportance } from '@/lib/marketCalendar';
import { WeeklySummaryModal } from './WeeklySummaryModal';
import styles from './Calendar.module.css';

type Filter = 'all' | 'economic' | 'earnings';
type Region = 'all' | 'kr' | 'us';
type View = 'week' | 'month';

type Props = {
  events: CalendarEvent[];
  weeks: { week: string; startDate: string; events: CalendarEvent[] }[];
  aiSummary: string;
  todayIso: string;
};

const KOR_DAY = ['일', '월', '화', '수', '목', '금', '토'];
const KOR_DAY_HEAD = ['월', '화', '수', '목', '금', '토', '일'];

export function CalendarClient({ events, weeks, aiSummary, todayIso }: Props) {
  const [filterKind, setFilterKind] = useState<Filter>('all');
  const [filterRegion, setFilterRegion] = useState<Region>('all');
  const [view, setView] = useState<View>('week');
  // 토스 톤 — 기본 '주요만' (importance=major). 토글로 전체 노출
  const [showAll, setShowAll] = useState(false);
  const [cursor, setCursor] = useState(() => new Date(todayIso));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const matchFilter = (e: CalendarEvent) =>
    (filterKind === 'all' || e.kind === filterKind) &&
    (filterRegion === 'all' || e.region === filterRegion) &&
    (showAll || e.importance === 'major');

  const filteredEvents = useMemo(() => events.filter(matchFilter), [events, filterKind, filterRegion, showAll]);

  const filteredWeeks = useMemo(
    () => weeks.map(w => ({ ...w, events: w.events.filter(matchFilter) })),
    [weeks, filterKind, filterRegion, showAll],
  );

  // 월간 그리드 셀
  const monthGrid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of filteredEvents) {
      const arr = m.get(e.date) || [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [filteredEvents]);

  // 미니캘 클릭 → 주별 뷰에서 해당 날짜 스크롤
  useEffect(() => {
    if (!selectedDate || view !== 'week') return;
    const el = dayRefs.current[selectedDate];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedDate, view]);

  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;
  const prevMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() - 1);
    setCursor(d);
  };
  const nextMonth = () => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + 1);
    setCursor(d);
  };
  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>증시 캘린더</h1>
          <p className={styles.sub}>경제지표 · 실적 발표 · 한입 AI 주간 요약</p>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ── 좌측: 미니 캘린더 + AI 요약 ── */}
        <aside className={styles.side}>
          <section className={styles.miniCal}>
            <div className={styles.miniHead}>
              <span className={styles.monthLabel}>{monthLabel}</span>
              <div className={styles.miniNav}>
                <button type="button" onClick={prevMonth} aria-label="이전 달">‹</button>
                <button type="button" onClick={nextMonth} aria-label="다음 달">›</button>
              </div>
            </div>
            <div className={styles.miniDayRow}>
              {KOR_DAY_HEAD.map(d => (
                <span key={d} className={styles.miniDayLabel}>{d}</span>
              ))}
            </div>
            <div className={styles.miniGrid}>
              {monthGrid.map(({ date, inMonth }) => {
                const iso = isoDate(date);
                const isToday = iso === todayIso;
                const isSelected = iso === selectedDate;
                const dayEvents = eventsByDate.get(iso) || [];
                const hasMajor = dayEvents.some(e => e.importance === 'major');
                return (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => setSelectedDate(iso)}
                    className={`${styles.miniCell} ${inMonth ? '' : styles.miniCellOff} ${isToday ? styles.miniCellToday : ''} ${isSelected ? styles.miniCellSel : ''}`}
                  >
                    <span>{date.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className={`${styles.miniDot} ${hasMajor ? styles.miniDotMajor : ''}`} aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <section className={styles.aiCard}>
            <span className={styles.aiEyebrow}>
              <span className={`${styles.sparkle} tf`} aria-hidden="true">✨</span>
              이번주 AI 요약
            </span>
            <p className={styles.aiBody}>{aiSummary}</p>
            <button
              type="button"
              className={styles.aiMore}
              onClick={() => setShowAiModal(true)}
            >
              자세히 보기 ›
            </button>
          </section>
        </aside>

        {/* ── 우측: 필터 + 뷰 ── */}
        <section className={styles.main}>
          <div className={styles.filterBar}>
            <div className={styles.filterGroup}>
              {([
                { key: 'all', label: '전체' },
                { key: 'economic', label: '경제지표' },
                { key: 'earnings', label: '실적' },
              ] as const).map(f => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setFilterKind(f.key)}
                  className={`${styles.filterChip} ${filterKind === f.key ? styles.filterChipOn : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.filterGroup}>
              {([
                { key: 'all', label: '전체' },
                { key: 'kr', label: '국내' },
                { key: 'us', label: '해외' },
              ] as const).map(f => (
                <button
                  type="button"
                  key={f.key}
                  onClick={() => setFilterRegion(f.key)}
                  className={`${styles.filterChip} ${filterRegion === f.key ? styles.filterChipOn : ''}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.viewToggle}>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className={`${styles.viewBtn} ${!showAll ? styles.viewBtnOn : ''}`}
                title="주요(major) 이벤트만 보기"
              >
                주요만
              </button>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className={`${styles.viewBtn} ${showAll ? styles.viewBtnOn : ''}`}
                title="모든 이벤트 보기"
              >
                전체
              </button>
            </div>
            <div className={styles.viewToggle}>
              <button
                type="button"
                onClick={() => setView('week')}
                className={`${styles.viewBtn} ${view === 'week' ? styles.viewBtnOn : ''}`}
              >
                주별
              </button>
              <button
                type="button"
                onClick={() => setView('month')}
                className={`${styles.viewBtn} ${view === 'month' ? styles.viewBtnOn : ''}`}
              >
                월별
              </button>
            </div>
          </div>

          {view === 'week' ? (
            <WeekView
              weeks={filteredWeeks}
              todayIso={todayIso}
              selectedDate={selectedDate}
              dayRefs={dayRefs}
            />
          ) : (
            <MonthView
              cursor={cursor}
              monthGrid={monthGrid}
              eventsByDate={eventsByDate}
              todayIso={todayIso}
              onSelect={iso => setSelectedDate(iso)}
              selectedDate={selectedDate}
            />
          )}
        </section>
      </div>

      {/* 이번주 AI 요약 — 상세 모달 (Toss 패턴) */}
      {showAiModal && (
        <WeeklySummaryModal
          headline={aiSummary}
          events={filteredWeeks[0]?.events || events}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  );
}

// ── 주별 뷰: 요일별 그룹핑 (토스풍 — 7일 모두 렌더, 빈 날은 "소식이 없어요") ──
function WeekView({
  weeks,
  todayIso,
  selectedDate,
  dayRefs,
}: {
  weeks: { week: string; startDate: string; events: CalendarEvent[] }[];
  todayIso: string;
  selectedDate: string | null;
  dayRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}) {
  return (
    <>
      {weeks.map(w => {
        const eventsByDay = new Map<string, CalendarEvent[]>();
        for (const e of w.events) {
          const arr = eventsByDay.get(e.date) || [];
          arr.push(e);
          eventsByDay.set(e.date, arr);
        }
        const days = expandWeekDays(w.startDate);
        return (
          <div key={w.startDate} className={styles.weekBlock}>
            <div className={styles.weekHead}>
              <strong className={styles.weekTitle}>{w.week}</strong>
              <div className={styles.weekColHead} aria-hidden="true">
                <span>발표</span>
                <span>예측</span>
                <span>이전</span>
              </div>
            </div>
            <div className={styles.daysWrap}>
              {days.map(date => {
                const dayEvents = eventsByDay.get(date) || [];
                const isToday = date === todayIso;
                const isSelected = date === selectedDate;
                const d = new Date(date);
                return (
                  <div
                    key={date}
                    ref={el => { dayRefs.current[date] = el; }}
                    className={`${styles.dayRow} ${isToday ? styles.dayRowToday : ''} ${isSelected ? styles.dayRowSel : ''}`}
                  >
                    <div className={styles.dayLabel}>
                      <span className={styles.dayNum}>{d.getDate()}</span>
                      <span className={styles.dayDow}>{KOR_DAY[d.getDay()]}</span>
                    </div>
                    {dayEvents.length === 0 ? (
                      <div className={styles.dayEmpty}>
                        <span className={styles.dayEmptyIcon} aria-hidden="true">🗒️</span>
                        <span>소식이 없어요</span>
                      </div>
                    ) : (
                      <ul className={styles.eventList}>
                        {/* 중요도 우선 정렬 (major 먼저) */}
                        {sortByImportance(dayEvents).map(e => <EventRow key={e.id} event={e} />)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}

// ── 월별 뷰: 큰 그리드 ──
function MonthView({
  cursor,
  monthGrid,
  eventsByDate,
  todayIso,
  onSelect,
  selectedDate,
}: {
  cursor: Date;
  monthGrid: { date: Date; inMonth: boolean }[];
  eventsByDate: Map<string, CalendarEvent[]>;
  todayIso: string;
  onSelect: (iso: string) => void;
  selectedDate: string | null;
}) {
  const monthNum = cursor.getMonth();
  return (
    <div className={styles.monthView}>
      <div className={styles.monthDayHead}>
        {KOR_DAY_HEAD.map(d => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className={styles.monthGrid}>
        {monthGrid.map(({ date, inMonth }) => {
          const iso = isoDate(date);
          const dayEvents = eventsByDate.get(iso) || [];
          const isToday = iso === todayIso;
          const isSelected = iso === selectedDate;
          return (
            <button
              type="button"
              key={iso}
              onClick={() => onSelect(iso)}
              className={`${styles.monthCell} ${date.getMonth() === monthNum ? '' : styles.monthCellOff} ${isToday ? styles.monthCellToday : ''} ${isSelected ? styles.monthCellSel : ''}`}
            >
              <span className={styles.monthCellDate}>{date.getDate()}</span>
              <div className={styles.monthCellEvents}>
                {dayEvents.slice(0, 3).map(e => (
                  <span
                    key={e.id}
                    className={`${styles.monthChip} ${e.importance === 'major' ? styles.monthChipMajor : ''} ${e.kind === 'earnings' ? styles.monthChipEarn : ''}`}
                    title={e.title}
                  >
                    {e.kind === 'earnings' ? `📊 ${e.ticker || e.title}` : e.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className={styles.monthMore}>+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const isMajor = event.importance === 'major';
  const isEarnings = event.kind === 'earnings';
  // 토스 패턴: actual(발표값) 있을 때만 metrics 모드. 미래 이벤트는 forecast/previous 있어도 시간 표시.
  const hasActual = event.actual != null && event.actual !== '' && event.actual !== '-';
  const timeText = getDefaultEventTime(event);
  return (
    <li className={styles.event}>
      <div className={styles.eventBody}>
        <span className={styles.eventIcon} aria-hidden="true">
          {isEarnings && event.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logo} alt="" className={styles.eventLogo} />
          ) : (
            <span className={`${styles.eventFlag} tf`}>{event.region === 'us' ? '🇺🇸' : '🇰🇷'}</span>
          )}
        </span>
        <span className={styles.eventTitle}>{event.title}</span>
        {isMajor && <span className={styles.eventMajorBadge}>주요</span>}
        {/* 실적발표 — 어닝콜 예정 칩 (실제 음원 없는 경우에도 표시) */}
        {isEarnings && !event.earningsCallUrl && (
          <span className={styles.eventEarningsPlanned}>
            <span className={styles.eventEarningsDot} aria-hidden="true" />
            어닝콜 예정
          </span>
        )}
        {isEarnings && event.earningsCallUrl && (
          <a
            href={event.earningsCallUrl}
            target="_blank"
            rel="noreferrer"
            className={styles.eventEarningsCall}
          >
            <span className={styles.eventEarningsCallIcon} aria-hidden="true">▶</span>
            어닝콜 다시 듣기
          </a>
        )}
      </div>
      {hasActual ? (
        <div className={styles.eventMetrics}>
          <span className={`${styles.metric} ${styles.metricActual}`} data-label="발표">{event.actual}</span>
          <span className={styles.metric} data-label="예측">{event.forecast ?? '-'}</span>
          <span className={`${styles.metric} ${styles.metricPrev}`} data-label="이전">{event.previous ?? '-'}</span>
        </div>
      ) : (
        <div className={styles.eventTimeRight}>{timeText}</div>
      )}
    </li>
  );
}

// ── utils ──
function buildMonthGrid(cursor: Date): { date: Date; inMonth: boolean }[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  // 월요일 시작
  const dayOfWeek = first.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(first);
  start.setDate(start.getDate() + offset);

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  // 마지막 주가 전부 다음 달이면 6주째 제거
  if (cells.slice(35).every(c => !c.inMonth)) {
    return cells.slice(0, 35);
  }
  return cells;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function expandWeekDays(startDate: string): string[] {
  const days: string[] = [];
  const base = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push(isoDate(d));
  }
  return days;
}

