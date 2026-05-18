'use client';

/**
 * ETF 수익률 차트 (FunETF 스타일 멀티 시리즈).
 *
 * 시리즈:
 *  - 이 ETF 시장가격(종가, 분홍 굵은 라인)
 *  - 순자산[우측] (현재 데이터 없음 — 비활성)
 *  - KOSPI / S&P500(H) / 나스닥100(H)
 *
 * 컨트롤:
 *  - 기간 칩: 1주 / 1개월 / 3개월 / 연초후 / 1년 / 3년 / 전체
 *  - 날짜 범위 (조회 버튼으로 적용)
 *  - "+상품 추가" — /etf/compare 로 이동
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PriceChart, type ChartPoint, type ExtraSeries } from '@/components/ui';
import type { PricePoint } from '@/lib/etfPriceHistory';
import type { NaverEtfNavPoint } from '@/lib/naverEtfData';
import styles from './EtfChart.module.css';

type PeriodKey = 'w1' | 'm1' | 'm3' | 'ytd' | 'y1' | 'y3' | 'all' | 'custom';
type ChartMode = 'price' | 'nav' | 'premium' | 'compare';

const PERIODS: { key: Exclude<PeriodKey, 'custom'>; label: string; days: number }[] = [
  { key: 'w1',  label: '1주', days: 7 },
  { key: 'm1',  label: '1개월', days: 30 },
  { key: 'm3',  label: '3개월', days: 90 },
  { key: 'ytd', label: '연초후', days: 0 },
  { key: 'y1',  label: '1년', days: 365 },
  { key: 'y3',  label: '3년', days: 1095 },
  { key: 'all', label: '전체', days: 999999 },
];

const NAV_COLOR = '#F0295A';
const PRICE_COLOR = '#F0295A';
const NAV_LINE_COLOR = '#1B64DA';
const PREMIUM_COLOR = '#F59E0B';

const MODES: { key: ChartMode; label: string }[] = [
  { key: 'price', label: '가격' },
  { key: 'nav', label: 'NAV' },
  { key: 'premium', label: '괴리율' },
  { key: 'compare', label: '비교' },
];

type Benchmark = { key: string; name: string; color: string; history: PricePoint[] };

type SeriesKey = 'nav' | 'close' | 'aum' | string; // benchmark.key

type Props = {
  code: string;
  price?: string;
  changeTone?: 'up' | 'down' | 'flat';
  history?: PricePoint[];
  navHistory?: NaverEtfNavPoint[];
  compact?: boolean;
  /** 멀티 벤치마크 시리즈 */
  benchmarks?: Benchmark[];
};

function sliceByRange<T extends { date: string }>(history: T[], startDate: string, endDate: string): T[] {
  if (history.length === 0) return [];
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  return history.filter(p => {
    const t = new Date(p.date).getTime();
    return t >= startTs && t <= endTs;
  });
}

/** 시계열을 시작점=0 기준 누적 % 로 정규화 + 점 수 다운샘플 */
function toReturnSeries<T extends { date: string }>(
  history: T[],
  startDate: string,
  endDate: string,
  valueOf: (point: T) => number,
): ChartPoint[] {
  if (history.length < 2) return [];
  const sliced = sliceByRange(history, startDate, endDate);
  if (sliced.length < 2) return [];
  const base = valueOf(sliced[0]);
  if (!base) return [];
  const stride = Math.max(1, Math.floor(sliced.length / 140));
  const out: ChartPoint[] = [];
  for (let i = 0; i < sliced.length; i += stride) {
    const p = sliced[i];
    out.push({ date: p.date, value: ((valueOf(p) - base) / base) * 100 });
  }
  // 마지막 점 강제 포함
  const last = sliced[sliced.length - 1];
  if (out[out.length - 1]?.date !== last.date) {
    out.push({ date: last.date, value: ((valueOf(last) - base) / base) * 100 });
  }
  return out;
}

function toRawSeries<T extends { date: string }>(
  history: T[],
  startDate: string,
  endDate: string,
  valueOf: (point: T) => number,
): ChartPoint[] {
  const sliced = sliceByRange(history, startDate, endDate).filter(point => Number.isFinite(valueOf(point)));
  if (sliced.length < 2) return [];
  const stride = Math.max(1, Math.floor(sliced.length / 140));
  const out: ChartPoint[] = [];
  for (let i = 0; i < sliced.length; i += stride) {
    const p = sliced[i];
    out.push({ date: p.date, value: valueOf(p) });
  }
  const last = sliced[sliced.length - 1];
  if (out[out.length - 1]?.date !== last.date) {
    out.push({ date: last.date, value: valueOf(last) });
  }
  return out;
}

