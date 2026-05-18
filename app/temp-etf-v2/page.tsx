import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { etfPath, getStaticEtfMetadata, type EtfInfo } from '@/lib/etfs';
import styles from './TempEtfV2.module.css';

export const metadata: Metadata = {
  title: 'ETF v2 Mockups',
  robots: {
    index: false,
    follow: false,
  },
};

const [sp500, nasdaq, dividend, sp500Tr, semiconductor] = getStaticEtfMetadata();
const optionAEtfs = [sp500, nasdaq, dividend];
const optionBEtfs = [sp500, dividend, semiconductor];
const optionCEtfs = [sp500, sp500Tr, nasdaq, dividend];

export default function TempEtfV2Page() {
  return (
    <AppShell active="etf" wide hideSlogan>
      <main className={styles.page}>
        <header className={styles.header}>
          <span>ETF UI v2</span>
          <h1>ETF 화면, 세 가지 방향으로 보기</h1>
          <p>FunETF의 검색·비교 구조, 토스증권의 요약감, 재테크한입의 질문 연결을 각각 다른 비중으로 잡았어요.</p>
        </header>

        <nav className={styles.optionNav} aria-label="ETF 목업 보기">
          <a href="#finder">A 검색형</a>
          <a href="#brief">B 요약형</a>
          <a href="#community">C 질문형</a>
        </nav>

        <section className={`${styles.option} ${styles.finder}`} id="finder">
          <OptionLabel label="A안" title="검색 중심 ETF Finder" tone="상품을 빨리 찾고 비교하는 화면" />
          <div className={styles.finderShell}>
            <div className={styles.finderHero}>
              <div className={styles.searchBlock}>
                <span>ETF 통합검색</span>
                <h2>상품명, 코드, 구성종목으로 바로 찾아요</h2>
                <div className={styles.searchBox}>
                  <FaIcon name="magnifying-glass" size={16} />
                  <b>S&P500, 360750, 엔비디아</b>
                  <button type="button" aria-label="검색">
                    <FaIcon name="arrow-right" size={14} />
                  </button>
                </div>
                <div className={styles.chips}>
                  {['S&P500', '나스닥100', '월배당', '반도체', 'ISA'].map(item => <span key={item}>{item}</span>)}
                </div>
              </div>
              <FeaturedEtfCard etf={sp500} variant="finder" />
            </div>

            <div className={styles.finderList}>
              {optionAEtfs.map((etf, index) => (
                <EtfRowCard etf={etf} index={index + 1} key={etf.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.option} ${styles.brief}`} id="brief">
          <OptionLabel label="B안" title="토스식 한입 브리프" tone="초보자가 판단 기준을 먼저 이해하는 화면" />
          <div className={styles.briefGrid}>
            <div className={styles.briefLead}>
              <span>오늘의 한입</span>
              <h2>S&P500 ETF는 보수보다 계좌와 분배 방식을 먼저 봐요</h2>
              <p>ISA·연금저축이면 국내상장 ETF가 편하고, 분배금을 쓰지 않는다면 TR형도 같이 비교할 수 있어요.</p>
              <div className={styles.briefStats}>
                <span><b>0.07%</b> 총보수</span>
                <span><b>분기</b> 분배</span>
                <span><b>5.8조</b> 순자산</span>
              </div>
            </div>
            <div className={styles.briefCards}>
              {optionBEtfs.map(etf => (
                <BriefEtfCard etf={etf} key={etf.slug} />
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.option} ${styles.community}`} id="community">
          <OptionLabel label="C안" title="비교표 + 질문 연결" tone="ETF 정보창과 커뮤니티를 가장 강하게 연결하는 화면" />
          <div className={styles.communityGrid}>
            <div className={styles.comparePanel}>
              <div className={styles.compareHead}>
                <div>
                  <span>ETF 비교</span>
                  <h2>S&P500 후보를 한 번에 비교해요</h2>
                </div>
                <button type="button">비교 담기</button>
              </div>
              <div className={styles.compareTable}>
                {optionCEtfs.map(etf => (
                  <Link href={etfPath(etf.slug)} key={etf.slug}>
                    <strong>{etf.shortName}</strong>
                    <span>{etf.fee}</span>
                    <span>{etf.distribution}</span>
                    <span>{etf.hedge}</span>
                    <b>시세 미연동</b>
                  </Link>
                ))}
              </div>
            </div>

            <aside className={styles.questionPanel}>
              <span>관련 질문</span>
              <h2>사기 전에 많이 묻는 것</h2>
              {sp500.relatedQuestions.map(question => (
                <article key={question.title}>
                  <em>{question.tag}</em>
                  <strong>{question.title}</strong>
                  <p>{question.meta}</p>
                </article>
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

function FeaturedEtfCard({ etf, variant }: { etf: EtfInfo; variant: 'finder' }) {
  return (
    <Link className={`${styles.featuredCard} ${styles[variant]}`} href={etfPath(etf.slug)}>
      <div className={styles.featuredTop}>
        <span>{etf.theme}</span>
        <em>{etf.fit}</em>
      </div>
      <h3>{etf.name}</h3>
      <p>{etf.oneLine}</p>
      <div className={styles.featuredPrice}>
        <strong>{etf.price || '시세 미연동'}</strong>
        {etf.change && <b className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</b>}
      </div>
      <div className={styles.featuredMeta}>
        <span>보수 {etf.fee}</span>
        <span>{etf.distribution}</span>
        <span>질문 {etf.relatedQuestions.length}</span>
      </div>
    </Link>
  );
}

function EtfRowCard({ etf, index }: { etf: EtfInfo; index: number }) {
  return (
    <Link className={styles.rowCard} href={etfPath(etf.slug)}>
      <span>{index}</span>
      <div>
        <strong>{etf.name}</strong>
        <p>{etf.code} · {etf.summary}</p>
      </div>
      <div>
        <b>{etf.price || '시세 미연동'}</b>
        {etf.change && <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>}
      </div>
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
      <div className={styles.briefFoot}>
        <b>{etf.price || '시세 미연동'}</b>
        {etf.change && <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>}
      </div>
    </Link>
  );
}
