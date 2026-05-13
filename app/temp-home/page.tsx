import Link from 'next/link';
import {
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Flame,
  LineChart,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { CATEGORY_DEFINITIONS } from '@/lib/categories';
import { sampleQuestions } from '@/lib/sampleData';
import styles from './TempHome.module.css';

const expertNotes = [
  {
    title: '초보 투자자는 수익률보다 자동이체 구조가 먼저예요',
    meta: '재테크입문 · 6분 읽기',
  },
  {
    title: 'ISA, 연금저축, IRP 순서는 소득과 사용 시점으로 나눠요',
    meta: '절세 · 답변 18개',
  },
  {
    title: 'ETF 고점 걱정은 분할매수 규칙으로 줄일 수 있어요',
    meta: '해외주식·ETF · 인기',
  },
];

const quickStats = [
  { label: '오늘 올라온 질문', value: '128' },
  { label: '채택된 답변', value: '42' },
  { label: '평균 첫 답변', value: '11분' },
];

export default function TempHomePage() {
  const featuredQuestions = sampleQuestions.slice(0, 4);
  const categories = CATEGORY_DEFINITIONS.slice(0, 6);

  return (
    <main className={styles.screen}>
      <nav className={styles.nav} aria-label="임시 홈 내비게이션">
        <Link href="/" className={`${styles.logo} logo-font`}>
          ETF<em>한입</em>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/topics/재테크-입문">토픽</Link>
          <Link href="/sparring">스파링</Link>
          <Link href="/feed">피드</Link>
          <Link href="/auth">로그인</Link>
        </div>
        <button className={styles.iconButton} aria-label="알림">
          <Bell size={18} />
        </button>
      </nav>

      <section className={styles.commandCenter} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>
            <Sparkles size={15} />
            돈 고민이 생겼을 때 바로 묻는 곳
          </span>
          <h1 id="home-title">재테크 질문을 한입 크기로 정리해드려요</h1>
          <p>
            월급 관리, ETF, 절세, 보험, 대출까지. 질문을 남기면 비슷한 고민과 검증된 답변을 먼저 보여주고,
            필요한 부분은 전문가 답변으로 이어집니다.
          </p>
          <form className={styles.searchPanel}>
            <Search size={18} aria-hidden="true" />
            <input aria-label="재테크 질문 검색" placeholder="예: S&P500 ETF 지금 시작해도 될까요?" />
            <button type="button">
              질문하기
              <ArrowRight size={16} />
            </button>
          </form>
          <div className={styles.topicChips} aria-label="추천 검색어">
            {['S&P500', 'ISA계좌', '월급관리', '실손보험'].map((chip) => (
              <button key={chip} type="button">{chip}</button>
            ))}
          </div>
        </div>

        <aside className={styles.insightPanel} aria-label="오늘의 재테크 요약">
          <div className={styles.panelHeader}>
            <span>
              <LineChart size={16} />
              오늘의 질문 흐름
            </span>
            <strong>LIVE</strong>
          </div>
          <div className={styles.statGrid}>
            {quickStats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
          <div className={styles.trendBox}>
            <div>
              <span>가장 많이 묻는 주제</span>
              <strong>ETF 고점·분할매수</strong>
            </div>
            <TrendingUp size={20} />
          </div>
        </aside>
      </section>

      <section className={styles.contentGrid} aria-label="홈 콘텐츠">
        <div className={styles.feedColumn}>
          <div className={styles.sectionHead}>
            <div>
              <span>인기 질문</span>
              <h2>지금 사람들이 답을 기다리는 질문</h2>
            </div>
            <Link href="/feed">
              전체 보기
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className={styles.questionList}>
            {featuredQuestions.map((question) => (
              <Link href={`/q/${question.slug}`} className={styles.questionCard} key={question.slug}>
                <div className={styles.questionMeta}>
                  <span>{question.cat}</span>
                  <span>{question.time}</span>
                </div>
                <h3>{question.title}</h3>
                <p>{question.body}</p>
                <div className={styles.questionFoot}>
                  <span>
                    <MessageCircle size={14} />
                    답변 {question.ans}
                  </span>
                  <span>
                    <Bookmark size={14} />
                    저장 {question.likeCount}
                  </span>
                  {question.adopted && (
                    <em>
                      <CheckCircle2 size={14} />
                      채택
                    </em>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        <aside className={styles.sideColumn}>
          <section className={styles.categoryPanel} aria-labelledby="category-title">
            <div className={styles.sectionHeadCompact}>
              <span>토픽</span>
              <h2 id="category-title">관심사로 빠르게 이동</h2>
            </div>
            <div className={styles.categoryList}>
              {categories.map((category) => (
                <Link href={`/topics/${category.slug}`} key={category.key}>
                  <span>{category.emoji}</span>
                  <div>
                    <strong>{category.label}</strong>
                    <small>{category.description}</small>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.sparringPanel} aria-labelledby="sparring-title">
            <span className={styles.panelEyebrow}>
              <Flame size={14} />
              스파링
            </span>
            <h2 id="sparring-title">지금 S&P500 들어가도 될까요?</h2>
            <p>찬반 의견을 보고 내 투자 기준을 점검해보세요.</p>
            <Link href="/sparring">
              참여하기
              <ArrowRight size={16} />
            </Link>
          </section>

          <section className={styles.notePanel} aria-labelledby="note-title">
            <div className={styles.sectionHeadCompact}>
              <span>전문가 노트</span>
              <h2 id="note-title">짧게 읽는 돈 공부</h2>
            </div>
            {expertNotes.map((note) => (
              <Link href="/feed" key={note.title} className={styles.noteLink}>
                <CircleDollarSign size={16} />
                <div>
                  <strong>{note.title}</strong>
                  <small>{note.meta}</small>
                </div>
              </Link>
            ))}
          </section>

          <section className={styles.trustPanel} aria-label="서비스 신뢰 요소">
            <ShieldCheck size={18} />
            <p>답변은 정보 제공 목적이며, 투자 판단 전 개인 상황과 리스크를 함께 확인하도록 안내합니다.</p>
          </section>
        </aside>
      </section>
    </main>
  );
}
