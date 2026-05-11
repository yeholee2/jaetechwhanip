import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'ETF 시안 (토스 스타일) | 재테크한입',
  robots: { index: false, follow: false },
};

export default function TempEtfTossPage() {
  return (
    <AppShell active="etf" hideSlogan>
      <main className={styles.page}>
        {/* ── 헤더 — 큰 친근 카피 ── */}
        <header className={styles.header}>
          <h1>
            ETF, 한 입에 <span className="tf">🍽️</span>
          </h1>
          <p>시장 흐름이랑 내 ETF 둘 다 챙겨요.</p>
        </header>

        {/* ── 시안 라벨 ── */}
        <div className={styles.demoBadge}>
          🎨 토스 스타일 시안 · 비교용 (실제 데이터 X)
        </div>

        {/* ── 메인 자산 카드 (토스 메인) ── */}
        <section className={styles.heroCard}>
          <span className={styles.heroLabel}>오늘 내 ETF는</span>
          <div className={styles.heroChange}>
            <span className="tf">📈</span> +12,300원 벌었어요
          </div>
          <div className={styles.heroAmount}>1,234,567원</div>
          <div className={styles.heroSub}>+0.61% 일간 수익</div>

          {/* 추이 미니 그래프 (정적 SVG) */}
          <svg className={styles.spark} viewBox="0 0 320 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3182F6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3182F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 40 L 30 35 L 60 38 L 90 30 L 120 32 L 150 25 L 180 28 L 210 18 L 240 22 L 270 14 L 300 16 L 320 10"
              fill="none"
              stroke="#3182F6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 0 40 L 30 35 L 60 38 L 90 30 L 120 32 L 150 25 L 180 28 L 210 18 L 240 22 L 270 14 L 300 16 L 320 10 L 320 60 L 0 60 Z"
              fill="url(#g1)"
            />
          </svg>

          {/* 5 액션 */}
          <div className={styles.actions}>
            {[
              { icon: '%', label: '수익' },
              { icon: '🧾', label: '세금' },
              { icon: '💵', label: '배당' },
              { icon: '📊', label: '추이' },
              { icon: '🥧', label: '비중' },
            ].map(a => (
              <div key={a.label} className={styles.actionItem}>
                <span className={`${styles.actionIcon} tf`}>{a.icon}</span>
                <span className={styles.actionLabel}>{a.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 검색 (토스식 큰 입력) ── */}
        <section className={styles.searchCard}>
          <span className={styles.searchIcon} aria-hidden="true">🔍</span>
          <input
            type="search"
            placeholder="어떤 ETF 찾고 있어요?"
            className={styles.searchInput}
            readOnly
          />
        </section>

        {/* ── 빠른 진입 (토스 메뉴 카드 패턴) ── */}
        <section className={styles.quickRow}>
          <Link className={styles.quickCard} href="#">
            <span className={`${styles.quickIcon} tf`}>💰</span>
            <strong>큰 돈 모으는 ETF</strong>
            <span>적립식·ISA</span>
          </Link>
          <Link className={styles.quickCard} href="#">
            <span className={`${styles.quickIcon} tf`}>🩺</span>
            <strong>내 ETF 진단받기</strong>
            <span>비중·리스크</span>
          </Link>
          <Link className={styles.quickCard} href="#">
            <span className={`${styles.quickIcon} tf`}>🎯</span>
            <strong>월배당 ETF</strong>
            <span>월급처럼</span>
          </Link>
        </section>

        {/* ── 큐레이션 (가로 스크롤) ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>이번 주 주목할 ETF</h3>
            <Link href="#" className={styles.more}>전체 보기</Link>
          </div>
          <div className={styles.curationScroller}>
            {[
              { emoji: '🚀', title: 'S&P500 첫 ETF', sub: '초보자 추천', tag: 'TIGER S&P500', color: '#3182F6' },
              { emoji: '💸', title: '월급 모이는 월배당', sub: '매달 분배', tag: 'ACE 미국배당', color: '#15c47e' },
              { emoji: '🔥', title: '요즘 핫한 반도체', sub: 'AI 시대', tag: 'TIGER 반도체', color: '#ff7a00' },
              { emoji: '🛡️', title: '안전형 채권 ETF', sub: '저변동', tag: 'KODEX 단기채', color: '#6b7684' },
            ].map(c => (
              <Link key={c.title} href="#" className={styles.curationCard} style={{ background: `linear-gradient(135deg, ${c.color}1a 0%, ${c.color}05 100%)` }}>
                <span className={`${styles.curationEmoji} tf`}>{c.emoji}</span>
                <strong>{c.title}</strong>
                <span className={styles.curationSub}>{c.sub}</span>
                <div className={styles.curationTag}>{c.tag} →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 시장 지수 (작게) ── */}
        <section className={styles.indices}>
          {[
            { name: '코스피', val: '7,822', chg: '+4.32%', up: true },
            { name: 'S&P500', val: '7,398', chg: '+0.84%', up: true },
            { name: '나스닥', val: '26,247', chg: '+1.71%', up: true },
            { name: '원달러', val: '1,474', chg: '+0.86%', up: true },
          ].map(i => (
            <div key={i.name} className={styles.indexItem}>
              <span className={styles.indexName}>{i.name}</span>
              <span className={styles.indexVal}>{i.val}</span>
              <span className={i.up ? styles.up : styles.down}>{i.chg}</span>
            </div>
          ))}
        </section>

        {/* ── 스파링 강조 (우리 차별점) ── */}
        <section className={styles.sparringCard}>
          <div className={styles.sparringHead}>
            <span className={`${styles.sparringEmoji} tf`}>💬</span>
            <div>
              <strong>이거 어떻게 생각해요?</strong>
              <span>지금 다른 사람들의 생각을 듣고 결정해봐요</span>
            </div>
          </div>
          <h2 className={styles.sparringQ}>
            코스피 신고가 근처에서<br />
            적립식 매수를 시작해도 될까요?
          </h2>
          <div className={styles.sparringVote}>
            <button className={styles.voteA}>
              <span>👍</span>
              <strong>분할 매수 시작</strong>
              <em>2,185명</em>
            </button>
            <button className={styles.voteB}>
              <span>👎</span>
              <strong>현금 유지</strong>
              <em>1,420명</em>
            </button>
          </div>
        </section>

        {/* ── 한입 칼럼 ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h3>한입에 끝내는 ETF 가이드</h3>
            <Link href="#" className={styles.more}>전체 보기</Link>
          </div>
          <div className={styles.articleList}>
            {[
              { emoji: '📘', title: 'ISA 계좌 3가지, 안 챙기면 손해', meta: '에디터 한입이 · 9시간 전' },
              { emoji: '💵', title: 'S&P500 첫 ETF, 환헤지 해야 할까?', meta: '에디터 한입이 · 6시간 전' },
              { emoji: '🏠', title: '월배당 ETF로 월급 흐름 만들기', meta: '에디터 한입이 · 1일 전' },
            ].map(a => (
              <Link key={a.title} href="#" className={styles.articleCard}>
                <span className={`${styles.articleEmoji} tf`}>{a.emoji}</span>
                <div>
                  <strong>{a.title}</strong>
                  <span>{a.meta}</span>
                </div>
                <span className={styles.articleArrow}>›</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── 큰 CTA 카드 ── */}
        <Link href="#" className={styles.bigCta}>
          <div>
            <strong>월급 모으는 ETF, 처음부터 끝까지</strong>
            <span>적립식 투자가 처음이라면 이 글부터 읽어봐요</span>
          </div>
          <span className={`${styles.bigCtaEmoji} tf`}>💼</span>
        </Link>

        <p className={styles.footer}>
          🎨 시안: 토스 스타일 × a-ha × RiskWeather × FunETF<br />
          비교용 별도 라우트, 메인 /etf 는 그대로
        </p>
      </main>
    </AppShell>
  );
}
