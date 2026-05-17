'use client';

/**
 * 차트 + 그림 — Lightweight Charts(가격 캔들) + SVG 오버레이(트렌드라인·수평선·텍스트·박스).
 *
 * 핵심 아이디어:
 *  - lightweight-charts 가 가격/시간 축을 그림
 *  - 그 위에 absolute SVG 깔아서 우리가 그림 도구를 직접 구현
 *  - 그림은 (timestamp, price) 좌표로 저장 → 어떤 줌에서도 위치 정확
 *  - editable=false (뷰어)면 toolbar 숨김, 그림은 그대로 보임
 *
 * 사용:
 *  <ChartBlock code="AAPL" range="1y" drawings={...} editable onChange={fn} />
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import styles from './ChartBlock.module.css';

type Candle = { time: string; open: number; high: number; low: number; close: number };

type Pt = { t: number; p: number }; // unix-seconds time + price
export type Drawing =
  | { id: string; kind: 'trendline'; a: Pt; b: Pt; color?: string }
  | { id: string; kind: 'hline'; price: number; color?: string }
  | { id: string; kind: 'rect'; a: Pt; b: Pt; color?: string }
  | { id: string; kind: 'text'; t: number; p: number; text: string; color?: string };

export type ChartBlockData = {
  code: string;
  range: '1m' | '3m' | '6m' | 'ytd' | '1y' | '3y' | '5y' | 'max';
  type?: 'candle' | 'line';
  drawings: Drawing[];
};

type Tool = 'select' | 'trendline' | 'hline' | 'rect' | 'text';

const COLORS = ['#3182F6', '#E42939', '#00A86B', '#F59E0B', '#191F28'];

function uid(): string { return Math.random().toString(36).slice(2, 10); }
function timeStrToUnix(s: string): number { return Math.floor(new Date(`${s}T00:00:00Z`).getTime() / 1000); }

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
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tool, setTool] = useState<Tool>('select');
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
    fetch(`/api/chart/history?code=${encodeURIComponent(data.code)}&range=${data.range}`)
      .then(r => r.json())
      .then(j => {
        if (aborted) return;
        if (j.error) { setError(j.error); setCandles([]); }
        else setCandles(j.candles || []);
      })
      .catch(e => { if (!aborted) setError(e?.message || 'fetch failed'); })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [data.code, data.range]);

  /* ---------- 차트 init ---------- */
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: 'transparent' }, textColor: '#4E5968', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(15,23,42,0.05)' }, horzLines: { color: 'rgba(15,23,42,0.05)' } },
      rightPriceScale: { borderColor: 'rgba(15,23,42,0.1)' },
      timeScale: { borderColor: 'rgba(15,23,42,0.1)', timeVisible: false },
      crosshair: { mode: 0 },
      autoSize: true,
      handleScale: editable ? { mouseWheel: true, pinch: true, axisPressedMouseMove: true } : false,
      handleScroll: editable ? true : false,
    });
    const useCandle = data.type !== 'line';
    const series = useCandle
      ? chart.addSeries(CandlestickSeries, {
          upColor: '#E42939', downColor: '#3182F6',
          borderUpColor: '#E42939', borderDownColor: '#3182F6',
          wickUpColor: '#E42939', wickDownColor: '#3182F6',
        })
      : chart.addSeries(LineSeries, { color: '#3182F6', lineWidth: 2 });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove(() => rerender());
    chart.timeScale().subscribeVisibleTimeRangeChange(() => rerender());

    const ro = new ResizeObserver(() => rerender());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [data.type, editable]);

  /* ---------- 데이터 → 차트 ---------- */
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || candles.length === 0) return;
    if (data.type === 'line') {
      series.setData(candles.map(c => ({ time: c.time as Time, value: c.close })));
    } else {
      series.setData(candles.map(c => ({
        time: c.time as Time,
        open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    }
    chartRef.current?.timeScale().fitContent();
    rerender();
  }, [candles, data.type]);

  /* ---------- 좌표 변환 ---------- */
  const project = (pt: Pt): { x: number; y: number } | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;
    const x = chart.timeScale().timeToCoordinate(pt.t as UTCTimestamp);
    const y = series.priceToCoordinate(pt.p);
    if (x == null || y == null) return null;
    return { x, y };
  };
  const unproject = (x: number, y: number): Pt | null => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return null;
    const t = chart.timeScale().coordinateToTime(x);
    const p = series.coordinateToPrice(y);
    if (t == null || p == null) return null;
    // t may be 'YYYY-MM-DD' string or UTCTimestamp
    const tNum = typeof t === 'number' ? t : timeStrToUnix(t as any);
    return { t: tNum, p };
  };
  const priceAtY = (y: number): number | null => {
    const p = seriesRef.current?.coordinateToPrice(y);
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
    // trendline / rect: 2-step
    if (tool === 'trendline' || tool === 'rect') {
      const pt = unproject(x, y);
      if (!pt) return;
      if (!draft) {
        setDraft({ a: pt });
      } else {
        pushDrawing({
          id: uid(),
          kind: tool,
          a: draft.a,
          b: pt,
          color,
        } as Drawing);
        setDraft(null);
      }
    }
  };

  const pushDrawing = (d: Drawing) => {
    onChange?.({ ...data, drawings: [...drawings, d] });
  };
  const removeDrawing = (id: string) => {
    onChange?.({ ...data, drawings: drawings.filter(d => d.id !== id) });
  };
  const clearAll = () => {
    if (!confirm('모든 그림을 지울까요?')) return;
    onChange?.({ ...data, drawings: [] });
  };

  /* ---------- 그림 렌더 ---------- */
  const w = containerRef.current?.clientWidth || 600;
  const h = containerRef.current?.clientHeight || 320;

  const renderedDrawings = useMemo(() => {
    return drawings.map(d => {
      if (d.kind === 'hline') {
        const series = seriesRef.current;
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
              fill={(d.color || '#3182F6') + '22'}
              stroke={d.color || '#3182F6'} strokeWidth={1.5} />
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

  /* draft 미리보기 (trendline/rect 2-step 중간) */
  const draftPreview = (() => {
    if (!draft || !hoverXY || (tool !== 'trendline' && tool !== 'rect')) return null;
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
    return null;
  })();

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <strong className={styles.code}>{data.code.toUpperCase()}</strong>
          <select
            value={data.range}
            onChange={editable ? e => onChange?.({ ...data, range: e.target.value as any }) : undefined}
            disabled={!editable}
            className={styles.rangeSelect}
          >
            <option value="1m">1개월</option>
            <option value="3m">3개월</option>
            <option value="6m">6개월</option>
            <option value="ytd">YTD</option>
            <option value="1y">1년</option>
            <option value="3y">3년</option>
            <option value="5y">5년</option>
            <option value="max">전체</option>
          </select>
          <select
            value={data.type || 'candle'}
            onChange={editable ? e => onChange?.({ ...data, type: e.target.value as any }) : undefined}
            disabled={!editable}
            className={styles.rangeSelect}
          >
            <option value="candle">캔들</option>
            <option value="line">라인</option>
          </select>
        </div>
        {editable && (
          <div className={styles.headerRight}>
            <button type="button" onClick={clearAll} className={styles.ghostBtn}>모두 지우기</button>
            {onRemove && <button type="button" onClick={onRemove} className={styles.ghostBtnDanger}>차트 삭제</button>}
          </div>
        )}
      </header>

      {editable && (
        <div className={styles.toolbar}>
          <button type="button" onClick={() => { setTool('select'); setDraft(null); }} className={`${styles.tool} ${tool === 'select' ? styles.toolOn : ''}`}>✋ 선택</button>
          <button type="button" onClick={() => { setTool('trendline'); setDraft(null); }} className={`${styles.tool} ${tool === 'trendline' ? styles.toolOn : ''}`}>📈 추세선</button>
          <button type="button" onClick={() => { setTool('hline'); setDraft(null); }} className={`${styles.tool} ${tool === 'hline' ? styles.toolOn : ''}`}>━ 수평선</button>
          <button type="button" onClick={() => { setTool('rect'); setDraft(null); }} className={`${styles.tool} ${tool === 'rect' ? styles.toolOn : ''}`}>▭ 박스</button>
          <button type="button" onClick={() => { setTool('text'); setDraft(null); }} className={`${styles.tool} ${tool === 'text' ? styles.toolOn : ''}`}>T 텍스트</button>
          <div className={styles.colorRow}>
            {COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`${styles.swatch} ${color === c ? styles.swatchOn : ''}`}
                style={{ background: c }}
                aria-label={`색 ${c}`}
              />
            ))}
          </div>
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

      {editable && draft && (
        <div className={styles.draftHint}>
          두 번째 지점을 클릭하면 완성돼요. <button type="button" onClick={() => setDraft(null)} className={styles.linkBtn}>취소</button>
        </div>
      )}
    </div>
  );
}
