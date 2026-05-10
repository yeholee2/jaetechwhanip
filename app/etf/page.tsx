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

const DASHBOARD_TABS = ['관심 ETF', '최근 본 ETF', '분배금 체크'];
const QUICK_SEARCHES = ['S&P500', '나스닥100', '월배당', '엔비디아', 'ISA'];
const SORT_LABEL = '투자자가 많이 보는';

type EtfPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function EtfPage({ searchParams }: EtfPageProps) {
  const marketEtfs = await getEtfsWithMarketData();
  const query = getParam(searchParams, 'q');
  const activeTheme = getParam(searchParams, 'theme') || '전체';
  const filteredEtfs = marketEtfs.filter(etf => matchesEtf(etf, query, activeTheme));
  const featured = filteredEtfs[0] || marketEtfs[0];
  const rankedEtfs = marketEtfs.slice(0, 5);
  const usingPublicApi = marketEtfs.some(etf => etf.dataSource === 'public-api');
  const baseDate = marketEtfs.find(etf => etf.baseDate)?.baseDate || 'API 키 등록 전';
  const sourceLabel = usingPublicApi ? '공식 데이터' : '예시 데이터';
  const totalThemes = new Set(marketEtfs.map(etf => etf.theme)).size;
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
          <h1>ETF를 찾고, 비교하고, 질문까지 이어봐요</h1>
          <p>상품명·코드·구성종목으로 찾고 가격, 등락률, 순자산, 보수, 분배금 기준을 한 화면에서 비교해요.</p>
        </header>

        <section className={styles.topGrid} aria-label="ETF 검색과 요약">
          <div className={styles.searchPanel}>
            <span className={styles.panelLabel}>ETF 통합검색</span>
            <h2>상품명, 코드, 구성종목으로 바로 찾아요</h2>
            <form className={styles.searchForm} action={ETF_HOME_PATH}>
              <FaIcon name="magnifying-glass" size={15} />
              <input
                aria-label="ETF 검색어"
                defaultValue={query}
                name="q"
                placeholder="예: S&P500, 360750, 엔비디아"
                type="search"
              />
              {activeTheme !== '전체' ? <input name="theme" type="hidden" value={activeTheme} /> : null}
              <button type="submit">검색</button>
            </form>
            <div className={styles.quickSearches} aria-label="추천 검색어">
              {QUICK_SEARCHES.map(term => (
                <Link href={`${ETF_HOME_PATH}?q=${encodeURIComponent(term)}`} key={term}>{term}</Link>
              ))}
            </div>
          </div>

          <div className={styles.watchPanel}>
            <div className={styles.watchTabs}>
              {DASHBOARD_TABS.map((tab, index) => (
                <span className={index === 0 ? styles.activeWatchTab : ''} key={tab}>{tab}</span>
              ))}
            </div>
            <Link className={styles.watchItem} href={etfPath(featured.slug)}>
              <div>
                <strong>{featured.shortName}</strong>
                <span>{featured.code} · {featured.theme}</span>
              </div>
              <div>
                <b>{featured.price}</b>
                <em className={featured.changeTone === 'down' ? styles.down : styles.up}>{featured.change}</em>
              </div>
            </Link>
            <p>관심 ETF를 담고 시세, 분배금, 관련 질문을 한 번에 확인하는 공간으로 확장할 수 있어요.</p>
          </div>
        </section>

        <section className={styles.metricGrid} aria-label="ETF 데이터 요약">
          <article>
            <span>{sourceLabel}</span>
            <strong>{baseDate}</strong>
          </article>
          <article>
            <span>등록 ETF</span>
            <strong>{marketEtfs.length}개</strong>
          </article>
          <article>
            <span>테마</span>
            <strong>{totalThemes}개</strong>
          </article>
          <article>
            <span>검색 결과</span>
            <strong>{filteredEtfs.length}개</strong>
          </article>
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.rankSection}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.selectPill}>{SORT_LABEL}</span>
                  <h2>상품은?</h2>
                  <p>FunETF처럼 먼저 랭킹과 움직임을 보여주고, 아래에서 조건으로 좁혀요.</p>
                </div>
                <span>{marketEtfs[0]?.dataNotice}</span>
              </div>

              <div className={styles.rankBoard}>
                <Link className={styles.chartCard} href={etfPath(featured.slug)}>
                  <div className={styles.chartTop}>
                    <span>{featured.theme}</span>
                    <em>수익률 흐름</em>
                  </div>
                  <strong>{featured.shortName}</strong>
                  <div className={styles.chartNumbers}>
                    <b>{featured.price}</b>
                    <em className={featured.changeTone === 'down' ? styles.down : styles.up}>{featured.change}</em>
                  </div>
                  <div className={styles.sparkline} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <small>데이터 업데이트: {baseDate}</small>
                </Link>

                <div className={styles.rankingList}>
                  {rankedEtfs.map((etf, index) => (
                    <Link href={etfPath(etf.slug)} key={etf.slug}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{etf.name}</strong>
                        <small>{etf.code} · {etf.theme}</small>
                        <i style={{ width: `${Math.max(36, 100 - index * 12)}%` }} />
                      </div>
                      <b className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</b>
                    </Link>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.filterSection}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>ETF 상품 검색 필터</h2>
                  <p>테마, 보수, 분배금, 환헤지, 순자산을 표로 비교해요.</p>
                </div>
              </div>

              <div className={styles.filterBar} aria-label="ETF 빠른 필터">
                {etfFilters.map(filter => (
                  <Link
                    className={activeTheme === filter ? styles.ctagOn : ''}
                    href={filterHref(filter, query)}
                    key={filter}
                  >
                    {filter}
                  </Link>
                ))}
              </div>

              {filteredEtfs.length > 0 ? (
                <div className={styles.tableWrap}>
                  <table className={styles.etfTable}>
                    <thead>
                      <tr>
                        <th>상품명</th>
                        <th>분류</th>
                        <th>총보수</th>
                        <th>분배</th>
                        <th>현재가</th>
                        <th>등락률</th>
                        <th>순자산</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEtfs.map(etf => (
                        <tr key={etf.slug}>
                          <td data-label="상품명">
                            <Link href={etfPath(etf.slug)}>
                              <span>{etf.code}</span>
                              <strong>{etf.name}</strong>
                              <small>{etf.tags.slice(0, 3).join(' · ')}</small>
                            </Link>
                          </td>
                          <td data-label="분류">{etf.theme}</td>
                          <td data-label="총보수">{etf.fee}</td>
                          <td data-label="분배">{etf.distribution}</td>
                          <td data-label="현재가">{etf.price}</td>
                          <td data-label="등락률">
                            <b className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</b>
                          </td>
                          <td data-label="순자산">{etf.aum}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <strong>조건에 맞는 ETF가 아직 없어요</strong>
                  <p>검색어를 줄이거나 전체 필터로 다시 확인해 보세요.</p>
                  <Link href={ETF_HOME_PATH}>전체 보기</Link>
                </div>
              )}
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <h2>구성종목으로 ETF 찾기</h2>
                  <p>개별주를 직접 사기 전, 그 종목이 많이 들어간 ETF를 먼저 봐요.</p>
                </div>
              </div>
              <div className={styles.holdingGrid}>
                {holdingSearchRows.map(row => (
                  <Link href={etfPath(row.slug)} key={`${row.holding}-${row.etf}`}>
                    <span>{row.holding}</span>
                    <strong>{row.etf}</strong>
                    <p>{row.reason}</p>
                    <b>{row.weight}</b>
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
                <li><FaIcon name="circle-check" size={12} /> 계좌와 투자기간을 먼저 정해요.</li>
                <li><FaIcon name="circle-check" size={12} /> 보수, 분배금, 환헤지는 같이 봐요.</li>
                <li><FaIcon name="circle-check" size={12} /> 테마형 ETF는 전체 비중을 작게 잡아요.</li>
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

function getParam(searchParams: EtfPageProps['searchParams'], key: string) {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function filterHref(filter: string, query: string) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (filter !== '전체') params.set('theme', filter);
  const suffix = params.toString();
  return suffix ? `${ETF_HOME_PATH}?${suffix}` : ETF_HOME_PATH;
}

function matchesEtf(etf: Awaited<ReturnType<typeof getEtfsWithMarketData>>[number], query: string, theme: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const themeMatched = theme === '전체' || etf.theme.includes(theme) || etf.tags.includes(theme);
  if (!themeMatched) return false;
  if (!normalizedQuery) return true;

  const searchTarget = [
    etf.code,
    etf.name,
    etf.shortName,
    etf.issuer,
    etf.category,
    etf.theme,
    etf.summary,
    etf.tags.join(' '),
    etf.holdings.map(holding => holding.name).join(' '),
  ].join(' ').toLowerCase();

  return searchTarget.includes(normalizedQuery);
}
