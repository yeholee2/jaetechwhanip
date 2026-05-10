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
        <section className={styles.searchPanel}>
          <div className={styles.searchTop}>
            <div>
              <span className={styles.eyebrow}>ETF</span>
              <h1>ETF를 이름, 코드, 구성종목으로 찾아보세요</h1>
              <p>FunETF처럼 먼저 상품을 찾고, 재테크한입에서는 질문과 스파링으로 판단까지 이어가요.</p>
            </div>
            <div className={styles.dataBadge}>
              <span>{usingPublicApi ? '공식 데이터' : '예시 데이터'}</span>
              <strong>{baseDate}</strong>
            </div>
          </div>

          <div className={styles.searchBox} role="search" aria-label="ETF 검색">
            <FaIcon name="magnifying-glass" size={17} />
            <span>ETF명, 종목코드, 구성종목을 입력해보세요</span>
            <button type="button">검색</button>
          </div>

          <div className={styles.quickGrid} aria-label="ETF 빠른 검색">
            <Link href={etfPath(featured.slug)}>
              <span>많이 본 ETF</span>
              <strong>{featured.name}</strong>
              <p>{featured.price} · {featured.change}</p>
            </Link>
            <div>
              <span>구성종목 검색</span>
              <strong>엔비디아</strong>
              <p>많이 담은 ETF 찾기</p>
            </div>
            <div>
              <span>조건 검색</span>
              <strong>S&P500 · ISA</strong>
              <p>보수/분배/환헤지 비교</p>
            </div>
          </div>
        </section>

        <div className={styles.toolTabs} aria-label="ETF 도구">
          <span className={styles.toolTabOn}>통합검색</span>
          <span>상품검색</span>
          <span>구성종목검색</span>
          <span>비교</span>
          <span>관심 ETF</span>
        </div>

        <section className={styles.filterPanel}>
          <div className={styles.filterHead}>
            <h2>ETF 상품 검색</h2>
            <p>{usingPublicApi ? '금융위원회 증권상품시세정보 기준으로 갱신됩니다.' : 'Vercel에 DATA_GO_KR_SERVICE_KEY를 넣으면 공식 시세로 자동 갱신됩니다.'}</p>
          </div>
          <div className={styles.chips} aria-label="ETF 필터">
            {etfFilters.map((filter, index) => (
              <span className={index === 0 ? styles.chipOn : ''} key={filter}>{filter}</span>
            ))}
          </div>
        </section>

        <section className={styles.marketSection}>
          <div className={styles.tableHead}>
            <div>
              <h2>많이 보는 ETF</h2>
              <p>가격, 등락률, 거래량, 순자산, 총보수를 표로 먼저 봐요.</p>
            </div>
            <span>{marketEtfs[0]?.dataNotice}</span>
          </div>

          <div className={styles.marketTable}>
            <div className={styles.marketHeader}>
              <span>종목명</span>
              <span>현재가</span>
              <span>등락률</span>
              <span>거래량</span>
              <span>순자산</span>
              <span>총보수</span>
              <span>분배</span>
            </div>
            {marketEtfs.map(etf => (
              <Link className={styles.marketRow} href={etfPath(etf.slug)} key={etf.slug}>
                <span>
                  <strong>{etf.name}</strong>
                  <em>{etf.code} · {etf.theme}</em>
                </span>
                <span>{etf.price}</span>
                <span className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</span>
                <span>{etf.volume}</span>
                <span>{etf.aum}</span>
                <span>{etf.fee}</span>
                <span>{etf.distribution}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.bottomGrid}>
          <div className={styles.box}>
            <div className={styles.boxHead}>
              <h2>구성종목으로 ETF 찾기</h2>
              <p>개별주를 직접 사기 전, 그 종목이 들어간 ETF를 먼저 봐요.</p>
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
          </div>

          <div className={styles.box}>
            <div className={styles.boxHead}>
              <h2>S&P500 ETF 비교</h2>
              <p>초보자가 자주 헷갈리는 기준만 먼저 뽑았어요.</p>
            </div>
            <div className={styles.compareTable}>
              <div className={styles.compareHeader}>
                <span>ETF</span><span>총보수</span><span>분배</span><span>환헤지</span><span>기준</span>
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
          </div>
        </section>

        <section className={styles.communityBand}>
          <div>
            <span>ETF 질문</span>
            <strong>{featured.relatedQuestions[0].title}</strong>
            <p>{featured.relatedQuestions[0].meta}</p>
          </div>
          <div>
            <span>진행중 스파링</span>
            <strong>{featured.sparringTitle}</strong>
            <p>ETF 정보만 보고 끝내지 않고, 찬반으로 판단을 점검해요.</p>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
