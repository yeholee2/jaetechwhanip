import type { Metadata } from 'next';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
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

export default function EtfPage() {
  const featured = etfs[0];
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
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>ETF</span>
            <h1>ETF 이름이나 구성종목으로 찾아보세요</h1>
            <p>가격, 순자산, 총보수, 분배금, 환헤지까지 보고 관련 질문과 스파링으로 판단을 이어가요.</p>
            <div className={styles.searchBox} role="search" aria-label="ETF 검색">
              <FaIcon name="magnifying-glass" size={16} />
              <span>ETF명, 코드, 구성종목 검색</span>
            </div>
            <div className={styles.chips} aria-label="ETF 빠른 필터">
              {etfFilters.slice(1).map((filter, index) => (
                <span className={index === 0 ? styles.chipOn : ''} key={filter}>{filter}</span>
              ))}
            </div>
          </div>
          <Link className={styles.featureCard} href={etfPath(featured.slug)}>
            <span>오늘 많이 본 ETF</span>
            <strong>{featured.name}</strong>
            <p>{featured.oneLine}</p>
            <div>
              <b>{featured.price}</b>
              <em className={styles.up}>{featured.change}</em>
            </div>
          </Link>
        </section>

        <section className={styles.statGrid} aria-label="ETF 현황">
          <div><span>많이 본 ETF</span><strong>{etfs.length * 7 + 3}개</strong></div>
          <div><span>진행중 ETF 스파링</span><strong>4개</strong></div>
          <div><span>ETF 질문</span><strong>218개</strong></div>
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>많이 본 ETF</h2>
                  <p>국내 계좌에서 자주 비교하는 ETF를 먼저 모았어요.</p>
                </div>
                <span>2026.05.10 기준</span>
              </div>
              <div className={styles.etfList}>
                {etfs.slice(0, 4).map(etf => (
                  <Link className={styles.etfRow} href={etfPath(etf.slug)} key={etf.slug}>
                    <div>
                      <strong>{etf.name}</strong>
                      <p>{etf.code} · {etf.category} · 순자산 {etf.aum}</p>
                    </div>
                    <div>
                      <b>{etf.price}</b>
                      <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>나에게 맞는 ETF 찾기</h2>
                  <p>투자지역, 분배방식, 계좌 기준으로 먼저 좁혀요.</p>
                </div>
              </div>
              <div className={styles.filterGrid}>
                <div><span>투자지역</span><b>미국</b></div>
                <div><span>기초지수</span><b>S&P500</b></div>
                <div><span>분배방식</span><b>분기·월 지급</b></div>
                <div><span>계좌</span><b>ISA 가능</b></div>
              </div>
              <div className={styles.resultList}>
                {etfs.slice(0, 3).map(etf => (
                  <Link href={etfPath(etf.slug)} key={etf.slug}>
                    <div>
                      <strong>{etf.name}</strong>
                      <p>{etf.theme} · 총보수 {etf.fee} · {etf.distribution}</p>
                    </div>
                    <span>{etf.fit}</span>
                  </Link>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>구성종목으로 ETF 찾기</h2>
                  <p>개별주를 직접 사기 전, 그 종목이 많이 들어간 ETF를 먼저 볼 수 있어요.</p>
                </div>
              </div>
              <div className={styles.holdingList}>
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
                  <p>총보수, 분배방식, 환헤지, 계좌 기준을 한 번에 봐요.</p>
                </div>
              </div>
              <div className={styles.compareTable}>
                <div className={styles.compareHeader}>
                  <span>ETF</span><span>총보수</span><span>분배</span><span>환헤지</span><span>한입 기준</span>
                </div>
                {etfCompareRows.map(row => (
                  <Link className={styles.compareRow} href={etfPath(row.slug)} key={row.name}>
                    <span>{row.name}</span>
                    <span>{row.fee}</span>
                    <span>{row.distribution}</span>
                    <span>{row.hedge}</span>
                    <span>{row.fit}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard}>
              <h2>ETF 한입 기준</h2>
              <ul>
                <li>수익률보다 먼저 기간과 계좌를 정해요.</li>
                <li>보수, 분배금, 환헤지는 같이 봐요.</li>
                <li>테마형 ETF는 전체 비중을 작게 잡아요.</li>
              </ul>
            </section>

            <section className={styles.sideCard}>
              <h2>ETF 질문</h2>
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
              <p>1,284명 투표 중 · 2일 남음</p>
              <Link href="/sparring">참여하기</Link>
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
