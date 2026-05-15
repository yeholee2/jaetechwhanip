'use client';

/**
 * 맞춤 포트폴리오 추천 — TDF 스타일.
 * 사용자 상황(나이/은퇴/위험성향/한미 비중/적립금) 입력 → 자산 배분 + 추천 ETF.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  recommendPortfolio,
  type RiskProfile,
  type RecommendInput,
} from '@/lib/portfolioRecommend';
import { etfPath } from '@/lib/etfs';
import styles from './AutoPortfolio.module.css';

const RISK_OPTIONS: { key: RiskProfile; label: string; sub: string }[] = [
  { key: 'conservative', label: '안정형', sub: '변동성 적게' },
  { key: 'neutral',      label: '중립형', sub: '균형있게' },
  { key: 'aggressive',   label: '공격형', sub: '성장 우선' },
];

export function AutoPortfolio() {
  const [age, setAge] = useState(32);
  const [retireAge, setRetireAge] = useState(60);
  const [risk, setRisk] = useState<RiskProfile>('neutral');
  const [krWeight, setKrWeight] = useState(30);
  const [monthlySave, setMonthlySave] = useState(300000);

  const input: RecommendInput = { age, retireAge, risk, krWeight, monthlySave };
  const rec = useMemo(() => recommendPortfolio(input), [input]);

  // 도넛 (SVG) — 각 bucket을 호로
  const donutSize = 180;
  const donutRadius = 70;
  const donutCx = donutSize / 2;
  const donutCy = donutSize / 2;
  const circumference = 2 * Math.PI * donutRadius;
  let accumDash = 0;

  return (
    <div className={styles.wrap}>
      <header className={styles.heroHead}>
        <span className={styles.eyebrow}>
          <span className={styles.sparkle} aria-hidden="true">✨</span>
          맞춤 포트폴리오
        </span>
        <h2 className={styles.title}>내 나이·목표·성향에 맞춘 자산 배분</h2>
        <p className={styles.lead}>
          TDF(타겟데이트) 방식으로 글라이드 패스를 자동 계산해요. 입력만 바꾸면 즉시 추천이 갱신됩니다.
        </p>
      </header>

      <div className={styles.layout}>
        {/* ── 왼쪽: 입력 폼 ── */}
        <section className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldHead}>
              <span>현재 나이</span>
              <strong>{age}세</strong>
            </label>
            <input
              type="range"
              min={20}
              max={65}
              value={age}
              onChange={e => setAge(Number(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldHead}>
              <span>은퇴 목표</span>
              <strong>{retireAge}세 (남은 {Math.max(0, retireAge - age)}년)</strong>
            </label>
            <input
              type="range"
              min={Math.max(age + 1, 35)}
              max={70}
              value={retireAge}
              onChange={e => setRetireAge(Number(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>위험 성향</span>
            <div className={styles.riskChips}>
              {RISK_OPTIONS.map(o => (
                <button
                  type="button"
                  key={o.key}
                  onClick={() => setRisk(o.key)}
                  className={`${styles.chip} ${risk === o.key ? styles.chipOn : ''}`}
                >
                  <strong>{o.label}</strong>
                  <span>{o.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldHead}>
              <span>한국 vs 미국 (주식 비중)</span>
              <strong>한국 {krWeight}% · 미국 {100 - krWeight}%</strong>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={10}
              value={krWeight}
              onChange={e => setKrWeight(Number(e.target.value))}
              className={styles.range}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldHead}>
              <span>월 적립금</span>
              <strong>{(monthlySave / 10000).toLocaleString('ko-KR')}만원</strong>
            </label>
            <input
              type="range"
              min={100000}
              max={3000000}
              step={100000}
              value={monthlySave}
              onChange={e => setMonthlySave(Number(e.target.value))}
              className={styles.range}
            />
          </div>
        </section>

        {/* ── 오른쪽: 추천 결과 ── */}
        <section className={styles.result}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryEyebrow}>이렇게 추천해요</span>
            <p className={styles.summary}>{rec.summary}</p>
          </div>

          {/* 도넛 + 범례 */}
          <div className={styles.donutBlock}>
            <svg viewBox={`0 0 ${donutSize} ${donutSize}`} width={donutSize} height={donutSize}>
              {rec.buckets.map(b => {
                const length = (b.value / 100) * circumference;
                const arc = (
                  <circle
                    key={b.key}
                    cx={donutCx}
                    cy={donutCy}
                    r={donutRadius}
                    fill="none"
                    stroke={b.color}
                    strokeWidth={22}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-accumDash}
                    transform={`rotate(-90 ${donutCx} ${donutCy})`}
                  />
                );
                accumDash += length;
                return arc;
              })}
              <text
                x={donutCx}
                y={donutCy - 6}
                textAnchor="middle"
                className={styles.donutCenterLabel}
              >
                예상 수익률
              </text>
              <text
                x={donutCx}
                y={donutCy + 14}
                textAnchor="middle"
                className={styles.donutCenterValue}
              >
                연 {rec.expectedReturn.toFixed(1)}%
              </text>
            </svg>
            <ul className={styles.legend}>
              {rec.buckets.map(b => (
                <li key={b.key}>
                  <span className={styles.swatch} style={{ background: b.color }} />
                  <span className={styles.legendName}>{b.label}</span>
                  <strong className={styles.legendValue}>{b.value.toFixed(0)}%</strong>
                </li>
              ))}
            </ul>
          </div>

          {/* 핵심 지표 */}
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span>예상 변동성</span>
              <strong>연 {rec.expectedVolatility.toFixed(1)}%</strong>
            </div>
            <div className={styles.stat}>
              <span>주식 비중</span>
              <strong>{rec.equityPct.toFixed(0)}%</strong>
            </div>
            <div className={styles.stat}>
              <span>은퇴까지</span>
              <strong>{rec.yearsToRetire}년</strong>
            </div>
          </div>

          {/* 카테고리별 추천 ETF */}
          <div className={styles.picks}>
            <h3 className={styles.picksTitle}>카테고리별 추천 ETF</h3>
            {rec.buckets
              .filter(b => b.value > 0.5)
              .map(b => (
                <div key={b.key} className={styles.pickGroup}>
                  <div className={styles.pickGroupHead}>
                    <span className={styles.pickSwatch} style={{ background: b.color }} />
                    <strong>{b.label}</strong>
                    <span className={styles.pickPct}>{b.value.toFixed(0)}%</span>
                  </div>
                  <p className={styles.pickGroupDesc}>{b.description}</p>
                  <div className={styles.pickList}>
                    {b.etfs.map(e => (
                      <Link
                        key={e.code}
                        href={etfPath(e.name)}
                        className={styles.pickItem}
                      >
                        <div className={styles.pickInfo}>
                          <strong>{e.name}</strong>
                          <span>{e.reason}</span>
                        </div>
                        {e.fee && <span className={styles.pickFee}>{e.fee}</span>}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          {/* Glide Path */}
          {rec.glidePath.length > 1 && (
            <div className={styles.glide}>
              <h3 className={styles.picksTitle}>나이별 주식 비중 (글라이드 패스)</h3>
              <p className={styles.glideHint}>
                나이가 들수록 주식 비중을 줄여 변동성에 대비해요.
              </p>
              <div className={styles.glideBars}>
                {rec.glidePath.map(g => (
                  <div key={g.age} className={styles.glideBar}>
                    <div className={styles.glideBarFill} style={{ height: `${g.equity}%` }} />
                    <span className={styles.glideAge}>{g.age}세</span>
                    <span className={styles.glideValue}>{g.equity}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.disclaimer}>
            ※ 추천은 일반적인 글라이드 패스 + 위험성향 가감 기반 참고용이에요.
            세금·환차익·실시간 수익률은 반영되지 않아요.
          </div>
        </section>
      </div>
    </div>
  );
}
