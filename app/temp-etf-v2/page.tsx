import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { etfPath, etfs, type EtfInfo } from '@/lib/etfs';
import styles from './TempEtfV2.module.css';

export const metadata: Metadata = {
  title: 'ETF v2 Mockups',
  robots: {
    index: false,
    follow: false,
  },
};

const [sp500, nasdaq, dividend, sp500Tr, semiconductor] = etfs;
const finderEtfs = [sp500, nasdaq, dividend, semiconductor];
const briefEtfs = [sp500, dividend, semiconductor];
const compareEtfs = [sp500, sp500Tr, nasdaq, dividend];

const marketCards = [
  { label: '많이 본 ETF', value: 'TIGER S&P500', meta: '+18% 이번 주' },
  { label: '초보 검색어', value: '월배당', meta: '질문 32개' },
  { label: '비교 중', value: 'TR vs 분배', meta: '스파링 1개' },
];

const themeCards = [
  { label: 'S&P500', count: '14개', note: '장기 적립 후보', icon: 'chart-line' },
  { label: '나스닥100', count: '9개', note: '성장주 비중 높음', icon: 'bolt' },
  { label: '월배당', count: '18개', note: '현금흐름 비교', icon: 'calendar-check' },
  { label: '반도체', count: '7개', note: '테마형 변동성 체크', icon: 'microchip' },
];

const briefPoints = [
  '환전 없이 사려면 국내상장 ETF가 편해요.',
  '분배금을 바로 쓰지 않으면 TR형도 같이 봐요.',
  '총보수는 낮을수록 좋지만 거래량과 순자산도 같이 봐요.',
];

const questionLinks = ['/q/sp500-etf', '/q/isa-vs-pension'];

