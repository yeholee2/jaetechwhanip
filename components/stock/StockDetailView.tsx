'use client';

/**
 * 종목 상세 — 모달/페이지 양쪽에서 재사용하는 공용 본체.
 *
 * 데이터:
 *  - profile / topEtfs 를 props 로 받으면 그대로 렌더 (서버 페이지용)
 *  - 받지 않으면 클라이언트에서 /api/stock/[symbol] 호출 (모달용)
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChartBlock } from '@/components/creator/ChartBlock';
import styles from './StockDetailModal.module.css';

export type EtfExposure = {
  etfCode: string;
  etfSlug?: string;
  etfName: string;
  etfShortName?: string;
  issuer?: string;
  weight: number;
  aum?: string;
};

export type StockProfile = {
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

function fmtMoney(v?: number, currency = 'USD'): string {
  if (v == null || !Number.isFinite(v)) return '—';
  if (currency === 'KRW') {
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

export function StockDetailView({
  symbol,
  displayName,
  initialProfile,
  initialTopEtfs,
  onLinkClick,
  showShareLink = false,
}: {
  symbol: string;
  displayName?: string;
  initialProfile?: StockProfile | null;
  initialTopEtfs?: EtfExposure[];
  onLinkClick?: () => void;
  showShareLink?: boolean;
}) {
  const [profile, setProfile] = useState<StockProfile | null>(initialProfile || null);
  const [topEtfs, setTopEtfs] = useState<EtfExposure[]>(initialTopEtfs || []);
  const [loading, setLoading] = useState(initialProfile === undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    // 서버에서 데이터 주입한 경우 스킵
    if (initialProfile !== undefined) return;
    let aborted = false;
    setLoading(true);
    setError('');
    fetch(`/api/stock/${encodeURIComponent(symbol)}`)
      .then(r => r.json())
      .then(j => {
        if (aborted) return;
        if (j.error) setError(j.error);
        else {
          setProfile(j.profile);
          setTopEtfs(j.topEtfs || []);
        }
      })
      .catch(e => { if (!aborted) setError(e?.message || 'load failed'); })
      .finally(() => { if (!aborted) setLoading(false); });
    return () => { aborted = true; };
  }, [symbol, initialProfile]);

  const currency = profile?.currency || 'USD';
  const changePct = profile?.regularMarketChangePercent;
  const tone = changePct == null ? 'flat' : changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';

  return (
    <>
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
        ) : topEtfs.length > 0 ? (
          <div className={styles.etfList}>
            {topEtfs.map(e => (
              <Link
                key={e.etfCode}
                href={e.etfSlug ? `/etf/${e.etfSlug}` : `/etf/all`}
                className={styles.etfRow}
                onClick={onLinkClick}
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
        {showShareLink && (
          <Link href={`/stock/${encodeURIComponent(symbol)}`} className={styles.extBtn} onClick={onLinkClick}>
            전체 페이지로 →
          </Link>
        )}
        <a
          href={`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.extBtn}
        >
          Yahoo Finance →
        </a>
      </footer>
    </>
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
