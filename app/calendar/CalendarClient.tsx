'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CalendarEvent } from '@/lib/marketCalendar';
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
  const [cursor, setCursor] = useState(() => new Date(todayIso));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const matchFilter = (e: CalendarEvent) =>
    (filterKind === 'all' || e.kind === filterKind) &&
    (filterRegion === 'all' || e.region === filterRegion);

  const filteredEvents = useMemo(() => events.filter(matchFilter), [events, filterKind, filterRegion]);

  const filteredWeeks = useMemo(
    () => weeks.map(w => ({ ...w, events: w.events.filter(matchFilter) })),
    [weeks, filterKind, filterRegion],
  );

  // D-day Hero
  const nextMajor = useMemo(() => {
    const upcoming = filteredEvents
      .filter(e => e.importance === 'major' && e.date >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (upcoming.length === 0) return null;
    const ev = upcoming[0];
    const dDay = Math.round(
      (new Date(ev.date).getTime() - new Date(todayIso).getTime()) / 86_400_000,
    );
    return { event: ev, dDay };
  }, [filteredEvents, todayIso]);

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
  const goToday = () => {
    setCursor(new Date(todayIso));
    setSelectedDate(todayIso);
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>증시 캘린더</h1>
          <p className={styles.sub}>경제지표 · 실적 발표 · 한입 AI 주간 요약</p>
        </div>
      </header>

      {/* ── Hero: 다음 major 이벤트 D-day ── */}
      {nextMajor && (
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroEyebrow}>다음 핵심 이벤트</span>
            <strong className={styles.heroTitle}>
              <span className={styles.heroFlag}>{nextMajor.event.region === 'us' ? '🇺🇸' : '🇰🇷'}</span>
              {nextMajor.event.title}
            </strong>
            <span className={styles.heroMeta}>
              {formatFullDate(nextMajor.event.date)}
              {nextMajor.event.forecast && ` · 예측 ${nextMajor.event.forecast}`}
              {nextMajor.event.previous && ` · 이전 ${nextMajor.event.previous}`}
            </span>
          </div>
          <div className={styles.heroRight}>
            <span className={styles.heroDdayLabel}>D-</span>
            <span className={styles.heroDday}>{nextMajor.dDay === 0 ? 'DAY' : nextMajor.dDay}</span>
          </div>
        </section>
      )}

      <div className={styles.layout}>
        {/* ── 좌측: 미니 캘린더 + AI 요약 ── */}
        <aside className={styles.side}>
          <section className={styles.miniCal}>
            <div className={styles.miniHead}>
              <span className={styles.monthLabel}>{monthLabel}</span>
              <div className={styles.miniNav}>
                <button type="button" onClick={prevMonth} aria-label="이전 달">‹</button>
                <button type="button" onClick={goToday} aria-label="오늘로" className={styles.todayBtn}>
                  오늘
                </button>
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
    </div>
  );
}

// ── 주별 뷰: 요일별 그룹핑 ──
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
        const grouped = groupByDate(w.events);
        return (
          <div key={w.startDate} className={styles.weekBlock}>
            <div className={styles.weekHead}>
              <strong>{w.week}</strong>
              <span className={styles.weekCount}>{w.events.length}건</span>
            </div>
            {w.events.length === 0 ? (
              <div className={styles.weekEmpty}>일정이 없어요</div>
            ) : (
              <div className={styles.daysWrap}>
                {grouped.map(({ date, events }) => {
                  const isToday = date === todayIso;
                  const isSelected = date === selectedDate;
                  const dDay = Math.round(
                    (new Date(date).getTime() - new Date(todayIso).getTime()) / 86_400_000,
                  );
                  return (
                    <div
                      key={date}
                      ref={el => { dayRefs.current[date] = el; }}
                      className={`${styles.dayGroup} ${isToday ? styles.dayGroupToday : ''} ${isSelected ? styles.dayGroupSel : ''}`}
                    >
                      <div className={styles.dayHead}>
                        <span className={styles.dayDate}>
                          {new Date(date).getDate()}
                          <span className={styles.dayDow}>{KOR_DAY[new Date(date).getDay()]}</span>
                        </span>
                        {isToday ? (
                          <span className={styles.dayDday}>오늘</span>
                        ) : dDay > 0 && dDay <= 14 ? (
                          <span className={styles.dayDdayPale}>D-{dDay}</span>
                        ) : null}
                      </div>
                      <ul className={styles.eventList}>
                        {events.map(e => <EventRow key={e.id} event={e} />)}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
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
  const flag = event.region === 'us' ? '🇺🇸' : '🇰🇷';
  const isMajor = event.importance === 'major';
  return (
    <li className={`${styles.event} ${isMajor ? styles.eventMajor : ''}`}>
      <div className={styles.eventBody}>
        <span className={`${styles.eventFlag} tf`} aria-hidden="true">{flag}</span>
        <span className={styles.eventTitle}>{event.title}</span>
        {event.kind === 'earnings' && event.ticker && (
          <span className={styles.eventTicker}>{event.ticker}</span>
        )}
        {isMajor && <span className={styles.eventMajorDot} aria-hidden="true" />}
      </div>
      <div className={styles.eventMetrics}>
        <span className={styles.metric}>
          <em>발표</em>
          <strong>{event.actual ?? '—'}</strong>
        </span>
        <span className={styles.metric}>
          <em>예측</em>
          <strong>{event.forecast ?? '—'}</strong>
        </span>
        <span className={styles.metric}>
          <em>이전</em>
          <strong className={styles.metricPrev}>{event.previous ?? '—'}</strong>
        </span>
      </div>
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

function groupByDate(events: CalendarEvent[]): { date: string; events: CalendarEvent[] }[] {
  const m = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const arr = m.get(e.date) || [];
    arr.push(e);
    m.set(e.date, arr);
  }
  return Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => ({ date, events }));
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${KOR_DAY[d.getDay()]})`;
}
