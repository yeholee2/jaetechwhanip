'use client';

/**
 * 이번주 AI 요약 — 상세 모달 (Toss증권 패턴).
 * 4섹션 구조: 헤드라인 / 주요 소식 단락 / 그 외 소식 단락 / 경제지표 표 / 실적발표 표
 */
import { useEffect } from 'react';
import type { CalendarEvent } from '@/lib/marketCalendar';
import { getDefaultEventTime, sortByImportance } from '@/lib/marketCalendar';
import styles from './Calendar.module.css';

type Props = {
  headline: string;          // 헤드라인 (LLM 요약 한 줄)
  events: CalendarEvent[];   // 이번주 이벤트
  onClose: () => void;
};

function deriveSections(events: CalendarEvent[]) {
  const major = events.filter(e => e.importance === 'major');
  const usEarn = major.filter(e => e.region === 'us' && e.kind === 'earnings');
  const usEcon = major.filter(e => e.region === 'us' && e.kind === 'economic');
  const krAll = events.filter(e => e.region === 'kr');
  const notMajor = events.filter(e => e.importance !== 'major');

  const leadParts = [
    usEcon.length && `미국 경제지표 ${usEcon.length}건`,
    usEarn.length && `미국 주요 실적 ${usEarn.length}건`,
  ].filter(Boolean).join('과 ');
  const primary = leadParts
    ? `${leadParts}이 예정되어 있어요. 거시 지표와 빅테크 실적은 주식·채권 시장 흐름을 좌우하니 ETF 보유자가 특히 관심 가져볼 만해요.`
    : '이번 주는 굵직한 이벤트가 적어 비교적 잔잔한 한 주예요.';

  const secParts = [
    krAll.length > 0 && `국내 이벤트 ${krAll.length}건`,
    notMajor.length > 0 && `보조 지표·실적 ${notMajor.length}건`,
  ].filter(Boolean).join(', ');
  const secondary = secParts
    ? `그 외에 ${secParts}이 예정되어 있어요. 내 포트폴리오 비중에 따라 챙겨보세요.`
    : '주요 일정 외 부가 이벤트는 없어요.';

  return { primary, secondary };
}

function fmtMD(date: string): string {
  const d = new Date(date);
  return `${d.getDate()}${['일','월','화','수','목','금','토'][d.getDay()]}`;
}

export function WeeklySummaryModal({ headline, events, onClose }: Props) {
  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const sections = deriveSections(events);
  const econ = sortByImportance(events.filter(e => e.kind === 'economic' && e.importance === 'major')).slice(0, 8);
  const earn = sortByImportance(events.filter(e => e.kind === 'earnings' && e.importance === 'major')).slice(0, 8);

  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="이번주 AI 요약" onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} aria-label="닫기" onClick={onClose}>×</button>

        <div className={styles.modalHead}>
          <span className={styles.modalEyebrow}>✦ 이번주 AI 요약</span>
          <h2 className={styles.modalHeadline}>{headline}</h2>
        </div>

        <div className={styles.modalSection}>
          <h3 className={styles.modalSectionTitle}>
            <span className={styles.modalCheck} aria-hidden="true">✓</span>
            이번주 주요 소식이에요
          </h3>
          <p className={styles.modalBody}>{sections.primary}</p>
        </div>

        <div className={styles.modalSection}>
          <h3 className={styles.modalSectionTitle}>
            <span className={styles.modalCheck} aria-hidden="true">✓</span>
            이런 소식도 있어요
          </h3>
          <p className={styles.modalBody}>{sections.secondary}</p>
        </div>

        {econ.length > 0 && (
          <div className={styles.modalTableWrap}>
            <h3 className={styles.modalTableHead}>주요 경제지표</h3>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>날짜</th>
                  <th>일정</th>
                  <th style={{ textAlign: 'right', width: 160 }}>발표</th>
                </tr>
              </thead>
              <tbody>
                {econ.map(e => (
                  <tr key={e.id}>
                    <td className={styles.modalTableDate}>{fmtMD(e.date)}</td>
                    <td>
                      <span className={`tf ${styles.modalTableFlag}`}>{e.region === 'us' ? '🇺🇸' : '🇰🇷'}</span>
                      {e.title}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--rw-text-muted)', fontSize: 12 }}>
                      {e.actual ?? e.forecast ?? getDefaultEventTime(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {earn.length > 0 && (
          <div className={styles.modalTableWrap}>
            <h3 className={styles.modalTableHead}>주요 실적발표</h3>
            <table className={styles.modalTable}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>날짜</th>
                  <th>일정</th>
                  <th style={{ textAlign: 'right', width: 160 }}>발표</th>
                </tr>
              </thead>
              <tbody>
                {earn.map(e => (
                  <tr key={e.id}>
                    <td className={styles.modalTableDate}>{fmtMD(e.date)}</td>
                    <td>
                      <span className={`tf ${styles.modalTableFlag}`}>{e.region === 'us' ? '🇺🇸' : '🇰🇷'}</span>
                      {e.title}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--rw-text-muted)', fontSize: 12 }}>
                      {getDefaultEventTime(e)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
