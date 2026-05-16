'use client';

/**
 * 맞춤 포트폴리오 추천 — 초보자용 단계별 wizard.
 *
 * 어디서부터 시작할지 모르는 사람을 대상으로
 * 5개 짧은 질문을 통해 자기 상황을 파악 → 자산 배분 + ETF 추천.
 *
 * 슬라이더 대신 chip 선택 (생각 부담 ↓)
 * 단계마다 친근한 한 줄 설명 (한입 톤)
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  recommendPortfolio,
  type RiskProfile,
} from '@/lib/portfolioRecommend';
import { etfPath } from '@/lib/etfs';
import styles from './AutoPortfolio.module.css';

// ── 단계별 선택지 ────────────────────────────────────
type AgeBucket = '20s' | '30s' | '40s' | '50s' | '60s';
type Horizon = 'short' | 'mid' | 'long' | 'retire';
type Goal = 'wealth' | 'house' | 'retire' | 'income';
type AmountBucket = '10' | '30' | '50' | '100' | '300';

const AGE_OPTIONS: { key: AgeBucket; label: string; sub: string; ageMid: number }[] = [
  { key: '20s', label: '20대', sub: '시간이 가장 많은 시기',    ageMid: 25 },
  { key: '30s', label: '30대', sub: '본격적인 자산 형성',       ageMid: 33 },
  { key: '40s', label: '40대', sub: '교육·내집 + 노후 준비',    ageMid: 43 },
  { key: '50s', label: '50대', sub: '은퇴 본격 준비',           ageMid: 53 },
  { key: '60s', label: '60대+', sub: '안정적 인출이 중요',       ageMid: 63 },
];

const GOAL_OPTIONS: { key: Goal; label: string; sub: string; emoji: string }[] = [
  { key: 'wealth', label: '자산 늘리기',  sub: '장기 우상향 노출',         emoji: '📈' },
  { key: 'house',  label: '내 집 마련',   sub: '3~7년 묻어둘 돈',          emoji: '🏠' },
  { key: 'retire', label: '노후 준비',    sub: '10년 이상 천천히',          emoji: '🌱' },
  { key: 'income', label: '월 현금흐름',  sub: '분배 받으면서 굴리기',      emoji: '💵' },
];

const HORIZON_OPTIONS: { key: Horizon; label: string; sub: string; years: number }[] = [
  { key: 'short',  label: '~3년',    sub: '단기 — 변동성 부담 ↑',  years: 3 },
  { key: 'mid',    label: '3~7년',   sub: '중기',                  years: 6 },
  { key: 'long',   label: '7~15년',  sub: '장기',                  years: 12 },
  { key: 'retire', label: '15년+',   sub: '은퇴까지 묻어둠',        years: 20 },
];

const RISK_OPTIONS: { key: RiskProfile; label: string; sub: string; tone: string }[] = [
  { key: 'conservative', label: '안정형', sub: '원금 지키기 우선 — 손실 0~5% 이내',     tone: '🛡️' },
  { key: 'neutral',      label: '중립형', sub: '균형 — 손실 5~15% 견딜 수 있음',       tone: '⚖️' },
  { key: 'aggressive',   label: '공격형', sub: '성장 우선 — 손실 15~30% 견딜 수 있음', tone: '🚀' },
];

const AMOUNT_OPTIONS: { key: AmountBucket; label: string; won: number }[] = [
  { key: '10',  label: '10만원',  won: 100_000 },
  { key: '30',  label: '30만원',  won: 300_000 },
  { key: '50',  label: '50만원',  won: 500_000 },
  { key: '100', label: '100만원', won: 1_000_000 },
  { key: '300', label: '300만원+', won: 3_000_000 },
];

// ── 답변 → recommendInput 매핑 ──────────────────────
function mapAnswersToInput(a: Answers) {
  const ageMid = AGE_OPTIONS.find(o => o.key === a.age)!.ageMid;
  const horizonYears = HORIZON_OPTIONS.find(o => o.key === a.horizon)!.years;
  const monthlySave = AMOUNT_OPTIONS.find(o => o.key === a.amount)!.won;

  // 은퇴 나이 = 현재 나이 + horizon (장기일수록 늦음)
  const retireAge = Math.min(70, ageMid + horizonYears);

  // 목표별 한국 vs 미국 비중 (안정형/내집 = 국내↑, 자산 늘리기 = 글로벌)
  let krWeight = 30;
  if (a.goal === 'house') krWeight = 40;       // 단기 자산 보수
  if (a.goal === 'income') krWeight = 50;      // 분배 국내 비중
  if (a.goal === 'wealth') krWeight = 25;      // 글로벌 우선
  if (a.goal === 'retire') krWeight = 30;      // 균형

  return {
    age: ageMid,
    retireAge,
    risk: a.risk,
    krWeight,
    monthlySave,
  };
}

// ── 답변 상태 ──────────────────────────────────────
type Answers = {
  age: AgeBucket;
  goal: Goal;
  horizon: Horizon;
  risk: RiskProfile;
  amount: AmountBucket;
};

const STEPS = [
  { key: 'age',     title: '나이대가 어떻게 되세요?',      hint: '대략적인 시기만 알려주시면 돼요.' },
  { key: 'goal',    title: '왜 투자를 시작하세요?',         hint: '가장 가까운 목표 하나만 골라주세요.' },
  { key: 'horizon', title: '이 돈, 얼마나 묻어둘 수 있어요?', hint: '오래 묻어둘수록 변동에 강하게 갈 수 있어요.' },
  { key: 'risk',    title: '손실, 얼마까지 견딜 수 있을까요?', hint: '솔직하게 — 잘못 답하면 나만 손해예요.' },
  { key: 'amount',  title: '한 달에 얼마씩 모으실래요?',     hint: '나중에 바꿔도 괜찮아요.' },
] as const;

export function AutoPortfolio() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Answers>>({});
  const [showResult, setShowResult] = useState(false);

  const totalSteps = STEPS.length;
  const isStepAnswered = (i: number) => !!answers[STEPS[i].key];
  const allAnswered = STEPS.every((_, i) => isStepAnswered(i));

  const rec = useMemo(() => {
    if (!allAnswered) return null;
    return recommendPortfolio(mapAnswersToInput(answers as Answers));
  }, [answers, allAnswered]);

  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
    // 마지막 step이면 자동 결과로
    if (key === 'amount') {
      setShowResult(true);
    } else {
      // 자동으로 다음 step
      setTimeout(() => setStep(s => Math.min(s + 1, totalSteps - 1)), 180);
    }
  };

  // ── 결과 보기 ──
  if (showResult && rec) {
    return <Result rec={rec} answers={answers as Answers} onRestart={() => { setAnswers({}); setStep(0); setShowResult(false); }} />;
  }

  const current = STEPS[step];

  return (
    <div className={styles.wizardWrap}>
      <header className={styles.wizardHeader}>
        <span className={styles.eyebrow}>
          <span className={styles.sparkle} aria-hidden="true">✨</span>
          맞춤 포트폴리오 만들기
        </span>
        <h2 className={styles.wizardTitle}>
          어디서부터 시작할지 막막하다면<br />
          5개 질문으로 출발점을 찾아드릴게요.
        </h2>
      </header>

      {/* 진행 표시 */}
      <div className={styles.progressBar}>
        {STEPS.map((s, i) => (
          <button
            type="button"
            key={s.key}
            onClick={() => setStep(i)}
            disabled={!isStepAnswered(i) && i > step}
            className={`${styles.progressDot} ${i === step ? styles.progressDotActive : ''} ${isStepAnswered(i) ? styles.progressDotDone : ''}`}
            aria-label={`${i + 1} / ${totalSteps}: ${s.title}`}
          >
            <span>{i + 1}</span>
          </button>
        ))}
      </div>

      {/* 현재 step */}
      <section className={styles.stepCard}>
        <div className={styles.stepCount}>{step + 1} / {totalSteps}</div>
        <h3 className={styles.stepTitle}>{current.title}</h3>
        <p className={styles.stepHint}>{current.hint}</p>

        <div className={styles.choices}>
          {current.key === 'age' && AGE_OPTIONS.map(o => (
            <ChoiceCard
              key={o.key}
              label={o.label}
              sub={o.sub}
              selected={answers.age === o.key}
              onClick={() => setAnswer('age', o.key)}
            />
          ))}
          {current.key === 'goal' && GOAL_OPTIONS.map(o => (
            <ChoiceCard
              key={o.key}
              label={o.label}
              sub={o.sub}
              emoji={o.emoji}
              selected={answers.goal === o.key}
              onClick={() => setAnswer('goal', o.key)}
            />
          ))}
          {current.key === 'horizon' && HORIZON_OPTIONS.map(o => (
            <ChoiceCard
              key={o.key}
              label={o.label}
              sub={o.sub}
              selected={answers.horizon === o.key}
              onClick={() => setAnswer('horizon', o.key)}
            />
          ))}
          {current.key === 'risk' && RISK_OPTIONS.map(o => (
            <ChoiceCard
              key={o.key}
              label={o.label}
              sub={o.sub}
              emoji={o.tone}
              selected={answers.risk === o.key}
              onClick={() => setAnswer('risk', o.key)}
            />
          ))}
          {current.key === 'amount' && AMOUNT_OPTIONS.map(o => (
            <ChoiceCard
              key={o.key}
              label={o.label}
              selected={answers.amount === o.key}
              onClick={() => setAnswer('amount', o.key)}
              compact
            />
          ))}
        </div>

        {/* 네비 */}
        <div className={styles.stepNav}>
          {step > 0 ? (
            <button type="button" className={styles.stepBack} onClick={() => setStep(s => s - 1)}>
              ← 이전
            </button>
          ) : <span />}
          {allAnswered && (
            <button type="button" className={styles.stepNext} onClick={() => setShowResult(true)}>
              결과 바로 보기 →
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

// ── 선택지 카드 ─────────────────────────────────────
function ChoiceCard({ label, sub, emoji, selected, onClick, compact }: {
  label: string;
  sub?: string;
  emoji?: string;
  selected?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${styles.choice} ${selected ? styles.choiceOn : ''} ${compact ? styles.choiceCompact : ''}`}
    >
      {emoji && <span className={`${styles.choiceEmoji} tf`} aria-hidden="true">{emoji}</span>}
      <span className={styles.choiceText}>
        <strong>{label}</strong>
        {sub && <span>{sub}</span>}
      </span>
      {selected && <span className={styles.choiceCheck} aria-hidden="true">✓</span>}
    </button>
  );
}

// ── 결과 화면 ──────────────────────────────────────
function Result({ rec, answers, onRestart }: {
  rec: NonNullable<ReturnType<typeof recommendPortfolio>>;
  answers: Answers;
  onRestart: () => void;
}) {
  const donutSize = 200;
  const donutRadius = 78;
  const donutCx = donutSize / 2;
  const donutCy = donutSize / 2;
  const circumference = 2 * Math.PI * donutRadius;
  let accumDash = 0;

  const ageLabel = AGE_OPTIONS.find(o => o.key === answers.age)?.label;
  const goalLabel = GOAL_OPTIONS.find(o => o.key === answers.goal)?.label;
  const amountLabel = AMOUNT_OPTIONS.find(o => o.key === answers.amount)?.label;
  const riskLabel = answers.risk ? (
    answers.risk === 'conservative' ? '안정형'
    : answers.risk === 'neutral' ? '중립형'
    : '공격형'
  ) : '';
  const horizonLabel = answers.horizon ? (
    answers.horizon === 'short' ? '1-3년'
    : answers.horizon === 'mid' ? '3-7년'
    : answers.horizon === 'long' ? '7-15년'
    : '15년+'
  ) : '';

  // ── AI 코멘트 (한입 톤, 캐시 7일) ──
  const [aiComment, setAiComment] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai/portfolio-comment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ageLabel,
        goalLabel,
        amountLabel,
        riskLabel,
        horizonLabel,
        buckets: rec.buckets.map(b => ({ key: b.key, label: b.label, value: b.value })),
        expectedReturn: rec.expectedReturn,
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j?.comment) setAiComment(j.comment); })
      .catch(() => { /* fallback to summary */ });
    return () => { cancelled = true; };
  }, [ageLabel, goalLabel, amountLabel, riskLabel, horizonLabel, rec]);

  return (
    <div className={styles.resultWrap}>
      <header className={styles.resultHero}>
        <span className={styles.eyebrow}>
          <span className={styles.sparkle} aria-hidden="true">✨</span>
          맞춤 추천 결과
        </span>
        <h2 className={styles.resultTitle}>
          {ageLabel} · {goalLabel} · 매월 {amountLabel}
        </h2>
        <p className={styles.resultLead}>{aiComment || rec.summary}</p>
        <button type="button" className={styles.restartBtn} onClick={onRestart}>
          답변 다시하기 ↻
        </button>
      </header>

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
                strokeWidth={24}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-accumDash}
                transform={`rotate(-90 ${donutCx} ${donutCy})`}
              />
            );
            accumDash += length;
            return arc;
          })}
          <text x={donutCx} y={donutCy - 8} textAnchor="middle" className={styles.donutCenterLabel}>예상 수익률</text>
          <text x={donutCx} y={donutCy + 16} textAnchor="middle" className={styles.donutCenterValue}>
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

      {/* 통계 */}
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

      {/* 추천 ETF */}
      <div className={styles.picks}>
        <h3 className={styles.picksTitle}>이렇게 담아보세요</h3>
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
                  <Link key={e.code} href={etfPath(e.name)} className={styles.pickItem}>
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

      <div className={styles.disclaimer}>
        ※ 추천은 일반적인 글라이드 패스 + 위험성향 기반 참고용이에요. 세금·환차익·실시간 수익률은 반영되지 않아요.
      </div>
    </div>
  );
}
