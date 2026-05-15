import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { SITE_NAME, SITE_URL } from '@/lib/seo';
import { CalendarClient } from './CalendarClient';
import { CALENDAR_EVENTS, getWeeklyEvents, getWeeklyAiSummary } from '@/lib/marketCalendar';

export const revalidate = 600;

export const metadata: Metadata = {
  title: '증시 캘린더',
  description: '경제지표·실적 발표 일정을 한 화면에서. 이번주 핫한 이벤트와 한입 AI 요약까지.',
  keywords: ['증시 캘린더', '경제지표', '실적 발표', 'CPI', 'PMI', 'FOMC', SITE_NAME],
  alternates: { canonical: '/calendar' },
  openGraph: {
    title: `증시 캘린더 | ${SITE_NAME}`,
    description: '이번주·다음주 경제지표 + 실적 발표 일정을 한입 AI 요약과 함께.',
    url: `${SITE_URL}/calendar`,
    type: 'website',
  },
};

export default function CalendarPage() {
  const today = new Date();
  const weeks = getWeeklyEvents(today);
  const aiSummary = getWeeklyAiSummary();

  return (
    <AppShell active="etf" wide hideSlogan>
      <main className="pc-layout-stack">
        <CalendarClient
          events={CALENDAR_EVENTS}
          weeks={weeks}
          aiSummary={aiSummary}
          todayIso={today.toISOString().slice(0, 10)}
        />
      </main>
    </AppShell>
  );
}
