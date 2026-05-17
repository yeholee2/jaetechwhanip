'use client';

/**
 * 차트 블록 — Lightweight Charts 기반 토스 스타일 UI.
 *
 * 기능:
 *  - 캔들 + 거래량 보조 패널
 *  - 이동평균선 (기본 5·20·60·120, 토글 가능)
 *  - 타임프레임 (5분/일/주/월/년)
 *  - SVG 오버레이로 그림 도구 (추세선·수평선·박스·텍스트)
 *  - 좌표는 (timestamp, price) 로 저장 → 줌·기간 변경에도 정확
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { ScreenshotButton } from '@/components/share/ScreenshotButton';
import styles from './ChartBlock.module.css';

type Candle = {
  time: string | number;
  open: number; high: number; low: number; close: number;
  volume?: number;
};

type Pt = { t: number; p: number };
export type Drawing =
  | { id: string; kind: 'trendline'; a: Pt; b: Pt; color?: string }
  | { id: string; kind: 'hline'; price: number; color?: string }
  | { id: string; kind: 'rect'; a: Pt; b: Pt; color?: string }
  | { id: string; kind: 'text'; t: number; p: number; text: string; color?: string };

export type Timeframe = '5m' | '1d' | '1w' | '1mo' | '1y';

export type ChartBlockData = {
  code: string;
  /** 신규: tf 우선. legacy range 도 받음 (1m, 3m, 6m, ytd, 1y, 3y, 5y, max → 1d) */
  tf?: Timeframe;
  range?: string;
  type?: 'candle' | 'line';
  drawings: Drawing[];
  /** 이동평균 표시 여부 — 기본 ON */
  showMA?: boolean;
  /** 거래량 표시 여부 — 기본 ON */
  showVolume?: boolean;
};

type Tool = 'select' | 'trendline' | 'hline' | 'rect' | 'text' | 'ruler';

/** 좌측 세로 툴바 아이콘 — TradingView/빗썸 스타일 SVG */
function ToolIcon({ name, size = 18 }: { name: string; size?: number }) {
  const s = { width: size, height: size, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'select':  // 십자선 커서
      return <svg viewBox="0 0 24 24" {...s}><path d="M12 3v18M3 12h18" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></svg>;
    case 'trendline':
      return <svg viewBox="0 0 24 24" {...s}><circle cx="5" cy="19" r="1.6" /><circle cx="19" cy="5" r="1.6" /><path d="M6 18 18 6" /></svg>;
    case 'hline':
      return <svg viewBox="0 0 24 24" {...s}><circle cx="5" cy="12" r="1.4" /><path d="M7 12h12" strokeDasharray="0" /></svg>;
    case 'rect':
      return <svg viewBox="0 0 24 24" {...s}><rect x="4" y="6" width="16" height="12" rx="1" /></svg>;
    case 'text':
      return <svg viewBox="0 0 24 24" {...s} style={{ fontFamily: 'serif' }}><text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="700" fill="currentColor" stroke="none">T</text></svg>;
    case 'ruler':
      return <svg viewBox="0 0 24 24" {...s}><path d="M3 16l13-13 5 5L8 21z" /><path d="M7 16l2 2M10 13l2 2M13 10l2 2M16 7l2 2" /></svg>;
    case 'magnet':
      return <svg viewBox="0 0 24 24" {...s}><path d="M5 4v9a7 7 0 0 0 14 0V4M5 4h4v9M15 4h4v9" /></svg>;
    case 'clear':
      return <svg viewBox="0 0 24 24" {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    default:
      return null;
  }
}

const COLORS = ['#3182F6', '#E42939', '#00A86B', '#F59E0B', '#191F28'];

// 토스/네이버 스타일 이평선 — 5(노랑)·20(빨강)·60(주황)·120(보라)
const MA_LINES: { period: number; color: string }[] = [
  { period: 5,   color: '#F59E0B' },
  { period: 20,  color: '#E42939' },
  { period: 60,  color: '#F97316' },
  { period: 120, color: '#8B5CF6' },
];

const TF_LABELS: { key: Timeframe; label: string }[] = [
  { key: '5m',  label: '5분' },
  { key: '1d',  label: '일' },
  { key: '1w',  label: '주' },
  { key: '1mo', label: '월' },
  { key: '1y',  label: '년' },
];

function uid(): string { return Math.random().toString(36).slice(2, 10); }
function timeStrToUnix(s: string): number { return Math.floor(new Date(`${s}T00:00:00Z`).getTime() / 1000); }

/** 단순 이동평균 — close 기준 */
function calcSMA(candles: Candle[], period: number): { time: Time; value: number }[] {
  if (candles.length < period) return [];
  const out: { time: Time; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) {
      out.push({ time: candles[i].time as Time, value: sum / period });
    }
  }
  return out;
}

