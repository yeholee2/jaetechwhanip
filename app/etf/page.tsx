import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';
import {
  ETF_HOME_PATH,
  ETF_HOME_URL,
  etfCompareRows,
  etfFilters,
  etfPath,
  etfs,
  holdingSearchRows,
} from '@/lib/etfs';
import { SITE_NAME } from '@/lib/seo';
import styles from './EtfPage.module.css';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'ETF',
  description: 'ETF를 이름, 코드, 구성종목, 보수, 분배금, 환헤지 기준으로 쉽게 비교하고 관련 질문과 스파링까지 함께 보는 재테크한입 ETF 공간입니다.',
  keywords: ['ETF', 'S&P500 ETF', '나스닥100 ETF', '월배당 ETF', 'ISA ETF', '연금저축 ETF', SITE_NAME],
  alternates: {
    canonical: ETF_HOME_PATH,
  },
  openGraph: {
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 정보값과 커뮤니티 질문을 한 화면에서 비교해요.',
    url: ETF_HOME_URL,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `ETF | ${SITE_NAME}`,
    description: 'ETF 정보값과 커뮤니티 질문을 한 화면에서 비교해요.',
  },
};

const TOOL_TABS = ['인기 ETF', '상품검색', '구성종목', '비교'];

export default async function EtfPage() {
  const marketEtfs = await getEtfsWithMarketData();
  const featured = marketEtfs[0];
  const usingPublicApi = marketEtfs.some(etf => etf.dataSource === 'public-api');
  const baseDate = marketEtfs.find(etf => etf.baseDate)?.baseDate || 'API 키 등록 전';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '재테크한입 ETF',
    url: ETF_HOME_URL,
    inLanguage: 'ko-KR',
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: ETF_HOME_URL.replace('/etf', ''),
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: etfs.map((etf, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${ETF_HOME_URL}/${encodeURIComponent(etf.slug)}`,
        name: etf.name,
      })),
    },
  };

  return (
    <AppShell active="etf" wide hideSlogan>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>ETF</span>
          <h1>ETF를 쉽게 찾고 비교해요</h1>
          <p>이름, 코드, 구성종목으로 ETF를 찾고 보수·분배금·환헤지까지 한 화면에서 확인해요.</p>
        </header>

        <nav className={styles.feedTabs} aria-label="ETF 보기 방식">
          {TOOL_TABS.map((tab, index) => (
            <span className={index === 0 ? styles.on : ''} key={tab}>{tab}</span>
          ))}
        </nav>

        <div className={styles.catRow} aria-label="ETF 빠른 필터">
          {etfFilters.map((filter, index) => (
            <span className={index === 0 ? styles.ctagOn : ''} key={filter}>{filter}</span>
          ))}
        </div>

        <section className={styles.searchSummary}>
          <div className={styles.searchBox} role="search" aria-label="ETF 검색">
            <FaIcon name="magnifying-glass" size={15} />
            <span>ETF명, 종목코드, 구성종목 검색</span>
          </div>
          <div className={styles.dataText}>
            <strong>{usingPublicApi ? '공식 데이터' : '예시 데이터'}</strong>
            <span>{baseDate}</span>
          </div>
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.marketSection}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>많이 보는 ETF</h2>
                  <p>가격, 등락률, 거래량, 순자산을 홈 피드처럼 가볍게 훑어요.</p>
                </div>
                <span>{marketEtfs[0]?.dataNotice}</span>
              </div>

              <div className={styles.marketList}>
                {marketEtfs.map(etf => (
                  <Link className={styles.etfCard} href={etfPath(etf.slug)} key={etf.slug}>
                    <div className={styles.etfMain}>
                      <div className={styles.etfBadge}>{etf.theme}</div>
                      <h3>{etf.name}</h3>
                      <p>{etf.code} · {etf.category} · 총보수 {etf.fee}</p>
                      <div className={styles.etfTags}>
                        <span>{etf.distribution}</span>
                        <span>{etf.hedge}</span>
                        <span>{etf.fit}</span>
                      </div>
                    </div>
                    <div className={styles.etfNumbers}>
                      <strong>{etf.price}</strong>
                      <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>
                      <span>거래량 {etf.volume}</span>
                      <span>순자산 {etf.aum}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>구성종목으로 ETF 찾기</h2>
                  <p>개별주를 직접 사기 전, 그 종목이 많이 들어간 ETF를 먼저 봐요.</p>
                </div>
              </div>
              <div className={styles.compactList}>
                {holdingSearchRows.map(row => (
                  <Link href={etfPath(row.slug)} key={`${row.holding}-${row.etf}`}>
                    <div>
                      <strong>{row.holding}</strong>
                      <p>{row.etf}</p>
                    </div>
                    <div>
                      <b>{row.weight}</b>
                      <span>{row.reason}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>S&P500 ETF 비교</h2>
                  <p>초보자가 자주 헷갈리는 기준만 먼저 뽑았어요.</p>
                </div>
              </div>
              <div className={styles.compareList}>
                {etfCompareRows.map(row => (
                  <Link href={etfPath(row.slug)} key={row.name}>
                    <strong>{row.name}</strong>
                    <span>{row.fee}</span>
                    <span>{row.distribution}</span>
                    <span>{row.hedge}</span>
                    <b>{row.fit}</b>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <Link className={styles.featureCard} href={etfPath(featured.slug)}>
              <span>오늘 많이 본 ETF</span>
              <strong>{featured.name}</strong>
              <p>{featured.oneLine}</p>
              <div>
                <b>{featured.price}</b>
                <em className={featured.changeTone === 'down' ? styles.down : styles.up}>{featured.change}</em>
              </div>
            </Link>

            <section className={styles.sideCard}>
              <h2>ETF 한입 기준</h2>
              <ul>
                <li>계좌와 투자기간을 먼저 정해요.</li>
                <li>보수, 분배금, 환헤지는 같이 봐요.</li>
                <li>테마형 ETF는 전체 비중을 작게 잡아요.</li>
              </ul>
            </section>

            <section className={styles.sideCard}>
              <h2>관련 질문</h2>
              {featured.relatedQuestions.map(question => (
                <article className={styles.questionCard} key={question.title}>
                  <span>{question.tag}</span>
                  <strong>{question.title}</strong>
                  <p>{question.meta}</p>
                </article>
              ))}
            </section>

            <section className={styles.sparringCard}>
              <span>진행중 스파링</span>
              <strong>{featured.sparringTitle}</strong>
              <p>정보만 보고 끝내지 않고 찬반으로 판단을 점검해요.</p>
              <Link href="/sparring">참여하기</Link>
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
