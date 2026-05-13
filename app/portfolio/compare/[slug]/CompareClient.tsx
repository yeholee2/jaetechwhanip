'use client';

/**
 * 비교 client component.
 * 사용자 보유 (Supabase) 가져와서 인사이트 계산 → 템플릿과 side-by-side 렌더.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Card, Button, DataCell } from '@/components/ui';
import { listMyHoldings, type UserEtfHolding } from '@/lib/etfPortfolio';
import { type EtfInfo } from '@/lib/etfs';
import { type PortfolioTemplate } from '@/lib/portfolioTemplates';
import { buildComparison } from '@/lib/etfPortfolioCompare';
import { type WeightedHolding } from '@/lib/etfPortfolioInsights';
import styles from './Compare.module.css';

function parsePriceWon(price?: string): number {
  if (!price) return 0;
  const m = price.replace(/[,$₩원]/g, '').match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

type Props = { template: PortfolioTemplate; pool: EtfInfo[] };

export function CompareClient({ template, pool }: Props) {
  const [authState, setAuthState] = useState<'loading' | 'unauth' | 'auth'>('loading');
  const [holdings, setHoldings] = useState<UserEtfHolding[]>([]);

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

  // 사용자 보유 → WeightedHolding[]
  const myWeighted = useMemo<WeightedHolding[]>(() => {
    if (holdings.length === 0) return [];
    const enriched = holdings
      .map(h => {
        const etf = pool.find(p => p.code === h.etf_code);
        if (!etf) return null;
        const price = parsePriceWon(etf.price);
        const basis = price > 0 ? price * h.quantity : h.avg_price * h.quantity;
        return { etf, basis };
      })
      .filter((x): x is { etf: EtfInfo; basis: number } => !!x);
    const total = enriched.reduce((s, x) => s + x.basis, 0);
    if (total === 0) return [];
    return enriched.map(({ etf, basis }) => ({ etf, weight: basis / total }));
  }, [holdings, pool]);

  const cmp = useMemo(
    () => buildComparison(myWeighted, template, pool),
    [myWeighted, template, pool],
  );

  if (authState === 'loading') {
    return <Card pad="lg"><p style={{ margin: 0, color: 'var(--rw-text-muted)' }}>불러오는 중…</p></Card>;
  }

  if (authState === 'unauth' || myWeighted.length === 0) {
    return (
      <Card pad="lg" className={styles.empty}>
        <h3>먼저 내 ETF를 등록해주세요</h3>
        <p>
          비교는 내가 보유한 ETF가 있어야 가능해요. <br />
          {template.name}을 그대로 따라하려면 따라하기 버튼을 누르면 한 번에 등록돼요.
        </p>
        <div className={styles.emptyActions}>
          <Button href="/portfolio" variant="primary" size="md">MY 포트폴리오로</Button>
          <Button href={`/portfolio/templates/${template.slug}`} variant="ghost" size="md">
            {template.name} 따라하기
          </Button>
        </div>
      </Card>
    );
  }

  const me = cmp.myInsight!;
  const tpl = cmp.templateInsight!;

  // 항목별 비교 데이터
  const rows = [
    {
      label: '위험 등급',
      mine: me.riskLabel,
      mySub: `${me.weightedRisk.toFixed(1)} / 5`,
      tplVal: tpl.riskLabel,
      tplSub: `${tpl.weightedRisk.toFixed(1)} / 5`,
      myTone: me.riskTone,
      tplTone: tpl.riskTone,
    },
    {
      label: '환 노출',
      mine: me.fxExposureLabel,
      mySub: `${Math.round(me.fxExposure * 100)}%`,
      tplVal: tpl.fxExposureLabel,
      tplSub: `${Math.round(tpl.fxExposure * 100)}%`,
      myTone: me.fxTone,
      tplTone: tpl.fxTone,
    },
    {
      label: '가중평균 보수',
      mine: `${me.weightedFee.toFixed(2)}%`,
      mySub: '연',
      tplVal: `${tpl.weightedFee.toFixed(2)}%`,
      tplSub: '연',
      myTone: undefined,
      tplTone: undefined,
    },
    {
      label: '섹터 집중도',
      mine: me.concentrationLabel,
      mySub: me.topSector ? `${me.topSector.label} ${Math.round(me.topSector.weight * 100)}%` : '—',
      tplVal: tpl.concentrationLabel,
      tplSub: tpl.topSector ? `${tpl.topSector.label} ${Math.round(tpl.topSector.weight * 100)}%` : '—',
      myTone: me.concentrationTone,
      tplTone: tpl.concentrationTone,
    },
    {
      label: '운용사 수',
      mine: `${me.issuerCount}곳`,
      mySub: me.issuerCount === 1 ? '집중' : me.issuerCount >= 3 ? '분산' : '보통',
      tplVal: `${tpl.issuerCount}곳`,
      tplSub: tpl.issuerCount === 1 ? '집중' : tpl.issuerCount >= 3 ? '분산' : '보통',
      myTone: undefined,
      tplTone: undefined,
    },
  ];

  const toneColor = (t?: 'good' | 'neutral' | 'warn') =>
    t === 'good' ? 'var(--rw-green50)' :
    t === 'warn' ? 'var(--rw-red60)' :
    'var(--rw-text-strong)';

  return (
    <>
      {/* 한줄평 */}
      <Card pad="lg" className={styles.summary}>
        <div className={styles.summaryGrid}>
          <div>
            <span className={styles.sumLabel}>내 포트폴리오</span>
            <p>{me.oneLiner}</p>
          </div>
          <div>
            <span className={styles.sumLabel}>{template.name}</span>
            <p>{tpl.oneLiner}</p>
          </div>
        </div>

        {cmp.diffSummary.length > 0 && (
          <div className={styles.diffBox}>
            <strong>차이 요약</strong>
            <ul>
              {cmp.diffSummary.map((d, i) => (
                <li key={i}>· {d}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* 항목별 표 */}
      <Card pad="lg">
        <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--type-title)', fontWeight: 900, letterSpacing: '-0.3px' }}>
          항목별 비교
        </h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th></th>
              <th>내 포트폴리오</th>
              <th>{template.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.label}>
                <td className={styles.rowLabel}>{r.label}</td>
                <td>
                  <strong style={{ color: toneColor(r.myTone) }}>{r.mine}</strong>
                  <span>{r.mySub}</span>
                </td>
                <td>
                  <strong style={{ color: toneColor(r.tplTone) }}>{r.tplVal}</strong>
                  <span>{r.tplSub}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.followCta}>
          <Link href={`/portfolio/templates/${template.slug}`} className={styles.followCtaLink}>
            {template.name} 자세히 보고 따라하기 →
          </Link>
        </div>
      </Card>

      {/* 자산 갭 — 빠진 종목 / 추가 종목 */}
      <Card pad="lg">
        <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--type-title)', fontWeight: 900, letterSpacing: '-0.3px' }}>
          자산 갭
        </h3>
        <div className={styles.gapGrid}>
          {cmp.assetGap.overlap.length > 0 && (
            <div className={styles.gapCol}>
              <span className={styles.gapColTitle}>
                <em style={{ color: 'var(--rw-green50)' }}>✓ 둘 다 보유</em>
                <strong>{cmp.assetGap.overlap.length}종</strong>
              </span>
              <ul className={styles.gapList}>
                {cmp.assetGap.overlap.slice(0, 6).map(o => (
                  <li key={o.code}>
                    <span className={styles.gapName}>{o.name}</span>
                    <span className={styles.gapPcts}>
                      <em>{Math.round(o.myWeight * 100)}%</em> · <em>{Math.round(o.tplWeight * 100)}%</em>
                    </span>
                  </li>
                ))}
              </ul>
              <span className={styles.gapHint}>내 비중 · 템플릿 비중</span>
            </div>
          )}

          {cmp.assetGap.onlyTpl.length > 0 && (
            <div className={styles.gapCol}>
              <span className={styles.gapColTitle}>
                <em style={{ color: 'var(--rw-primary)' }}>+ 빠진 종목</em>
                <strong>{cmp.assetGap.onlyTpl.length}종</strong>
              </span>
              <ul className={styles.gapList}>
                {cmp.assetGap.onlyTpl.slice(0, 6).map(o => (
                  <li key={o.code}>
                    <Link href={`/etf/${encodeURIComponent(o.code)}`} className={styles.gapNameLink}>
                      {o.name}
                    </Link>
                    <span className={styles.gapPcts}>
                      <em>—</em> · <em>{Math.round(o.tplWeight * 100)}%</em>
                    </span>
                  </li>
                ))}
              </ul>
              <span className={styles.gapHint}>{template.name}에는 있는데 내 포트엔 없음</span>
            </div>
          )}

          {cmp.assetGap.onlyMine.length > 0 && (
            <div className={styles.gapCol}>
              <span className={styles.gapColTitle}>
                <em style={{ color: 'var(--rw-text-muted)' }}>· 내 포트만</em>
                <strong>{cmp.assetGap.onlyMine.length}종</strong>
              </span>
              <ul className={styles.gapList}>
                {cmp.assetGap.onlyMine.slice(0, 6).map(o => (
                  <li key={o.code}>
                    <Link href={`/etf/${encodeURIComponent(o.code)}`} className={styles.gapNameLink}>
                      {o.name}
                    </Link>
                    <span className={styles.gapPcts}>
                      <em>{Math.round(o.myWeight * 100)}%</em> · <em>—</em>
                    </span>
                  </li>
                ))}
              </ul>
              <span className={styles.gapHint}>{template.name}에는 없음</span>
            </div>
          )}
        </div>
      </Card>
    </>
  );
}