export function EtfChart({ code, history = [], navHistory = [], benchmarks = [], changeTone = 'flat', compact = false }: Props) {
  const [mode, setMode] = useState<ChartMode>('price');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('m1');
  const [pendingStart, setPendingStart] = useState<string>('');
  const [pendingEnd, setPendingEnd] = useState<string>('');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

  // 시리즈 표시 상태 — 기본은 이 ETF만, 벤치마크는 사용자 선택
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    nav: true,
    ...Object.fromEntries(benchmarks.map(b => [b.key, false])),
  });

  const rangeSource = useMemo(
    () => ((mode === 'nav' || mode === 'premium') && navHistory.length > 1
      ? navHistory.map(point => ({ date: point.date, close: point.nav }))
      : history),
    [history, mode, navHistory],
  );

  // 현재 기간의 시작/끝 날짜 계산
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (rangeSource.length < 2) {
      const today = new Date().toISOString().slice(0, 10);
      return { startDate: today, endDate: today, periodLabel: '—' };
    }
    const lastDate = rangeSource[rangeSource.length - 1].date;
    if (periodKey === 'custom' && customRange) {
      return { startDate: customRange.start, endDate: customRange.end, periodLabel: '기간 지정' };
    }
    const period = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
    const end = new Date(lastDate);
    let start: Date;
    if (period.key === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (period.key === 'all') {
      start = new Date(rangeSource[0].date);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - period.days);
    }
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      periodLabel: period.label,
    };
  }, [rangeSource, periodKey, customRange]);

  // 메인 ETF 수익률 시리즈 계산 (Yahoo Finance 종가 기준)
  const pricePoints = useMemo(
    () => toReturnSeries(history, startDate, endDate, point => point.close),
    [history, startDate, endDate],
  );
  const navPoints = useMemo(
    () => toReturnSeries(navHistory, startDate, endDate, point => point.nav),
    [navHistory, startDate, endDate],
  );
  const premiumPoints = useMemo(
    () => toRawSeries(navHistory, startDate, endDate, point => point.premium),
    [navHistory, startDate, endDate],
  );

  const mainPoints = mode === 'nav'
    ? navPoints
    : mode === 'premium'
      ? premiumPoints
      : pricePoints;
  const mainValue = mainPoints.length > 1 ? mainPoints[mainPoints.length - 1].value : 0;
  const tone: 'up' | 'down' | 'flat' = mainValue > 0 ? 'up' : mainValue < 0 ? 'down' : 'flat';

  // 멀티 시리즈 배열
  const extraSeries = useMemo<ExtraSeries[]>(() => {
    if (mode !== 'compare') return [];
    const arr: ExtraSeries[] = [];
    // 벤치마크 (이 ETF vs KOSPI/S&P/나스닥100)
    for (const b of benchmarks) {
      if (active[b.key] && b.history.length > 1) {
        const bPts = toReturnSeries(b.history, startDate, endDate, point => point.close);
        if (bPts.length > 1) {
          arr.push({ key: b.key, color: b.color, points: bPts, width: 1.5 });
        }
      }
    }
    return arr;
  }, [active, mode, benchmarks, startDate, endDate]);

  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  const fmtAxis = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  const valueFormat = mode === 'premium' ? (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%` : fmtAxis;
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '–';

  // 이 ETF 단독(다른 시리즈 없음)이면 area fill 살리기
  const showArea = mode !== 'compare' && extraSeries.length === 0;
  const mainColor = mode === 'nav' ? NAV_LINE_COLOR : mode === 'premium' ? PREMIUM_COLOR : PRICE_COLOR;
  const title = mode === 'price'
    ? '가격 흐름'
    : mode === 'nav'
      ? 'NAV 흐름'
      : mode === 'premium'
        ? '괴리율 흐름'
        : '가격 비교';
  const label = mode === 'premium' ? `${periodLabel} 최신 괴리율` : `${periodLabel} 누적 수익률`;
  const emptyMessage = mode === 'nav'
    ? 'NAV 히스토리를 원문에서 확인할 수 없어요.'
    : mode === 'premium'
      ? '괴리율 히스토리를 원문에서 확인할 수 없어요.'
      : '표시할 가격 데이터가 아직 없어요.';
  const chartHeight = compact ? 220 : 280;
  const visiblePeriods = compact
    ? PERIODS.filter(period => ['w1', 'm1', 'm3', 'y1', 'all'].includes(period.key))
    : PERIODS;

  const onChip = (k: PeriodKey) => {
    setPeriodKey(k);
    if (k !== 'custom') setCustomRange(null);
  };

  const applyDateRange = () => {
    if (pendingStart && pendingEnd && pendingStart <= pendingEnd) {
      setCustomRange({ start: pendingStart, end: pendingEnd });
      setPeriodKey('custom');
    }
  };

  return (
    <section className={`${styles.wrap} ${compact ? styles.compact : ''}`} aria-label="가격 흐름 차트">
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <h2 className={styles.title}>{title}</h2>
          {rangeSource.length > 1 && (
            <span className={styles.headSub}>{rangeSource[rangeSource.length - 1].date} 기준</span>
          )}
          {mainPoints.length > 1 && (
            <div className={styles.returnBlock}>
              <span className={`${styles.returnHero} ${styles[tone]}`}>
                <span className={styles.returnArrow}>{arrow}</span>
                {mode === 'premium' ? fmtPct(mainValue) : fmtPct(Math.abs(mainValue))}
              </span>
              <span className={styles.returnLabel}>{label}</span>
            </div>
          )}
        </div>
      </div>

      <div className={styles.modeTabs} role="tablist" aria-label="차트 보기 방식">
        {MODES.map(item => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={mode === item.key}
            className={`${styles.modeTab} ${mode === item.key ? styles.modeTabOn : ''}`}
            onClick={() => setMode(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 컨트롤 — 기간 칩 + 날짜 범위 + 상품 추가 */}
      <div className={styles.controls}>
        <div className={styles.tabs} role="tablist" aria-label="기간 선택">
          {visiblePeriods.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={p.key === periodKey}
              className={`${styles.tab} ${p.key === periodKey ? styles.tabOn : ''}`}
              onClick={() => onChip(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {!compact && (
          <div className={styles.dateRange}>
            <input
              type="date"
              value={pendingStart}
              onChange={e => setPendingStart(e.target.value)}
              aria-label="시작일"
              className={styles.dateInput}
            />
            <span className={styles.dateSep}>~</span>
            <input
              type="date"
              value={pendingEnd}
              onChange={e => setPendingEnd(e.target.value)}
              aria-label="종료일"
              className={styles.dateInput}
            />
            <button
              type="button"
              onClick={applyDateRange}
              className={styles.applyBtn}
              disabled={!pendingStart || !pendingEnd || pendingStart > pendingEnd}
            >
              조회
            </button>
          </div>
        )}
        {!compact && (
          <Link href={`/etf/compare?a=${code}`} className={styles.addBtn}>
            + 상품 추가
          </Link>
        )}
      </div>

      {mode === 'compare' && (
        <div className={styles.legend} role="group" aria-label="표시할 시리즈">
          <Checkbox
            color={NAV_COLOR}
            label="이 ETF"
            checked={active.nav}
            onChange={v => setActive(s => ({ ...s, nav: v }))}
          />
          {benchmarks.map(b => (
            <Checkbox
              key={b.key}
              color={b.color}
              label={b.name}
              checked={!!active[b.key]}
              onChange={v => setActive(s => ({ ...s, [b.key]: v }))}
            />
          ))}
          <span className={styles.legendNote}>비교 지수 선택</span>
        </div>
      )}

      {/* 차트 */}
      {(mode !== 'compare' || active.nav) && mainPoints.length > 1 ? (
        <PriceChart
          data={mainPoints}
          tone={tone}
          height={chartHeight}
          valueFormat={valueFormat}
          yAxisTicks={5}
          mainColor={mainColor}
          noArea={!showArea}
          extraSeries={extraSeries}
        />
      ) : extraSeries.length > 0 && extraSeries[0].points.length > 1 ? (
        // NAV 끄면 첫 활성 시리즈를 메인으로
        <PriceChart
          data={extraSeries[0].points}
          tone={tone}
          height={chartHeight}
          valueFormat={valueFormat}
          yAxisTicks={5}
          mainColor={extraSeries[0].color}
          noArea
          extraSeries={extraSeries.slice(1)}
        />
      ) : (
        <div className={styles.empty}>{mode === 'compare' ? '표시할 시리즈를 1개 이상 선택해주세요.' : emptyMessage}</div>
      )}

      {/* 하단 disclaimer + 데이터 출처 */}
      {!compact && (
        <p className={styles.footnote}>
          가격 수익률은 종가 기준, NAV·괴리율은 네이버증권 ETF분석 원문 기준으로 계산돼요.
          <br />
          공식 NAV, iNAV, 괴리율은 운용사·거래소 공시 값과 다를 수 있어요.
        </p>
      )}
    </section>
  );
}

function Checkbox({
  color, label, checked, onChange, disabled, hint,
}: {
  color: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label
      className={`${styles.legendChip} ${disabled ? styles.legendChipDisabled : ''} ${checked ? styles.legendChipOn : ''}`}
      title={hint}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
      />
      <span className={styles.legendBox} style={{ borderColor: color, background: checked ? color : 'transparent' }} aria-hidden="true">
        {checked && <span className={styles.legendCheck}>✓</span>}
      </span>
      <span style={{ color: disabled ? 'var(--rw-text-muted)' : 'var(--rw-text-strong)' }}>{label}</span>
    </label>
  );
}