export function ChartBlock({
  data,
  editable = false,
  onChange,
  onRemove,
}: {
  data: ChartBlockData;
  editable?: boolean;
  onChange?: (next: ChartBlockData) => void;
  onRemove?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const volSeriesRef = useRef<ISeriesApi<any> | null>(null);
  const maSeriesRefs = useRef<ISeriesApi<any>[]>([]);

  const tf: Timeframe = (data.tf as Timeframe) || mapLegacyRangeToTf(data.range);
  const showMA = data.showMA !== false;
  const showVolume = data.showVolume !== false;

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tool, setTool] = useState<Tool>('select');
  const [magnet, setMagnet] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [draft, setDraft] = useState<{ a: Pt } | null>(null);
  const [hoverXY, setHoverXY] = useState<{ x: number; y: number } | null>(null);
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  const drawings = data.drawings;

  /* ---------- 데이터 fetch ---------- */
  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError('');
    fetch(`/api/chart/history?code=${encodeURIComponent(data.code)}&tf=${tf}`)
      .then(r => r.json())
      .then(j => {
        if (aborted) return;
        if (j.error) { setError(j.error); setCandles([]); }
        else setCandles(j.candles || []);
      })
      .catch(e => { if (!aborted) setError(e?.message || 'fetch failed'); })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [data.code, tf]);

  /* ---------- 차트 init ---------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#4E5968', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(15,23,42,0.05)' }, horzLines: { color: 'rgba(15,23,42,0.05)' } },
      rightPriceScale: { borderColor: 'rgba(15,23,42,0.1)', scaleMargins: { top: 0.05, bottom: showVolume ? 0.28 : 0.05 } },
      timeScale: { borderColor: 'rgba(15,23,42,0.1)', timeVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
      handleScale: editable ? { mouseWheel: true, pinch: true, axisPressedMouseMove: true } : false,
      handleScroll: editable ? true : false,
    });

    const useCandle = data.type !== 'line';
    const priceSeries = useCandle
      ? chart.addSeries(CandlestickSeries, {
          upColor: '#E42939', downColor: '#3182F6',
          borderUpColor: '#E42939', borderDownColor: '#3182F6',
          wickUpColor: '#E42939', wickDownColor: '#3182F6',
          priceLineVisible: true, priceLineStyle: 2, priceLineWidth: 1, priceLineColor: '#E42939',
          lastValueVisible: true,
        })
      : chart.addSeries(LineSeries, { color: '#3182F6', lineWidth: 2 });

    chartRef.current = chart;
    priceSeriesRef.current = priceSeries;

    // 거래량 (하단 30%)
    if (showVolume) {
      const volSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
        color: '#94a3b8',
      });
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.75, bottom: 0 },
        borderVisible: false,
      });
      volSeriesRef.current = volSeries;
    }

    // 이동평균 시리즈
    if (showMA) {
      for (const ma of MA_LINES) {
        const line = chart.addSeries(LineSeries, {
          color: ma.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        });
        maSeriesRefs.current.push(line);
      }
    }

    chart.subscribeCrosshairMove(() => rerender());
    chart.timeScale().subscribeVisibleTimeRangeChange(() => rerender());

    const ro = new ResizeObserver(() => rerender());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      priceSeriesRef.current = null;
      volSeriesRef.current = null;
      maSeriesRefs.current = [];
    };
  }, [data.type, editable, showVolume, showMA]);

  /* ---------- 데이터 → 차트 시리즈 ---------- */
  useEffect(() => {
    const series = priceSeriesRef.current;
    if (!series || candles.length === 0) return;
    if (data.type === 'line') {
      series.setData(candles.map(c => ({ time: c.time as Time, value: c.close })));
    } else {
      series.setData(candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    }

    if (volSeriesRef.current && showVolume) {
      volSeriesRef.current.setData(
        candles.map(c => ({
          time: c.time as Time,
          value: c.volume || 0,
          color: c.close >= c.open ? 'rgba(228,41,57,0.45)' : 'rgba(49,130,246,0.45)',
        })),
      );
    }

    if (showMA && maSeriesRefs.current.length > 0) {
      MA_LINES.forEach((ma, i) => {
        const series = maSeriesRefs.current[i];
        if (!series) return;
        series.setData(calcSMA(candles, ma.period));
      });
    }

    chartRef.current?.timeScale().fitContent();
    rerender();
  }, [candles, data.type, showMA, showVolume]);

  /* ---------- 좌표 변환 ---------- */
  const project = (pt: Pt): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const series = priceSeriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(pt.t as UTCTimestamp);
    const y = series.priceToCoordinate(pt.p);
    if (x == null || y == null) return null;
    return { x, y };
  };
  const unproject = (x: number, y: number): Pt | null => {
    const chart = chartRef.current;
    const series = priceSeriesRef.current;
    if (!chart || !series) return null;
    const t = chart.timeScale().coordinateToTime(x);
    const p = series.coordinateToPrice(y);
    if (t == null || p == null) return null;
    const tNum = typeof t === 'number' ? t : timeStrToUnix(t as any);
    if (!magnet) return { t: tNum, p };
    // 자석 모드: 가장 가까운 캔들의 가장 가까운 OHLC 값으로 스냅
    let nearest = candles[0];
    let minDt = Infinity;
    for (const c of candles) {
      const ct = typeof c.time === 'number' ? c.time : timeStrToUnix(String(c.time));
      const dt = Math.abs(ct - tNum);
      if (dt < minDt) { minDt = dt; nearest = c; }
    }
    if (!nearest) return { t: tNum, p };
    const snapT = typeof nearest.time === 'number' ? nearest.time : timeStrToUnix(String(nearest.time));
    const choices = [nearest.open, nearest.high, nearest.low, nearest.close];
    let snapP = nearest.close, mind = Infinity;
    for (const v of choices) {
      const d = Math.abs(v - p);
      if (d < mind) { mind = d; snapP = v; }
    }
    return { t: snapT, p: snapP };
  };
  const priceAtY = (y: number): number | null => {
    const p = priceSeriesRef.current?.coordinateToPrice(y);
    return p == null ? null : p;
  };

  /* ---------- SVG 이벤트 ---------- */
  const onSvgMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!editable) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setHoverXY({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const onSvgLeave = () => setHoverXY(null);

  const onSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!editable || tool === 'select') return;
    const rect = svgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'hline') {
      const p = priceAtY(y);
      if (p == null) return;
      pushDrawing({ id: uid(), kind: 'hline', price: p, color });
      return;
    }
    if (tool === 'text') {
      const pt = unproject(x, y);
      if (!pt) return;
      const text = prompt('텍스트 입력');
      if (!text) return;
      pushDrawing({ id: uid(), kind: 'text', t: pt.t, p: pt.p, text, color });
      return;
    }
    if (tool === 'trendline' || tool === 'rect') {
      const pt = unproject(x, y);
      if (!pt) return;
      if (!draft) {
        setDraft({ a: pt });
      } else {
        pushDrawing({
          id: uid(), kind: tool,
          a: draft.a, b: pt, color,
        } as Drawing);
        setDraft(null);
      }
      return;
    }
    if (tool === 'ruler') {
      // 측정 도구 — 저장 X, 그냥 미리보기로만
      const pt = unproject(x, y);
      if (!pt) return;
      if (!draft) {
        setDraft({ a: pt });
      } else {
        // 두 번째 클릭 → 측정 결과를 텍스트 마커로 잠깐 저장 (선택)
        const dp = pt.p - draft.a.p;
        const dpPct = draft.a.p > 0 ? (dp / draft.a.p) * 100 : 0;
        const dDays = Math.round((pt.t - draft.a.t) / 86400);
        alert(`측정 결과\n가격: ${dp > 0 ? '+' : ''}${dp.toFixed(2)} (${dpPct > 0 ? '+' : ''}${dpPct.toFixed(2)}%)\n기간: ${dDays}일`);
        setDraft(null);
      }
      return;
    }
  };

  const pushDrawing = (d: Drawing) => onChange?.({ ...data, drawings: [...drawings, d] });
  const removeDrawing = (id: string) => onChange?.({ ...data, drawings: drawings.filter(d => d.id !== id) });
  const clearAll = () => {
    if (!confirm('모든 그림을 지울까요?')) return;
    onChange?.({ ...data, drawings: [] });
  };

  /* ---------- 그림 렌더 ---------- */
  const w = containerRef.current?.clientWidth || 600;
  const h = containerRef.current?.clientHeight || 400;

  const renderedDrawings = useMemo(() => {
    return drawings.map(d => {
      if (d.kind === 'hline') {
        const series = priceSeriesRef.current;
        if (!series) return null;
        const y = series.priceToCoordinate(d.price);
        if (y == null) return null;
        return (
          <g key={d.id} className={styles.drawing}>
            <line x1={0} y1={y} x2={w} y2={y} stroke={d.color || '#3182F6'} strokeWidth={1.5} strokeDasharray="4 3" />
            <text x={6} y={y - 4} fill={d.color || '#3182F6'} fontSize={11} fontWeight={700}>
              {d.price.toFixed(2)}
            </text>
            {editable && (
              <circle cx={w - 12} cy={y} r={6} fill="#fff" stroke={d.color || '#3182F6'} strokeWidth={1.5}
                onClick={() => removeDrawing(d.id)} style={{ cursor: 'pointer' }} />
            )}
          </g>
        );
      }
      if (d.kind === 'trendline') {
        const a = project(d.a), b = project(d.b);
        if (!a || !b) return null;
        return (
          <g key={d.id} className={styles.drawing}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={d.color || '#3182F6'} strokeWidth={2} />
            {editable && (
              <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={6} fill="#fff" stroke={d.color || '#3182F6'} strokeWidth={1.5}
                onClick={() => removeDrawing(d.id)} style={{ cursor: 'pointer' }} />
            )}
          </g>
        );
      }
      if (d.kind === 'rect') {
        const a = project(d.a), b = project(d.b);
        if (!a || !b) return null;
        const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
        const rw = Math.abs(b.x - a.x), rh = Math.abs(b.y - a.y);
        return (
          <g key={d.id} className={styles.drawing}>
            <rect x={x} y={y} width={rw} height={rh}
              fill={(d.color || '#3182F6') + '22'} stroke={d.color || '#3182F6'} strokeWidth={1.5} />
            {editable && (
              <circle cx={x + rw - 8} cy={y + 8} r={6} fill="#fff" stroke={d.color || '#3182F6'} strokeWidth={1.5}
                onClick={() => removeDrawing(d.id)} style={{ cursor: 'pointer' }} />
            )}
          </g>
        );
      }
      if (d.kind === 'text') {
        const pt = project({ t: d.t, p: d.p });
        if (!pt) return null;
        return (
          <g key={d.id} className={styles.drawing}
            onClick={editable ? () => removeDrawing(d.id) : undefined}
            style={editable ? { cursor: 'pointer' } : undefined}
          >
            <text x={pt.x} y={pt.y} fill={d.color || '#191F28'} fontSize={13} fontWeight={800}>
              {d.text}
            </text>
          </g>
        );
      }
      return null;
    });
  }, [drawings, w, h, editable]); // eslint-disable-line

  const draftPreview = (() => {
    if (!draft || !hoverXY) return null;
    const a = project(draft.a);
    if (!a) return null;
    if (tool === 'trendline') {
      return <line x1={a.x} y1={a.y} x2={hoverXY.x} y2={hoverXY.y} stroke={color} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />;
    }
    if (tool === 'rect') {
      const x = Math.min(a.x, hoverXY.x), y = Math.min(a.y, hoverXY.y);
      const rw = Math.abs(hoverXY.x - a.x), rh = Math.abs(hoverXY.y - a.y);
      return <rect x={x} y={y} width={rw} height={rh} fill={color + '22'} stroke={color} strokeWidth={1.5} strokeDasharray="3 3" opacity={0.6} />;
    }
    if (tool === 'ruler') {
      const p1 = priceAtY(a.y) ?? 0;
      const p2 = priceAtY(hoverXY.y) ?? 0;
      const dp = p2 - p1;
      const dpPct = p1 > 0 ? (dp / p1) * 100 : 0;
      const midX = (a.x + hoverXY.x) / 2;
      const midY = (a.y + hoverXY.y) / 2;
      const tone = dp >= 0 ? '#E42939' : '#3182F6';
      return (
        <g>
          <line x1={a.x} y1={a.y} x2={hoverXY.x} y2={hoverXY.y} stroke={tone} strokeWidth={2} strokeDasharray="2 3" opacity={0.85} />
          <circle cx={a.x} cy={a.y} r={4} fill={tone} />
          <circle cx={hoverXY.x} cy={hoverXY.y} r={4} fill={tone} />
          <rect x={midX - 50} y={midY - 18} width={100} height={30} rx={6} fill={tone} />
          <text x={midX} y={midY - 4} fontSize={11} fontWeight={800} fill="#fff" textAnchor="middle">
            {dp > 0 ? '+' : ''}{dp.toFixed(2)}
          </text>
          <text x={midX} y={midY + 7} fontSize={10} fontWeight={700} fill="#fff" textAnchor="middle">
            {dpPct > 0 ? '+' : ''}{dpPct.toFixed(2)}%
          </text>
        </g>
      );
    }
    return null;
  })();

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <strong className={styles.code}>{data.code.toUpperCase()}</strong>

          {/* 타임프레임 (5분/일/주/월/년) */}
          <div className={styles.tfRow}>
            {TF_LABELS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={editable ? () => onChange?.({ ...data, tf: t.key }) : undefined}
                disabled={!editable}
                className={`${styles.tfBtn} ${tf === t.key ? styles.tfBtnOn : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 이평선/거래량 토글 */}
          <button
            type="button"
            onClick={editable ? () => onChange?.({ ...data, showMA: !showMA }) : undefined}
            disabled={!editable}
            className={`${styles.toggleBtn} ${showMA ? styles.toggleBtnOn : ''}`}
            title="이동평균선 (5/20/60/120)"
          >
            📈 MA
          </button>
          <button
            type="button"
            onClick={editable ? () => onChange?.({ ...data, showVolume: !showVolume }) : undefined}
            disabled={!editable}
            className={`${styles.toggleBtn} ${showVolume ? styles.toggleBtnOn : ''}`}
            title="거래량"
          >
            📊 거래량
          </button>
        </div>

        <div className={styles.headerRight}>
          <ScreenshotButton
            target={() => wrapRef.current}
            filename={`${data.code}-chart`}
            label="📷"
          />
          {editable && (
            <>
              <button type="button" onClick={clearAll} className={styles.ghostBtn}>모두 지우기</button>
              {onRemove && <button type="button" onClick={onRemove} className={styles.ghostBtnDanger}>차트 삭제</button>}
            </>
          )}
        </div>
      </header>

      {/* MA 라벨 */}
      {showMA && candles.length > 0 && (
        <div className={styles.maLabel}>
          이동평균선
          {MA_LINES.map(ma => (
            <span key={ma.period} className={styles.maChip} style={{ color: ma.color }}>{ma.period}</span>
          ))}
        </div>
      )}

      <div className={styles.chartLayout}>
        {/* 좌측 세로 툴바 — 빗썸/트레이딩뷰 스타일 */}
        {editable && (
          <div className={styles.vToolbar}>
            <ToolBtn icon="select" label="선택" active={tool === 'select'} onClick={() => { setTool('select'); setDraft(null); }} />
            <div className={styles.toolDiv} />
            <ToolBtn icon="trendline" label="추세선" active={tool === 'trendline'} onClick={() => { setTool('trendline'); setDraft(null); }} />
            <ToolBtn icon="hline" label="수평선" active={tool === 'hline'} onClick={() => { setTool('hline'); setDraft(null); }} />
            <ToolBtn icon="rect" label="박스" active={tool === 'rect'} onClick={() => { setTool('rect'); setDraft(null); }} />
            <ToolBtn icon="text" label="텍스트" active={tool === 'text'} onClick={() => { setTool('text'); setDraft(null); }} />
            <div className={styles.toolDiv} />
            <ToolBtn icon="ruler" label="자 (측정)" active={tool === 'ruler'} onClick={() => { setTool('ruler'); setDraft(null); }} />
            <ToolBtn icon="magnet" label="자석 (OHLC 스냅)" active={magnet} onClick={() => setMagnet(m => !m)} />
            <div className={styles.toolDiv} />
            <div className={styles.colorCol}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={`${styles.swatchV} ${color === c ? styles.swatchVOn : ''}`}
                  style={{ background: c }} aria-label={`색 ${c}`}
                />
              ))}
            </div>
            <div className={styles.toolDiv} />
            <ToolBtn icon="clear" label="모두 지우기" onClick={clearAll} danger />
          </div>
        )}

        <div className={styles.chartArea}>
          <div ref={containerRef} className={styles.chart} />
          <svg
            ref={svgRef}
            className={styles.overlay}
            style={{ pointerEvents: editable ? 'auto' : 'none', cursor: editable && tool !== 'select' ? 'crosshair' : 'default' }}
            onMouseMove={onSvgMove}
            onMouseLeave={onSvgLeave}
            onClick={onSvgClick}
          >
            {renderedDrawings}
            {draftPreview}
          </svg>

          {loading && <div className={styles.statusOverlay}>불러오는 중…</div>}
          {error && !loading && <div className={styles.statusOverlay}>{error}</div>}
          {!loading && !error && candles.length === 0 && (
            <div className={styles.statusOverlay}>가격 데이터가 없어요</div>
          )}
        </div>
      </div>

      {editable && draft && (
        <div className={styles.draftHint}>
          두 번째 지점을 클릭하면 완성돼요. <button type="button" onClick={() => setDraft(null)} className={styles.linkBtn}>취소</button>
        </div>
      )}
    </div>
  );
}

function ToolBtn({ icon, label, active, danger, onClick }: { icon: string; label: string; active?: boolean; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.vTool} ${active ? styles.vToolOn : ''} ${danger ? styles.vToolDanger : ''}`}
      title={label}
      aria-label={label}
    >
      <ToolIcon name={icon} />
    </button>
  );
}

function mapLegacyRangeToTf(range?: string): Timeframe {
  if (!range) return '1d';
  // legacy 기간 파라미터들은 다 일봉으로
  if (/^[35]y|max|3y$/.test(range)) return '1w';   // 장기는 주봉
  if (/^1y|ytd|6m$/.test(range)) return '1d';
  return '1d';
}
