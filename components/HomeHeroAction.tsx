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
  emoji: string;
  bg: string;
  isExternal?: boolean;
};

const FEATURES: FeatureItem[] = [
  { key: 'ask',       label: '질문하기',    href: '/?ask=1',    emoji: '💬', bg: 'linear-gradient(135deg, #6FA8FF, #3182F6)' },
  { key: 'trending',  label: '핫한 ETF',    href: '/etf/trending', emoji: '🔥', bg: 'linear-gradient(135deg, #FF8866, #FF4D4D)' },
  { key: 'sparring',  label: '머니 스파링', href: '/sparring',  emoji: '⚔️', bg: 'linear-gradient(135deg, #B383FF, #7C4DFF)' },
  { key: 'portfolio', label: '포트폴리오',  href: '/portfolio', emoji: '📊', bg: 'linear-gradient(135deg, #44C781, #2E9C5C)' },
  { key: 'calendar',  label: '시장 캘린더', href: '/calendar',  emoji: '📅', bg: 'linear-gradient(135deg, #FFC36B, #FF9F1C)' },
  { key: 'creators',  label: '핀플루언서',  href: '/creators',  emoji: '✨', bg: 'linear-gradient(135deg, #FF8FB7, #E94986)' },
  { key: 'etf',       label: 'ETF 발견',    href: '/etf',       emoji: '🧭', bg: 'linear-gradient(135deg, #6FE0E0, #2BB1B1)' },
  { key: 'blog',      label: '한입 블로그', href: 'https://hannipmoney.com', emoji: '📰', bg: 'linear-gradient(135deg, #A8B8D0, #6B7AA0)', isExternal: true },
];

export function HomeHeroAction() {
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
          <span className={`${styles.pillEmoji} tf`}>🤔</span>
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
              <span className={styles.iconBubble} style={{ background: f.bg }}>
                <span className={`${styles.iconEmoji} tf`}>{f.emoji}</span>
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
    </section>
  );
}
