'use client';

/**
 * ETF 수익률 차트 (FunETF 스타일 멀티 시리즈).
 *
 * 시리즈:
 *  - NAV (= 종가, 분홍 굵은 라인)
 *  - 종가 (초록 얇은 라인, 시각 구분용 살짝 alpha)
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
import styles from './EtfChart.module.css';

type PeriodKey = 'w1' | 'm1' | 'm3' | 'ytd' | 'y1' | 'y3' | 'all' | 'custom';

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
const CLOSE_COLOR = '#00987D';

type Benchmark = { key: string; name: string; color: string; history: PricePoint[] };

type SeriesKey = 'nav' | 'close' | 'aum' | string; // benchmark.key

type Props = {
  code: string;
  price?: string;
  changeTone?: 'up' | 'down' | 'flat';
  history?: PricePoint[];
  /** 멀티 벤치마크 시리즈 */
  benchmarks?: Benchmark[];
};

/** 시계열을 시작점=0 기준 누적 % 로 정규화 + 점 수 다운샘플 */
function toReturnSeries(history: PricePoint[], startDate: string, endDate: string): ChartPoint[] {
  if (history.length < 2) return [];
  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  const sliced = history.filter(p => {
    const t = new Date(p.date).getTime();
    return t >= startTs && t <= endTs;
  });
  if (sliced.length < 2) return [];
  const base = sliced[0].close;
  if (!base) return [];
  const stride = Math.max(1, Math.floor(sliced.length / 140));
  const out: ChartPoint[] = [];
  for (let i = 0; i < sliced.length; i += stride) {
    const p = sliced[i];
    out.push({ date: p.date, value: ((p.close - base) / base) * 100 });
  }
  // 마지막 점 강제 포함
  const last = sliced[sliced.length - 1];
  if (out[out.length - 1]?.date !== last.date) {
    out.push({ date: last.date, value: ((last.close - base) / base) * 100 });
  }
  return out;
}

