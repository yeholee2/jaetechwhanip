'use client';

/**
 * 내 ETF 자산 홈 — 도미노 패턴.
 * 3개 상태 분기:
 *  - 비로그인: 진입 카드 → /auth
 *  - 로그인 + 보유 0: "ETF 추가" CTA + 모달
 *  - 로그인 + 보유 있음: 총자산 + 5액션 + 보유 리스트
 */
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import {
  type UserEtfHolding,
  type HoldingDisplay,
  listMyHoldings,
  buildHoldingDisplays,
  summarizePortfolio,
} from '@/lib/etfPortfolio';
import { etfPath } from '@/lib/etfs';
import { fetchEtfLivePrices } from '@/lib/etfLivePrices';
import { HoldingAddModal } from './HoldingAddModal';
import styles from './MyEtfSection.module.css';

const ACTIONS = [
  { key: 'profit', label: '수익', icon: '%' },
  { key: 'tax', label: '세금', icon: '🧾' },
  { key: 'dividend', label: '배당', icon: '💵' },
  { key: 'trend', label: '추이', icon: '📈' },
  { key: 'allocation', label: '비중', icon: '🥧' },
] as const;

/** live prices API 응답 → code: number 맵 */
function parseLivePriceMap(items: { code: string; price: string }[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const m = item.price.replace(/,/g, '').match(/\d+(\.\d+)?/);
    if (m) map[item.code] = parseFloat(m[0]);
  }
  return map;
}

export function MyEtfSection() {
  const [authState, setAuthState] = useState<'loading' | 'unauth' | 'auth'>('loading');
  const [holdings, setHoldings] = useState<UserEtfHolding[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'price' | 'valuation'>('price');
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});

  // live prices API로 시세 로드
  useEffect(() => {
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(parseLivePriceMap(res.items));
    });
  }, []);

  const displays = useMemo(
    () => buildHoldingDisplays(holdings, priceMap),
    [holdings, priceMap],
  );
  const summary = useMemo(() => summarizePortfolio(displays), [displays]);

  // 인증 + 보유 fetch
  useEffect(() => {
    let mounted = true;
    if (!hasSupabase()) {
      setAuthState('unauth');
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        setAuthState('auth');
        listMyHoldings().then(rows => {
          if (mounted) setHoldings(rows);
        });
      } else {
        setAuthState('unauth');
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!mounted) return;
      if (session) {
        setAuthState('auth');
        listMyHoldings().then(rows => mounted && setHoldings(rows));
      } else {
        setAuthState('unauth');
        setHoldings([]);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleAdded = (newRow: UserEtfHolding) => {
    setHoldings(prev => [newRow, ...prev]);
    setModalOpen(false);
  };

  // 로딩 (스켈레톤 짧게)
  if (authState === 'loading') {
    return <div className={styles.skeleton} aria-hidden="true" />;
  }

  // ── 비로그인: 단순 진입 카드 ──
  if (authState === 'unauth') {
    return (
      <Link className={styles.row} href="/auth?next=/etf">
        <span className={styles.entryIcon} aria-hidden="true">📊</span>
        <div className={styles.body}>
          <strong>내 ETF 포트폴리오 시작하기</strong>
          <span>수량·평단 입력 → 자산·비중·예상 배당 자동 계산</span>
        </div>
        <span className={styles.arrow} aria-hidden="true">›</span>
      </Link>
    );
  }

  // ── 로그인 + 보유 0: 노출 안 함 (UX 노이즈 제거 — 추가는 우상단 + 버튼으로) ──
  if (holdings.length === 0) {
    return null;
  }

  // ── 로그인 + 보유: 도미노 풀 화면 ──
  return (
    <section className={styles.dash} aria-label="내 ETF 포트폴리오">
      <div className={styles.head}>
        <span className={styles.headLabel}>총 자산</span>
        <button type="button" className={styles.addBtn} onClick={() => setModalOpen(true)}>
          + 추가
        </button>
      </div>
      <div className={styles.total}>
        {Math.round(summary.total_market_value).toLocaleString()}원
      </div>
      <div className={summary.total_pnl >= 0 ? styles.pnlUp : styles.pnlDown}>
        {summary.total_pnl >= 0 ? '+' : ''}
        {Math.round(summary.total_pnl).toLocaleString()}원
        {' '}
        ({summary.total_pnl >= 0 ? '+' : ''}{(summary.total_pnl_pct * 100).toFixed(2)}%)
        <span className={styles.pnlMeta}> · 총 수익</span>
      </div>

      <div className={styles.actions}>
        {ACTIONS.map(a => (
          <Link
            key={a.key}
            className={styles.actionItem}
            href={`/etf?tab=analysis&type=${a.key}`}
          >
            <span className={styles.actionIcon} aria-hidden="true">{a.icon}</span>
            <span className={styles.actionLabel}>{a.label}</span>
          </Link>
        ))}
      </div>

      <div className={styles.investHead}>
        <h3 className={styles.investTitle}>투자</h3>
        <div className={styles.viewToggle}>
          <button
            type="button"
            className={`${styles.viewTab} ${viewMode === 'price' ? styles.viewTabActive : ''}`}
            onClick={() => setViewMode('price')}
          >
            시세
          </button>
          <button
            type="button"
            className={`${styles.viewTab} ${viewMode === 'valuation' ? styles.viewTabActive : ''}`}
            onClick={() => setViewMode('valuation')}
          >
            평가
          </button>
        </div>
      </div>

      <ul className={styles.list}>
        {displays.map(d => (
          <li key={d.id}>
            <Link className={styles.item} href={d.etf_code ? etfPath(d.etf_code) : '#'}>
              <div className={styles.itemInfo}>
                <strong>{d.etf_name}</strong>
                {viewMode === 'price' ? (
                  <span>
                    현재가 {d.current_price != null ? `${d.current_price.toLocaleString()}원` : '—'}
                  </span>
                ) : (
                  <span>{d.quantity}주 · 평단 {d.avg_price.toLocaleString()}원</span>
                )}
              </div>
              <div className={styles.itemRight}>
                {viewMode === 'price' ? (
                  <span className={(d.pnl_pct ?? 0) >= 0 ? styles.up : styles.down}>
                    {d.pnl_pct == null
                      ? '—'
                      : `${d.pnl_pct >= 0 ? '+' : ''}${(d.pnl_pct * 100).toFixed(2)}%`}
                  </span>
                ) : (
                  <>
                    <strong className={styles.itemMv}>
                      {d.market_value != null
                        ? `${Math.round(d.market_value).toLocaleString()}원`
                        : '—'}
                    </strong>
                    <span className={(d.pnl ?? 0) >= 0 ? styles.up : styles.down}>
                      {d.pnl == null
                        ? '—'
                        : `${d.pnl >= 0 ? '+' : ''}${Math.round(d.pnl).toLocaleString()}원`}
                    </span>
                  </>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {modalOpen && <HoldingAddModal onClose={() => setModalOpen(false)} onAdded={handleAdded} />}
    </section>
  );
}