export default function TempEtfV2Page() {
  return (
    <AppShell active="etf" wide hideSlogan>
      <main className={styles.page}>
        <header className={styles.header}>
          <span>ETF UI v2</span>
          <h1>ETF 화면, 실제 금융앱 문법으로 다시 다듬기</h1>
          <p>검색은 빠르게, 정보는 한입 크기로, 마지막은 질문과 비교로 이어지게 잡았어요.</p>
        </header>

        <nav className={styles.optionNav} aria-label="ETF 목업 보기">
          <a href="#finder">A 검색형</a>
          <a href="#brief">B 브리프형</a>
          <a href="#community">C 비교형</a>
        </nav>

        <section className={styles.option} id="finder">
          <OptionLabel label="A안" title="ETF Finder" tone="상품을 찾고 관심 ETF를 훑는 화면" />
          <div className={styles.finderBoard}>
            <div className={styles.finderToolbar}>
              <div>
                <span>ETF 탐색</span>
                <strong>검색 · 조건 · 인기 ETF</strong>
              </div>
              <button type="button">
                <FaIcon name="sliders" size={14} />
                조건
              </button>
            </div>

            <div className={styles.finderHero}>
              <div className={styles.searchPane}>
                <div className={styles.searchEyebrow}>국내상장 해외 ETF</div>
                <h2>상품명, 코드, 구성종목을 한 번에 찾아요</h2>
                <div className={styles.searchBox}>
                  <FaIcon name="magnifying-glass" size={16} />
                  <b>S&P500, 360750, 엔비디아</b>
                  <button type="button" aria-label="검색">
                    <FaIcon name="arrow-right" size={14} />
                  </button>
                </div>
                <div className={styles.searchChips}>
                  {['S&P500', '나스닥100', '월배당', '반도체', 'ISA'].map(item => <span key={item}>{item}</span>)}
                </div>
                <div className={styles.marketGrid}>
                  {marketCards.map(card => (
                    <div className={styles.marketCard} key={card.label}>
                      <span>{card.label}</span>
                      <strong>{card.value}</strong>
                      <p>{card.meta}</p>
                    </div>
                  ))}
                </div>
              </div>

              <FeaturedEtfCard etf={sp500} />
            </div>

            <div className={styles.themeGrid}>
              {themeCards.map(card => (
                <button type="button" className={styles.themeCard} key={card.label}>
                  <span>
                    <FaIcon name={card.icon} size={15} />
                  </span>
                  <strong>{card.label}</strong>
                  <em>{card.count}</em>
                  <p>{card.note}</p>
                </button>
              ))}
            </div>

            <div className={styles.finderListHead}>
              <strong>많이 보는 ETF</strong>
              <span>가격 · 등락률 · 보수 · 관련 질문</span>
            </div>
            <div className={styles.finderList}>
              {finderEtfs.map((etf, index) => (
                <EtfListRow etf={etf} index={index + 1} key={etf.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.option} id="brief">
          <OptionLabel label="B안" title="한입 브리프" tone="숫자보다 판단 기준을 먼저 보여주는 화면" />
          <div className={styles.briefCanvas}>
            <article className={styles.briefLead}>
              <span>오늘의 ETF 한입</span>
              <h2>S&P500 ETF는 보수보다 계좌와 분배 방식을 먼저 봐요</h2>
              <p>ISA·연금저축이면 국내상장 ETF가 편하고, 분배금을 쓰지 않는다면 TR형도 후보예요.</p>
              <ol>
                {briefPoints.map(point => (
                  <li key={point}>
                    <FaIcon name="circle-check" size={14} />
                    {point}
                  </li>
                ))}
              </ol>
            </article>

            <div className={styles.briefRail}>
              <div className={styles.briefRailHead}>
                <strong>지금 같이 보면 좋은 ETF</strong>
                <span>3개 후보</span>
              </div>
              {briefEtfs.map(etf => (
                <BriefEtfCard etf={etf} key={etf.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.option} id="community">
          <OptionLabel label="C안" title="비교표 + 질문 연결" tone="ETF 정보창과 커뮤니티를 한 화면에서 연결" />
          <div className={styles.communityBoard}>
            <div className={styles.comparePanel}>
              <div className={styles.compareHead}>
                <div>
                  <span>ETF 비교</span>
                  <h2>S&P500 후보를 한 번에 비교해요</h2>
                </div>
                <button type="button">비교 담기</button>
              </div>

              <div className={styles.compareTable} role="table" aria-label="ETF 비교표">
                <div className={styles.compareHeader} role="row">
                  <span>ETF</span>
                  <span>보수</span>
                  <span>분배</span>
                  <span>환헤지</span>
                  <span>오늘</span>
                </div>
                {compareEtfs.map(etf => (
                  <Link className={styles.compareRow} href={etfPath(etf.slug)} key={etf.slug}>
                    <strong>
                      {etf.shortName}
                      <em>{etf.code} · {etf.fit}</em>
                    </strong>
                    <span>{etf.fee}</span>
                    <span>{etf.distribution}</span>
                    <span>{etf.hedge}</span>
                    <b className={toneClass(etf)}>{etf.change}</b>
                  </Link>
                ))}
              </div>
            </div>

            <aside className={styles.questionPanel}>
              <div className={styles.questionHead}>
                <span>관련 질문</span>
                <h2>사기 전에 많이 묻는 것</h2>
              </div>
              {sp500.relatedQuestions.map((question, index) => (
                <Link href={questionLinks[index] ?? etfPath(sp500.slug)} className={styles.questionCard} key={question.title}>
                  <em>{question.tag}</em>
                  <strong>{question.title}</strong>
                  <p>{question.meta}</p>
                </Link>
              ))}
              <div className={styles.sparringBox}>
                <span>스파링</span>
                <strong>{sp500.sparringTitle}</strong>
                <button type="button">찬반 보기</button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function OptionLabel({ label, title, tone }: { label: string; title: string; tone: string }) {
  return (
    <div className={styles.optionHead}>
      <span>{label}</span>
      <div>
        <h2>{title}</h2>
        <p>{tone}</p>
      </div>
    </div>
  );
}

function FeaturedEtfCard({ etf }: { etf: EtfInfo }) {
  return (
    <Link className={styles.featuredCard} href={etfPath(etf.slug)}>
      <div className={styles.featuredTop}>
        <span>{etf.theme}</span>
        <span className={styles.saveDot} aria-label="관심 ETF 저장">
          <FaIcon name="bookmark" variant="regular" size={15} />
        </span>
      </div>
      <h3>{etf.name}</h3>
      <p>{etf.oneLine}</p>
      <MiniChart tone={etf.changeTone} />
      <div className={styles.featuredPrice}>
        <strong>{etf.price}</strong>
        <b className={toneClass(etf)}>{etf.change}</b>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="총보수" value={etf.fee} />
        <Metric label="분배" value={etf.distribution} />
        <Metric label="순자산" value={etf.aum} />
        <Metric label="질문" value={`${etf.relatedQuestions.length}개`} />
      </div>
    </Link>
  );
}

function EtfListRow({ etf, index }: { etf: EtfInfo; index: number }) {
  return (
    <Link className={styles.listRow} href={etfPath(etf.slug)}>
      <span className={styles.rank}>{index}</span>
      <div className={styles.rowName}>
        <strong>{etf.shortName}</strong>
        <p>{etf.code} · {etf.summary}</p>
      </div>
      <MiniChart tone={etf.changeTone} compact />
      <div className={styles.rowPrice}>
        <b>{etf.price}</b>
        <em className={toneClass(etf)}>{etf.change}</em>
      </div>
      <div className={styles.rowMeta}>
        <span>{etf.fee}</span>
        <span>질문 {etf.relatedQuestions.length}</span>
      </div>
      <FaIcon name="chevron-right" size={13} />
    </Link>
  );
}

function BriefEtfCard({ etf }: { etf: EtfInfo }) {
  return (
    <Link className={styles.briefCard} href={etfPath(etf.slug)}>
      <div>
        <span>{etf.theme}</span>
        <strong>{etf.shortName}</strong>
        <p>{etf.oneLine}</p>
      </div>
      <div className={styles.briefMeta}>
        <b>{etf.price}</b>
        <em className={toneClass(etf)}>{etf.change}</em>
        <small>{etf.fit}</small>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <em>{label}</em>
      <strong>{value}</strong>
    </span>
  );
}

function MiniChart({ tone, compact = false }: { tone: EtfInfo['changeTone']; compact?: boolean }) {
  return (
    <div className={`${styles.miniChart} ${compact ? styles.compactChart : ''} ${tone === 'down' ? styles.chartDown : styles.chartUp}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

function toneClass(etf: EtfInfo) {
  if (etf.changeTone === 'down') return styles.down;
  if (etf.changeTone === 'flat') return styles.flat;
  return styles.up;
}