export function EtfChart({ code, history = [], benchmarks = [], changeTone = 'flat' }: Props) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>('m1');
  const [pendingStart, setPendingStart] = useState<string>('');
  const [pendingEnd, setPendingEnd] = useState<string>('');
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);

  // 시리즈 표시 상태 — 기본: NAV + 종가 (FunETF 스크린샷 톤)
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    nav: true,
    close: true,
    aum: false, // 데이터 없음 — 비활성
    ...Object.fromEntries(benchmarks.map(b => [b.key, false])),
  });

  // 현재 기간의 시작/끝 날짜 계산
  const { startDate, endDate, periodLabel } = useMemo(() => {
    if (history.length < 2) {
      const today = new Date().toISOString().slice(0, 10);
      return { startDate: today, endDate: today, periodLabel: '—' };
    }
    const lastDate = history[history.length - 1].date;
    if (periodKey === 'custom' && customRange) {
      return { startDate: customRange.start, endDate: customRange.end, periodLabel: '기간 지정' };
    }
    const period = PERIODS.find(p => p.key === periodKey) || PERIODS[1];
    const end = new Date(lastDate);
    let start: Date;
    if (period.key === 'ytd') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (period.key === 'all') {
      start = new Date(history[0].date);
    } else {
      start = new Date(end);
      start.setDate(start.getDate() - period.days);
    }
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      periodLabel: period.label,
    };
  }, [history, periodKey, customRange]);

  // 메인 NAV 시리즈 계산 (= 종가 데이터로 동일)
  const navPoints = useMemo(() => toReturnSeries(history, startDate, endDate), [history, startDate, endDate]);
  const returnPct = navPoints.length > 1 ? navPoints[navPoints.length - 1].value : 0;
  const tone: 'up' | 'down' | 'flat' = returnPct > 0 ? 'up' : returnPct < 0 ? 'down' : 'flat';

  // 멀티 시리즈 배열
  const extraSeries = useMemo<ExtraSeries[]>(() => {
    const arr: ExtraSeries[] = [];
    // 종가 — NAV 와 동일 데이터 (NAV ≈ 거래종가), 시각 구분 위해 alpha 다르게
    if (active.close && navPoints.length > 1) {
      arr.push({ key: 'close', color: CLOSE_COLOR, points: navPoints, width: 1.4 });
    }
    // 벤치마크
    for (const b of benchmarks) {
      if (active[b.key] && b.history.length > 1) {
        const bPts = toReturnSeries(b.history, startDate, endDate);
        if (bPts.length > 1) {
          arr.push({ key: b.key, color: b.color, points: bPts, width: 1.5 });
        }
      }
    }
    return arr;
  }, [active, navPoints, benchmarks, startDate, endDate]);

  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  const fmtAxis = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
  const arrow = tone === 'up' ? '▲' : tone === 'down' ? '▼' : '–';

  // NAV 단독(다른 시리즈 없음)이면 area fill 살리기 (시각 풍부함)
  const showArea = active.nav && extraSeries.length === 0;

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
    <section className={styles.wrap} aria-label="수익률 차트">
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <h2 className={styles.title}>수익률</h2>
          {history.length > 1 && (
            <span className={styles.headSub}>{history[history.length - 1].date} 기준</span>
          )}
        </div>
        <div className={styles.headRight}>
          <span className={styles.returnLabel}>{periodLabel} 누적</span>
          <span className={`${styles.returnHero} ${styles[tone]}`}>
            {navPoints.length > 1 ? (
              <>
                <span className={styles.returnArrow}>{arrow}</span>
                {fmtPct(Math.abs(returnPct))}
              </>
            ) : '—'}
          </span>
        </div>
      </div>

      {/* 컨트롤 — 기간 칩 + 날짜 범위 + 상품 추가 */}
      <div className={styles.controls}>
        <div className={styles.tabs} role="tablist" aria-label="기간 선택">
          {PERIODS.map(p => (
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
        <Link href={`/etf/compare?a=${code}`} className={styles.addBtn}>
          + 상품 추가
        </Link>
      </div>

      {/* 시리즈 체크박스 범례 (FunETF 톤) */}
      <div className={styles.legend} role="group" aria-label="표시할 시리즈">
        <Checkbox
          color={NAV_COLOR}
          label="NAV"
          checked={active.nav}
          onChange={v => setActive(s => ({ ...s, nav: v }))}
        />
        <Checkbox
          color={CLOSE_COLOR}
          label="종가"
          checked={active.close}
          onChange={v => setActive(s => ({ ...s, close: v }))}
        />
        <Checkbox
          color="#1DB5AE"
          label="순자산[우측]"
          checked={active.aum}
          onChange={() => {}}
          disabled
          hint="데이터 준비 중"
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
      </div>

      {/* 차트 */}
      {active.nav && navPoints.length > 1 ? (
        <PriceChart
          data={navPoints}
          tone={tone}
          height={280}
          valueFormat={fmtAxis}
          yAxisTicks={5}
          mainColor={NAV_COLOR}
          noArea={!showArea}
          extraSeries={extraSeries}
        />
      ) : extraSeries.length > 0 && extraSeries[0].points.length > 1 ? (
        // NAV 끄면 첫 활성 시리즈를 메인으로
        <PriceChart
          data={extraSeries[0].points}
          tone={tone}
          height={280}
          valueFormat={fmtAxis}
          yAxisTicks={5}
          mainColor={extraSeries[0].color}
          noArea
          extraSeries={extraSeries.slice(1)}
        />
      ) : (
        <div className={styles.empty}>표시할 시리즈를 1개 이상 선택해주세요.</div>
      )}

      {/* 하단 disclaimer + 데이터 출처 */}
      <p className={styles.footnote}>
        ▪ NAV는 분배금을 재투자한 수정기준가 기준이고, <strong>실비용(총보수·기타비용·수수료)이 이미 반영</strong>돼 있어요.
        <br />
        ▪ 데이터는 Yahoo Finance 종가 기준으로, NAV ≈ 종가로 표시돼요. (정확한 NAV/괴리율은 운용사 공시 참고)
      </p>
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
