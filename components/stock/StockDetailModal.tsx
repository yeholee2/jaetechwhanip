'use client';

/**
 * 종목 상세 모달 — ETF 구성종목 클릭 시 뜸.
 *
 * 구성:
 *  - 헤더: 회사 이름·심볼·현재가
 *  - 차트 (ChartBlock, 1년 기본, 그림 비활성)
 *  - 핵심 지표 (시총, PER, 배당, 52주)
 *  - 🔁 이 종목을 가장 많이 담은 ETF Top N — 우리만의 시그니처
 *  - 회사 설명 / 외부 링크
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChartBlock } from '@/components/creator/ChartBlock';
import styles from './StockDetailModal.module.css';

type EtfExposure = {
  etfCode: string;
  etfSlug?: string;
  etfName: string;
  etfShortName?: string;
  issuer?: string;
  weight: number;
  aum?: string;
};

type Profile = {
  symbol: string;
  name: string;
  exchange?: string;
  currency?: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  regularMarketPrice?: number;
  regularMarketChangePercent?: number;
  previousClose?: number;
  trailingPE?: number;
  forwardPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  longBusinessSummary?: string;
  website?: string;
};

type Resp = { symbol: string; profile: Profile | null; topEtfs: EtfExposure[] };

function fmtMoney(v?: number, currency = 'USD'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (currency === 'KRW' || currency === 'KRW=X') {
    if (v >= 1e12) return `₩${(v / 1e12).toFixed(2)}조`;
    if (v >= 1e8) return `₩${(v / 1e8).toFixed(2)}억`;
    return `₩${v.toLocaleString()}`;
  }
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

function fmtPrice(v?: number, currency = 'USD'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (currency === 'KRW') return `₩${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `${currency === 'USD' ? '$' : ''}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function StockDetailModal({
  symbol,
  displayName,
  onClose,
}: {
  symbol: string;
  displayName?: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let aborted = false;
    setLoading(true);
    setError('');
    fetch(`/api/stock/${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => {
        if (aborted) return;
        if (j.error) setError(j.error);
        else setData(j);
      })
      .catch(e => { if (!aborted) setError(e?.message || 'load failed'); })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [symbol]);

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const profile = data?.profile;
  const currency = profile?.currency || 'USD';
  const changePct = profile?.regularMarketChangePercent;
  const tone = changePct == null ? 'flat' : changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="닫기">×</button>

        <header className={styles.head}>
          <div className={styles.headLeft}>
            <span className={styles.symbol}>{symbol.toUpperCase()}</span>
            <h2>{profile?.name || displayName || symbol}</h2>
            {profile?.sector && (
              <p className={styles.sub}>
                {profile.sector}{profile.industry ? ` · ${profile.industry}` : ''}
                {profile.exchange ? ` · ${profile.exchange}` : ''}
              </p>
            )}
          </div>
          <div className={styles.headRight}>
            {profile?.regularMarketPrice != null && (
              <>
                <strong className={styles.price}>{fmtPrice(profile.regularMarketPrice, currency)}</strong>
                {changePct != null && (
                  <span className={`${styles.change} ${styles[`change_${tone}`]}`}>
                    {changePct > 0 ? '+' : ''}{(changePct * 100).toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
        </header>

        <section className={styles.chartWrap}>
          <ChartBlock data={{ code: symbol, range: '1y', type: 'candle', drawings: [] }} editable={false} />
        </section>

        {profile && (
          <section className={styles.metrics}>
            <Metric label="시가총액" value={fmtMoney(profile.marketCap, currency)} />
            <Metric label="PER" value={profile.trailingPE?.toFixed(2) ?? '—'} />
            <Metric label="선행 PER" value={profile.forwardPE?.toFixed(2) ?? '—'} />
            <Metric
              label="배당수익률"
              value={profile.dividendYield != null ? `${(profile.dividendYield * 100).toFixed(2)}%` : '—'}
            />
            <Metric label="52주 최고" value={fmtPrice(profile.fiftyTwoWeekHigh, currency)} />
            <Metric label="52주 최저" value={fmtPrice(profile.fiftyTwoWeekLow, currency)} />
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>🔁 이 종목을 가장 많이 담은 ETF</h3>
            <span className={styles.sectionSub}>우리 DB의 ETF 들 중 비중 상위</span>
          </div>
          {loading ? (
            <div className={styles.skeleton}>스캔 중… (최초 조회는 시간이 걸려요)</div>
          ) : data && data.topEtfs.length > 0 ? (
            <div className={styles.etfList}>
              {data.topEtfs.map(e => (
                <Link
                  key={e.etfCode}
                  href={e.etfSlug ? `/etf/${e.etfSlug}` : `/etf/all`}
                  className={styles.etfRow}
                  onClick={onClose}
                >
                  <div className={styles.etfMeta}>
                    <strong>{e.etfShortName || e.etfName}</strong>
                    <span>{e.issuer || e.etfCode}{e.aum ? ` · AUM ${e.aum}` : ''}</span>
                  </div>
                  <div className={styles.etfBar} aria-hidden="true">
                    <span style={{ width: `${Math.min(e.weight * 100 * 5, 100)}%` }} />
                  </div>
                  <b className={styles.etfPct}>{(e.weight * 100).toFixed(2)}%</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              {error ? '데이터를 불러오지 못했어요.' : '이 종목을 담은 ETF를 우리 DB에서 찾지 못했어요.'}
            </div>
          )}
        </section>

        {profile?.longBusinessSummary && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h3>회사 소개</h3>
            </div>
            <p className={styles.bizSummary}>{profile.longBusinessSummary}</p>
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className={styles.extLink}>
                공식 사이트 →
              </a>
            )}
          </section>
        )}

        <footer className={styles.foot}>
          <a
            href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.extBtn}
          >
            Yahoo Finance →
          </a>
        </footer>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
