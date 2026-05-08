'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Flame,
  MessageCircle,
  Scale,
  ShieldCheck,
  Swords,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import styles from './SparringPage.module.css';

const SCENARIOS = [
  {
    id: 'sp500-now',
    category: '주식·ETF',
    title: 'S&P500 ETF, 지금 들어가도 될까요?',
    body: '이미 많이 오른 것 같지만 예금만 들고 있기도 아쉬운 상황이에요.',
    left: '분할 매수 시작',
    right: '현금 비중 유지',
    heat: 74,
    pros: ['장기 투자라면 진입 시점보다 지속성이 중요해요.', '환율과 시장 변동을 나눠서 맞을 수 있어요.', '예금만으로는 물가를 따라가기 어려울 수 있어요.'],
    cons: ['단기 고점이면 초반 손실이 크게 느껴질 수 있어요.', '비상금이 없으면 하락장을 버티기 어려워요.', '미국 주식 편중이 커질 수 있어요.'],
  },
  {
    id: 'isa-vs-pension',
    category: '절세',
    title: 'ISA와 연금저축, 뭐부터 채워야 할까요?',
    body: '매달 남는 돈은 40만원 정도라 둘 다 꽉 채우기는 어려워요.',
    left: 'ISA 먼저',
    right: '연금저축 먼저',
    heat: 61,
    pros: ['중도 활용 가능성이 더 높아 초반 자금에 부담이 덜해요.', '투자 이익 비과세/분리과세 효과를 기대할 수 있어요.', '목돈 목적과 절세를 같이 잡기 좋아요.'],
    cons: ['노후 목적이면 연금저축의 세액공제 효과가 더 직접적일 수 있어요.', '계좌별 한도와 만기 조건을 헷갈리기 쉬워요.', '소득 구간에 따라 우선순위가 달라져요.'],
  },
  {
    id: 'insurance-20s',
    category: '보험',
    title: '건강한 20대도 실손보험이 필요할까요?',
    body: '보험료를 아끼고 싶은데 나중에 가입이 어려울까 걱정돼요.',
    left: '기본 보장 유지',
    right: '보험료 최소화',
    heat: 58,
    pros: ['예상 못 한 의료비에 대비할 수 있어요.', '건강할 때 가입 조건이 더 나을 수 있어요.', '큰 병보다 잦은 병원비 부담을 줄이는 역할도 있어요.'],
    cons: ['매달 고정비가 늘어나요.', '보장 범위를 이해하지 못하면 과하게 가입할 수 있어요.', '비상금이 충분하면 우선순위가 낮아질 수도 있어요.'],
  },
];

const CHECKPOINTS = [
  '비상금 3개월 이상을 따로 뺐다',
  '최악의 경우 손실/고정비를 숫자로 적었다',
  '내 소득과 기간에 맞는 선택인지 확인했다',
  '남들이 한다는 이유만으로 고르지 않았다',
];

export default function SparringClient() {
  const [selectedId, setSelectedId] = useState(SCENARIOS[0].id);
  const [stance, setStance] = useState<'left' | 'right'>('left');
  const [confidence, setConfidence] = useState(62);
  const [checked, setChecked] = useState<string[]>([]);
  const selected = SCENARIOS.find(item => item.id === selectedId) || SCENARIOS[0];
  const stanceLabel = stance === 'left' ? selected.left : selected.right;
  const counterLabel = stance === 'left' ? selected.right : selected.left;
  const counterPoints = stance === 'left' ? selected.cons : selected.pros;
  const score = useMemo(() => {
    const guardrail = checked.length * 8;
    const balance = Math.abs(confidence - 55) > 30 ? -8 : 6;
    return Math.max(0, Math.min(100, confidence + guardrail + balance));
  }, [checked.length, confidence]);

  const toggleCheck = (item: string) => {
    setChecked(prev => prev.includes(item) ? prev.filter(v => v !== item) : [...prev, item]);
  };

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link className={`${styles.logo} logo-font`} href="/">재테크<em>한입</em></Link>
        <div className={styles.navLinks}>
          <Link href="/">홈</Link>
          <Link href="/topics/finance-basics">토픽</Link>
          <Link className={styles.active} href="/sparring">스파링</Link>
        </div>
      </nav>

      <section className={styles.header}>
        <Link href="/" className={styles.back}><ArrowLeft size={16} /> 홈</Link>
        <div>
          <span className={styles.eyebrow}><Swords size={15} /> Money Sparring</span>
          <h1>돈 결정, 바로 지르기 전에 한 판 붙어보기</h1>
          <p>찬성 쪽과 반대 쪽을 같이 세워두고, 내가 놓친 리스크를 먼저 확인해요.</p>
        </div>
      </section>

      <section className={styles.layout}>
        <aside className={styles.rail} aria-label="스파링 주제">
          {SCENARIOS.map(item => (
            <button
              key={item.id}
              className={`${styles.topicCard} ${selected.id === item.id ? styles.topicOn : ''}`}
              onClick={() => {
                setSelectedId(item.id);
                setStance('left');
                setConfidence(62);
                setChecked([]);
              }}
            >
              <span>{item.category}</span>
              <strong>{item.title}</strong>
              <em><Flame size={13} /> 참여 열기 {item.heat}%</em>
            </button>
          ))}
        </aside>

        <div className={styles.arena}>
          <article className={styles.questionPanel}>
            <span>{selected.category}</span>
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
          </article>

          <div className={styles.choiceGrid}>
            <button
              className={`${styles.choice} ${stance === 'left' ? styles.choiceOn : ''}`}
              onClick={() => setStance('left')}
            >
              <ThumbsUp size={18} />
              <strong>{selected.left}</strong>
              <small>내 선택으로 두고 검증</small>
            </button>
            <button
              className={`${styles.choice} ${stance === 'right' ? styles.choiceOn : ''}`}
              onClick={() => setStance('right')}
            >
              <ThumbsDown size={18} />
              <strong>{selected.right}</strong>
              <small>반대 선택으로 검증</small>
            </button>
          </div>

          <section className={styles.round}>
            <div className={styles.roundHead}>
              <span><Scale size={16} /> 반대편 코너</span>
              <strong>{counterLabel}</strong>
            </div>
            <div className={styles.counterList}>
              {counterPoints.map(point => (
                <div key={point} className={styles.counterItem}>
                  <ChevronRight size={15} />
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.checkPanel}>
            <div className={styles.roundHead}>
              <span><ShieldCheck size={16} /> 결정 전 체크</span>
              <strong>{checked.length}/{CHECKPOINTS.length}</strong>
            </div>
            <div className={styles.checks}>
              {CHECKPOINTS.map(item => (
                <label key={item} className={checked.includes(item) ? styles.checked : ''}>
                  <input
                    type="checkbox"
                    checked={checked.includes(item)}
                    onChange={() => toggleCheck(item)}
                  />
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <aside className={styles.result}>
          <div className={styles.scoreBox}>
            <BarChart3 size={20} />
            <span>판단 준비도</span>
            <strong>{score}</strong>
          </div>
          <label className={styles.sliderBox}>
            <span>내 확신도</span>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={e => setConfidence(Number(e.target.value))}
            />
            <em>{confidence}%</em>
          </label>
          <div className={styles.memo}>
            <span><MessageCircle size={15} /> 오늘의 결론</span>
            <p>
              나는 지금 <b>{stanceLabel}</b> 쪽으로 기울었고,
              반대 논리 중 <b>{counterPoints[0]}</b>를 먼저 확인해야 해요.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
