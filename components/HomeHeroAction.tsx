'use client';

/**
 * 홈 상단 hero — 행동 유도 zone (잡플래닛 톤 참고).
 *
 * 구조:
 *  1. Pill CTA — "재테크 궁금증 — 한입 AI 에게 물어보기"
 *  2. 컬러풀 아이콘 행 — 핵심 기능 8개 빠른 진입
 *
 * 클릭 동작:
 *  - Pill: 질문 작성 모달 또는 글로벌 검색 트리거
 *  - 아이콘: 각 페이지로 라우팅
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TICKER_INDICES, type TickerQuote } from '@/app/etf/MarketTicker';
import type { CalendarEvent } from '@/lib/marketCalendar';
import styles from './HomeHeroAction.module.css';

const ROTATING_QUESTIONS = [
  '월배당 ETF 골라줘',
  '코스피 다시 들어가도 될까?',
  '내 포트폴리오 진단해줘',
  'S&P500 vs 나스닥 뭐가 나아?',
  '지금 핫한 ETF 추세 알려줘',
  '연금저축 vs IRP 어디부터?',
];

type FeatureItem = {
  key: string;
  label: string;
  href: string;
  iconUrl: string;
  isExternal?: boolean;
};

// Microsoft Fluent 3D Emoji CDN (무료, MIT 라이선스)
const FLUENT = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

// 핵심 4개 — 3D 일러스트 아이콘 (background 박스 X)
const FEATURES: FeatureItem[] = [
  { key: 'ask',       label: '질문하기',       href: '/questions/create', iconUrl: `${FLUENT}/Speech%20balloon/3D/speech_balloon_3d.png` },
  { key: 'trending',  label: '핫한 ETF',       href: '/etf/trending',     iconUrl: `${FLUENT}/Fire/3D/fire_3d.png` },
  { key: 'portfolio', label: '포트폴리오 진단', href: '/portfolio',        iconUrl: `${FLUENT}/Bar%20chart/3D/bar_chart_3d.png` },
  { key: 'calendar',  label: '시장 캘린더',     href: '/calendar',         iconUrl: `${FLUENT}/Calendar/3D/calendar_3d.png` },
];

// pill avatar 도 fluent 3D 로
const PILL_AVATAR = `${FLUENT}/Thinking%20face/3D/thinking_face_3d.png`;

export function HomeHeroAction({
  tickerQuotes,
  nextEvent,
}: {
  tickerQuotes?: (TickerQuote | null)[];
  nextEvent?: { event: CalendarEvent; dDay: number } | null;
} = {}) {
  const router = useRouter();
  const [qIndex, setQIndex] = useState(0);

  // 질문 텍스트 6초마다 회전
  useEffect(() => {
    const t = setInterval(() => setQIndex(i => (i + 1) % ROTATING_QUESTIONS.length), 6000);
    return () => clearInterval(t);
  }, []);

  const openAsk = () => {
    // Cmd+K 글로벌 검색 트리거 (질문이든 검색이든 통합 입구)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  return (
    <section className={styles.wrap} aria-label="빠른 진입">
      {/* Pill CTA */}
      <button type="button" onClick={openAsk} className={styles.pill}>
        <span className={styles.pillAvatar} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PILL_AVATAR} alt="" className={styles.pillAvatarImg} />
        </span>
        <span className={styles.pillText}>
          <strong key={qIndex} className={styles.pillQuestion}>
            {ROTATING_QUESTIONS[qIndex]}
          </strong>
          <span className={styles.pillCta}>— 한입 AI 에게 물어보기</span>
        </span>
        <span className={styles.pillArrow} aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>

      {/* 빠른 진입 아이콘 행 */}
      <div className={styles.iconRow}>
        {FEATURES.map(f => {
          const content = (
            <>
              <span className={styles.iconBubble}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.iconUrl} alt="" className={styles.iconImg} loading="lazy" />
              </span>
              <span className={styles.iconLabel}>{f.label}</span>
            </>
          );
          return f.isExternal ? (
            <a
              key={f.key}
              href={f.href}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.iconItem}
            >
              {content}
            </a>
          ) : (
            <Link key={f.key} href={f.href} className={styles.iconItem}>
              {content}
            </Link>
          );
        })}
      </div>

      {/* 미니 시장 한 줄 — 정보 + 진입 */}
      {tickerQuotes && tickerQuotes.length > 0 && (
        <Link href="/etf" className={styles.miniTicker} aria-label="시장 흐름 보기">
          {nextEvent && (
            <span className={styles.miniDday}>
              <span className={styles.miniDdayBadge}>D-{nextEvent.dDay}</span>
              <span className={styles.miniEventTitle}>{nextEvent.event.title}</span>
            </span>
          )}
          {TICKER_INDICES.slice(0, 3).map((idx, i) => {
            const q = tickerQuotes[i];
            if (!q) return null;
            const up = q.change >= 0;
            const pct = `${up ? '+' : ''}${q.changePct.toFixed(2)}%`;
            return (
              <span key={idx.symbol} className={styles.miniQuote}>
                <span className={styles.miniName}>{idx.name}</span>
                <span className={`${styles.miniPct} ${up ? styles.up : styles.down}`}>{pct}</span>
              </span>
            );
          })}
          <span className={styles.miniMore} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        </Link>
      )}
    </section>
  );
}
