'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  type UserEtfHolding,
  type HoldingDisplay,
  listMyHoldings,
  buildHoldingDisplays,
  summarizePortfolio,
} from '@/lib/etfPortfolio';
import { etfs, getEtfByCode } from '@/lib/etfs';
import { Card, Badge, Button, Stat, DataCell } from '@/components/ui';
import styles from './PortfolioDiagnostic.module.css';
import { HoldingAddModal } from './HoldingAddModal';
import { BulkPasteModal } from './BulkPasteModal';
import { buildPortfolioInsight, type WeightedHolding } from '@/lib/etfPortfolioInsights';

function buildPriceMap(): Record<string, number> {
  const map: Record<string, number> = {};
  etfs.forEach(e => {
    const m = e.price.match(/[\d,]+/);
    if (m) map[e.code] = parseInt(m[0].replace(/,/g, ''), 10);
  });
  return map;
}

const formatKRW = (n: number) => n.toLocaleString('ko-KR') + '원';
const formatPct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

export function PortfolioDiagnostic() {
  const [authState, setAuthState] = useState<'loading' | 'unauth' | 'auth'>('loading');
  const [holdings, setHoldings] = useState<UserEtfHolding[]>([]);
  const [modal, setModal] = useState<null | 'manual' | 'bulk' | 'screenshot'>(null);
  const [screenshotToast, setScreenshotToast] = useState('');

  const priceMap = useMemo(buildPriceMap, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listMyHoldings();
        if (cancelled) return;
        setHoldings(list);
        setAuthState('auth');
      } catch {
        if (cancelled) return;
        setAuthState('unauth');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (authState === 'loading') {
    return <Card pad="lg" className={styles.placeholder}><p>불러오는 중…</p></Card>;
  }

  if (authState === 'unauth') {
    return (
      <Card pad="lg" className={styles.placeholder}>
        <div className={styles.placeholderInner}>
          <Badge tone="primary">진단</Badge>
          <h2 className={styles.placeholderTitle}>로그인하면 포트폴리오 진단을 받을 수 있어요</h2>
          <p className={styles.placeholderBody}>
            보유 ETF의 자산 배분·중복·비용 구조를 한입이 자동으로 분석해드려요.
          </p>
          <Button href="/auth?next=/etf?tab=diagnostic" variant="primary" size="md">
            로그인하고 시작하기
          </Button>
        </div>
      </Card>
    );
  }

  const recordScreenshotInterest = () => {
    try {
      const key = 'etfhanip:screenshot-interest';
      const cnt = parseInt(localStorage.getItem(key) || '0', 10) + 1;
      localStorage.setItem(key, String(cnt));
    } catch {}
    setScreenshotToast('등록해주셔서 감사해요! OCR 자동 인식이 곧 추가됩니다.');
    setTimeout(() => setScreenshotToast(''), 3500);
  };

  if (holdings.length === 0) {
    return (
      <>
        <Card pad="lg" className={styles.placeholder}>
          <div className={styles.placeholderInner}>
            <Badge tone="primary">진단</Badge>
            <h2 className={styles.placeholderTitle}>아직 보유한 ETF가 없어요</h2>
            <p className={styles.placeholderBody}>
              마이데이터 연동 없이도 진단이 가능해요. 가장 편한 방법을 골라주세요.
            </p>

            <div className={styles.entryGrid}>
              <button
                type="button"
                className={styles.entryCard}
                onClick={() => setModal('manual')}
              >
                <span className={styles.entryIcon}>✏️</span>
                <span className={styles.entryTitle}>한 종목씩 추가</span>
                <span className={styles.entryDesc}>ETF 검색 → 수량 / 평단 입력. 정확도 최고.</span>
                <span className={styles.entryBadge}>가장 정확</span>
              </button>

              <button
                type="button"
                className={styles.entryCard}
                onClick={() => setModal('bulk')}
              >
                <span className={styles.entryIcon}>📋</span>
                <span className={styles.entryTitle}>한 번에 붙여넣기</span>
                <span className={styles.entryDesc}>증권사 잔고 텍스트를 복사 → 자동 파싱.</span>
                <span className={styles.entryBadge}>가장 빠름</span>
              </button>

              <button
                type="button"
                className={styles.entryCard}
                onClick={recordScreenshotInterest}
              >
                <span className={styles.entryIcon}>📸</span>
                <span className={styles.entryTitle}>스크린샷 업로드</span>
                <span className={styles.entryDesc}>잔고 화면 캡처 → OCR로 자동 인식. 준비 중.</span>
                <span className={styles.entryBadge}>곧 출시</span>
              </button>
            </div>

            {screenshotToast && (
              <p style={{ fontSize: 12, color: 'var(--rw-primary)', fontWeight: 600 }}>
                {screenshotToast}
              </p>
            )}
          </div>
        </Card>

        {modal === 'manual' && (
          <HoldingAddModal
            onClose={() => setModal(null)}
            onAdded={(row) => {
              setHoldings(prev => [row, ...prev]);
              setModal(null);
            }}
          />
        )}
        {modal === 'bulk' && (
          <BulkPasteModal
            onClose={() => setModal(null)}
            onAdded={(rows) => {
              setHoldings(prev => [...rows, ...prev]);
              setModal(null);
            }}
          />
        )}
      </>
    );
  }

  const displays = buildHoldingDisplays(holdings, priceMap);
  const summary = summarizePortfolio(displays);

  // 비중 계산 (시가 평가 우선, 없으면 cost 기준)
  const weighed = displays.map(d => {
    const basis = d.market_value ?? d.cost_basis;
    return {
      d,
      basis,
      weight: summary.total_market_value > 0
        ? basis / Math.max(summary.total_market_value, summary.total_cost)
        : 0,
    };
  }).sort((a, b) => b.basis - a.basis);

  // 한입 진단 인사이트 (가중평균 보수/위험/환노출, 섹터 중복도, 한줄평)
  const weightedHoldings: WeightedHolding[] = weighed
    .map(({ d, weight }) => {
      const etf = getEtfByCode(d.etf_code);
      return etf ? { etf, weight } : null;
    })
    .filter((x): x is WeightedHolding => !!x);
  const insight = buildPortfolioInsight(weightedHoldings);

  // 운용사 비중 합산
  const issuerMap = new Map<string, number>();
  weighed.forEach(({ d, basis }) => {
    const etf = getEtfByCode(d.etf_code);
    const issuer = etf?.issuer || '기타';
    issuerMap.set(issuer, (issuerMap.get(issuer) || 0) + basis);
  });
  const issuerTotal = Array.from(issuerMap.values()).reduce((a, b) => a + b, 0);
  const issuerWeights = Array.from(issuerMap.entries())
    .map(([name, basis]) => ({ name, weight: issuerTotal > 0 ? basis / issuerTotal : 0 }))
    .sort((a, b) => b.weight - a.weight);

  return (
    <div className={styles.wrap}>
      {/* 요약 카드 */}
      <Card pad="lg" className={styles.summary}>
        <div className={styles.summaryHead}>
          <Badge tone="primary">진단</Badge>
          <h2>포트폴리오 요약</h2>
        </div>
        {/* 평가액 + 손익 (큰 숫자) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
          <Stat
            label="평가액"
            value={
              summary.total_market_value > 0
                ? formatKRW(summary.total_market_value)
                : formatKRW(summary.total_cost)
            }
            size="lg"
            foot={summary.has_unknown_price ? '일부 시세 미반영' : undefined}
          />
          <Stat
            label="손익"
            value={`${summary.total_pnl >= 0 ? '+' : '-'}${formatKRW(Math.abs(summary.total_pnl))}`}
            delta={formatPct(summary.total_pnl_pct)}
            tone={summary.total_pnl >= 0 ? 'up' : 'down'}
            size="lg"
          />
        </div>
        {/* 매입금액 + 보유 종목 */}
        <DataCell.Grid columns={2}>
          <DataCell label="매입금액" value={formatKRW(summary.total_cost)} />
          <DataCell label="보유 종목" value={`${summary.count}개`} />
        </DataCell.Grid>
      </Card>

      {/* 한입 진단 인사이트 (가중평균 보수/위험/환노출/섹터 중복도) */}
      {insight && (
        <Card pad="lg" className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>한입 진단</h3>
            <span>비중 가중 평균</span>
          </div>

          <p className={styles.insightOneLiner}>{insight.oneLiner}</p>

          <div className={styles.insightGrid}>
            <div className={styles.insightCell}>
              <span className={styles.insightLabel}>위험 등급</span>
              <strong
                className={styles.insightValue}
                style={{
                  color: insight.riskTone === 'good' ? 'var(--rw-green50)' :
                         insight.riskTone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)'
                }}
              >
                {insight.riskLabel}
              </strong>
              <span className={styles.insightSub}>{insight.weightedRisk.toFixed(1)} / 5</span>
            </div>

            <div className={styles.insightCell}>
              <span className={styles.insightLabel}>환 노출</span>
              <strong
                className={styles.insightValue}
                style={{
                  color: insight.fxTone === 'good' ? 'var(--rw-green50)' :
                         insight.fxTone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)'
                }}
              >
                {insight.fxExposureLabel}
              </strong>
              <span className={styles.insightSub}>{(insight.fxExposure * 100).toFixed(0)}%</span>
            </div>

            <div className={styles.insightCell}>
              <span className={styles.insightLabel}>총보수 가중평균</span>
              <strong className={styles.insightValue}>
                {insight.weightedFee.toFixed(2)}%
              </strong>
              <span className={styles.insightSub}>연</span>
            </div>

            <div className={styles.insightCell}>
              <span className={styles.insightLabel}>섹터 집중도</span>
              <strong
                className={styles.insightValue}
                style={{
                  color: insight.concentrationTone === 'good' ? 'var(--rw-green50)' :
                         insight.concentrationTone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)'
                }}
              >
                {insight.concentrationLabel}
              </strong>
              <span className={styles.insightSub}>
                {insight.topSector
                  ? `${insight.topSector.label} ${(insight.topSector.weight * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
          </div>

          {(insight.highlights.length > 0 || insight.warnings.length > 0) && (
            <ul className={styles.insightPoints}>
              {insight.highlights.map((h, i) => (
                <li key={`h${i}`} className={styles.pointGood}>
                  <span className={styles.pointIcon} aria-hidden="true">✓</span>
                  <span>{h}</span>
                </li>
              ))}
              {insight.warnings.map((w, i) => (
                <li key={`w${i}`} className={styles.pointWarn}>
                  <span className={styles.pointIcon} aria-hidden="true">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* 종목 비중 */}
      <Card pad="lg" className={styles.section}>
        <div className={styles.sectionHead}>
          <h3>종목 비중</h3>
          <span>큰 순으로</span>
        </div>
        <ul className={styles.weightList}>
          {weighed.map(({ d, weight }) => {
            const etf = getEtfByCode(d.etf_code);
            return (
              <li key={d.id || d.etf_code} className={styles.weightItem}>
                <div className={styles.weightLabel}>
                  <strong>{etf?.shortName || d.etf_code}</strong>
                  <span>{etf?.code || d.etf_code} · {etf?.issuer || '—'}</span>
                </div>
                <div className={styles.weightBar} aria-hidden="true">
                  <span style={{ width: `${(weight * 100).toFixed(1)}%` }} />
                </div>
                <div className={styles.weightValue}>{(weight * 100).toFixed(1)}%</div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* 운용사 분산 */}
      <Card pad="lg" className={styles.section}>
        <div className={styles.sectionHead}>
          <h3>운용사 분산</h3>
          <span>{issuerWeights.length}개사</span>
        </div>
        <ul className={styles.issuerList}>
          {issuerWeights.map(i => (
            <li key={i.name}>
              <span className={styles.issuerName}>{i.name}</span>
              <div className={styles.issuerBar} aria-hidden="true">
                <span style={{ width: `${(i.weight * 100).toFixed(1)}%` }} />
              </div>
              <span className={styles.issuerPct}>{(i.weight * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
        {issuerWeights.length === 1 && (
          <p className={styles.note}>
            한 운용사에 집중돼 있어요. 다양화를 고려해 보세요.
          </p>
        )}
      </Card>
    </div>
  );
}
