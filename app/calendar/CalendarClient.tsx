'use client';

import { useMemo, useState } from 'react';
import type { CalendarEvent } from '@/lib/marketCalendar';
import styles from './Calendar.module.css';

type Filter = 'all' | 'economic' | 'earnings';
type Region = 'all' | 'kr' | 'us';

type Props = {
  events: CalendarEvent[];
  weeks: { week: string; startDate: string; events: CalendarEvent[] }[];
  aiSummary: string;
  todayIso: string;
};

const KOR_DAY = ['월', '화', '수', '목', '금', '토'];

export function CalendarClient({ events, weeks, aiSummary, todayIso }: Props) {
  const [filterKind, setFilterKind] = useState<Filter>('all');
  const [filterRegion, setFilterRegion] = useState<Region>('all');
  const [view, setView] = useState<'week' | 'month'>('week');
  const [cursor, setCursor] = useState(() => new Date(todayIso));

  const filtered = useMemo(() => {
    return weeks.map(w => ({
      ...w,
      events: w.events.filter(e =>
        (filterKind === 'all' || e.kind === filterKind) &&
        (filterRegion === 'all' || e.region === filterRegion),
      ),
    }));
  }, [weeks, filterKind, filterRegion]);

  // 월간 캘린더 — 6주 × 6일 그리드
  const monthGrid = useMemo(() => buildMonthGrid(cursor), [cursor]);
  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const arr = m.get(e.date) || [];
      arr.push(e);
      m.set(e.date, arr);
    }
    return m;
  }, [events]);

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
              {KOR_DAY.map(d => (
                <span key={d} className={styles.miniDayLabel}>{d}</span>
              ))}
            </div>
            <div className={styles.miniGrid}>
              {monthGrid.map(({ date, inMonth }) => {
                const iso = isoDate(date);
                const isToday = iso === todayIso;
                const hasEvent = eventsByDate.has(iso);
                return (
                  <button
                    type="button"
                    key={iso}
                    className={`${styles.miniCell} ${inMonth ? '' : styles.miniCellOff} ${isToday ? styles.miniCellToday : ''}`}
                  >
                    <span>{date.getDate()}</span>
                    {hasEvent && <span className={styles.miniDot} aria-hidden="true" />}
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

        {/* ── 우측: 필터 + 주별 이벤트 리스트 ── */}
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

          {filtered.map(w => (
            <div key={w.startDate} className={styles.weekBlock}>
              <div className={styles.weekHead}>
                <strong>{w.week}</strong>
                <span className={styles.weekHeadMeta}>
                  <span>발표</span>
                  <span>예측</span>
                  <span>이전</span>
                </span>
              </div>
              {w.events.length === 0 ? (
                <div className={styles.weekEmpty}>일정이 없어요</div>
              ) : (
                <ul className={styles.eventList}>
                  {w.events.map(e => (
                    <EventRow key={e.id} event={e} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const dayLabel = formatDayLabel(event.date);
  const flag = event.region === 'us' ? '🇺🇸' : '🇰🇷';
  return (
    <li className={styles.event}>
      <span className={styles.eventDay}>{dayLabel}</span>
      <div className={styles.eventBody}>
        <span className={`${styles.eventFlag} tf`} aria-hidden="true">{flag}</span>
        <span className={styles.eventTitle}>{event.title}</span>
        {event.kind === 'earnings' && (
          <span className={styles.eventTag}>주요</span>
        )}
      </div>
      <span className={styles.eventActual}>{event.actual ?? '—'}</span>
      <span className={styles.eventForecast}>{event.forecast ?? '—'}</span>
      <span className={styles.eventPrevious}>{event.previous ?? '—'}</span>
    </li>
  );
}

function buildMonthGrid(cursor: Date): { date: Date; inMonth: boolean }[] {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  // 월요일 시작 (KST 캘린더 톤)
  const dayOfWeek = first.getDay(); // 0=일
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(first);
  start.setDate(start.getDate() + offset);

  const cells: { date: Date; inMonth: boolean }[] = [];
  // 5 주 (35칸) — 부족하면 6 주
  const totalCells = 35;
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month });
  }
  return cells;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${day} ${dayOfWeek}`;
}
