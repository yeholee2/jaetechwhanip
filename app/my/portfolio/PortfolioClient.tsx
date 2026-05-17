'use client';

/**
 * 내 종목 트래커 — 메인 화면.
 *
 * 구성:
 *  - 헤더: 총 평가액·총 손익·환율
 *  - 종목 리스트 (현재가 라이브 갱신, 비중 막대, 손익)
 *  - 종목 추가 폼 (자동완성)
 *  - 비슷한 ETF Top 5
 *  - 내 종목 다룬 글
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { PortfolioSummary, EtfMatch, EnrichedHolding } from '@/lib/portfolio';
import type { PostWithCreator } from '@/lib/postMentions';
import { MentionedPosts } from '@/components/stock/MentionedPosts';
import { AddHoldingForm } from './AddHoldingForm';
import styles from './Portfolio.module.css';

function fmtKrw(v: number): string {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e8) return `${(v / 1e8).toFixed(2)}억`;
  if (v >= 1e4) return `${Math.round(v / 1e4).toLocaleString()}만`;
  return v.toLocaleString();
}
function fmtPrice(v: number | undefined, cur: 'KRW' | 'USD'): string {
  if (v == null) return '—';
  if (cur === 'KRW') return `₩${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function PortfolioClient({
  summary,
  similarEtfs,
  mentionedPosts,
}: {
  summary: PortfolioSummary;
  similarEtfs: EtfMatch[];
  mentionedPosts: PostWithCreator[];
}) {
  const [holdings, setHoldings] = useState(summary.holdings);
  const [showAdd, setShowAdd] = useState(false);
  const [_, startTransition] = useTransition();
  const [pending, setPending] = useState<string | null>(null);

  // 실시간 시세 재집계 — 클라에서 가벼운 폴링 (60초)
  // 일단 SSR 데이터 그대로. 향후 폴링 추가 가능.

  const totalPnLTone = summary.totalPnL > 0 ? 'up' : summary.totalPnL < 0 ? 'down' : 'flat';

  const removeHolding = async (id: string) => {
    if (!confirm('이 종목을 포트폴리오에서 제거할까요?')) return;
    setPending(id);
    try {
      const r = await fetch(`/api/portfolio/holdings?id=${id}`, { method: 'DELETE' });
      if (r.ok) setHoldings(list => list.filter(h => h.id !== id));
    } finally {
      setPending(null);
    }
  };

  const refreshAfterAdd = () => {
    setShowAdd(false);
    // SSR 재요청을 위해 페이지 새로고침 — 시세·유사 ETF·글까지 다시 계산
    startTransition(() => {
      window.location.reload();
    });
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>내 종목 트래커</h1>
          <p>마이데이터 없이도 — 보유 종목 입력하면 ETF 유사도 + 다룬 글 자동.</p>
        </div>
        <button type="button" onClick={() => setShowAdd(s => !s)} className={styles.addBtn}>
          {showAdd ? '닫기' : '+ 종목 추가'}
        </button>
      </header>

      {showAdd && (
        <section className={styles.addPanel}>
          <AddHoldingForm onAdded={refreshAfterAdd} />
        </section>
      )}

      {holdings.length === 0 ? (
        <section className={styles.empty}>
          <h2>아직 보유 종목이 없어요</h2>
          <p>
            보유한 종목을 추가하면 우리가:<br />
            ▪ 실시간 시세로 평가액·손익 자동 계산<br />
            ▪ 가장 비슷한 ETF Top 5 추천<br />
            ▪ 보유 종목을 다룬 크리에이터 글 모음
          </p>
          <button type="button" onClick={() => setShowAdd(true)} className={styles.emptyCta}>
            + 첫 종목 추가하기
          </button>
        </section>
      ) : (
        <>
          {/* 통계 카드 */}
          <section className={styles.statGrid}>
            <div className={styles.statCard}>
              <span>총 평가액</span>
              <strong>₩{fmtKrw(summary.totalValue)}</strong>
              <small>{holdings.length}개 종목</small>
            </div>
            <div className={styles.statCard}>
              <span>총 손익</span>
              <strong className={styles[`tone_${totalPnLTone}`]}>
                {summary.totalPnL >= 0 ? '+' : ''}₩{fmtKrw(Math.abs(summary.totalPnL))}
              </strong>
              <small className={styles[`tone_${totalPnLTone}`]}>
                {summary.totalPnL >= 0 ? '+' : ''}{(summary.totalPnLPct * 100).toFixed(2)}%
              </small>
            </div>
            <div className={styles.statCard}>
              <span>매입 원금</span>
              <strong>₩{fmtKrw(summary.totalCost)}</strong>
              <small>USD/KRW {summary.fxRate.toFixed(0)}</small>
            </div>
          </section>

          {/* 종목 리스트 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>보유 종목</h2>
            <div className={styles.holdingList}>
              {holdings.map(h => <HoldingRow key={h.id} h={h} pending={pending === h.id} onRemove={() => removeHolding(h.id)} />)}
            </div>
          </section>

          {/* 비슷한 ETF */}
          {similarEtfs.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>🪙 내 포트와 비슷한 ETF</h2>
              <p className={styles.sectionSub}>내 보유 종목이 가장 많이 담긴 ETF들이에요</p>
              <div className={styles.etfList}>
                {similarEtfs.map(e => (
                  <Link key={e.etfCode} href={e.etfSlug ? `/etf/${e.etfSlug}` : '/etf/all'} className={styles.etfRow}>
                    <div className={styles.etfMeta}>
                      <strong>{e.etfShortName || e.etfName}</strong>
                      <span>{e.issuer || e.etfCode} · 공통 {e.sharedSymbols}종목</span>
                    </div>
                    <div className={styles.etfBar} aria-hidden="true">
                      <span style={{ width: `${e.similarity * 100}%` }} />
                    </div>
                    <b className={styles.etfPct}>{(e.similarity * 100).toFixed(0)}%</b>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 내 종목 다룬 글 */}
          {mentionedPosts.length > 0 && (
            <section className={styles.section}>
              <MentionedPosts
                posts={mentionedPosts}
                title="📝 내 종목을 다룬 크리에이터 글"
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function HoldingRow({ h, pending, onRemove }: { h: EnrichedHolding; pending: boolean; onRemove: () => void }) {
  const tone = h.unrealizedPnL == null ? 'flat' : h.unrealizedPnL > 0 ? 'up' : h.unrealizedPnL < 0 ? 'down' : 'flat';
  return (
    <article className={styles.holding}>
      <Link href={`/stock/${encodeURIComponent(h.symbol)}`} className={styles.holdingMain}>
        <div className={styles.holdingHead}>
          <strong>{h.name}</strong>
          <span className={styles.holdingSym}>{h.display_symbol || h.symbol}</span>
        </div>
        <div className={styles.holdingMeta}>
          {h.quantity != null && <>{h.quantity.toLocaleString()}주</>}
          {h.quantity == null && h.target_weight != null && <>비중만 추적</>}
          {h.avg_cost != null && <> · 평단 {fmtPrice(h.avg_cost, h.currency)}</>}
          {h.quote?.price != null && <> · 현재가 {fmtPrice(h.quote.price, h.currency)}</>}
        </div>
      </Link>

      <div className={styles.holdingValues}>
        <div className={styles.holdingValue}>
          <span>평가액</span>
          <strong>₩{h.currentValue != null ? fmtKrw(h.currentValue) : '—'}</strong>
        </div>
        <div className={styles.holdingValue}>
          <span>손익</span>
          <strong className={styles[`tone_${tone}`]}>
            {h.unrealizedPnL != null ? (
              <>{h.unrealizedPnL >= 0 ? '+' : ''}₩{fmtKrw(Math.abs(h.unrealizedPnL))}</>
            ) : '—'}
          </strong>
          {h.unrealizedPnLPct != null && (
            <small className={styles[`tone_${tone}`]}>
              {h.unrealizedPnLPct >= 0 ? '+' : ''}{(h.unrealizedPnLPct * 100).toFixed(2)}%
            </small>
          )}
        </div>
        {h.weight != null && (
          <div className={styles.holdingWeight}>
            <span>비중</span>
            <strong>{(h.weight * 100).toFixed(1)}%</strong>
            <div className={styles.weightBar}><span style={{ width: `${h.weight * 100}%` }} /></div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        disabled={pending}
        className={styles.removeBtn}
        aria-label="제거"
      >
        ×
      </button>
    </article>
  );
}
