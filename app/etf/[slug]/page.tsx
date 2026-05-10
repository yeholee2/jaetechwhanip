import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { ETF_HOME_PATH, etfPath, etfUrl, etfs, getEtfBySlug, getRelatedEtfs } from '@/lib/etfs';
import { SITE_NAME, truncateDescription } from '@/lib/seo';
import styles from './EtfDetailPage.module.css';

type Props = { params: { slug: string } };

export const revalidate = 300;

export function generateStaticParams() {
  return etfs.map(etf => ({ slug: etf.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const etf = getEtfBySlug(params.slug);
  if (!etf) return { title: 'ETF를 찾을 수 없어요', robots: { index: false, follow: true } };

  const description = truncateDescription(`${etf.name}: ${etf.summary} 현재가, 순자산, 총보수, 분배금, 환헤지, 구성종목과 관련 질문을 함께 봅니다.`, 150);

  return {
    title: `${etf.name} ETF`,
    description,
    keywords: [etf.name, etf.code, etf.theme, ...etf.tags, 'ETF 질문', SITE_NAME],
    alternates: {
      canonical: etfPath(etf.slug),
    },
    openGraph: {
      title: `${etf.name} ETF | ${SITE_NAME}`,
      description,
      url: etfUrl(etf.slug),
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${etf.name} ETF | ${SITE_NAME}`,
      description,
    },
  };
}

export default function EtfDetailPage({ params }: Props) {
  const etf = getEtfBySlug(params.slug);
  if (!etf) notFound();

  const relatedEtfs = getRelatedEtfs(etf.slug, 3);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${etf.name} ETF`,
    url: etfUrl(etf.slug),
    description: etf.summary,
    isPartOf: {
      '@type': 'CollectionPage',
      name: '재테크한입 ETF',
      url: `${etfUrl(etf.slug).replace(`/${encodeURIComponent(etf.slug)}`, '')}`,
    },
  };

  return (
    <AppShell active="etf" wide hideSlogan>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <Link className={styles.backLink} href={ETF_HOME_PATH}>
          <FaIcon name="chevron-left" size={12} />
          ETF
        </Link>

        <section className={styles.hero}>
          <div>
            <span className={styles.code}>{etf.code}</span>
            <h1>{etf.name}</h1>
            <p>{etf.summary}</p>
            <div className={styles.tags}>
              {etf.tags.map(tag => <span key={tag}>{tag}</span>)}
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button">관심</button>
            <Link href="/?ask=1">질문하기</Link>
          </div>
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={styles.priceCard}>
              <div className={styles.priceHead}>
                <div>
                  <span>현재가</span>
                  <strong>{etf.price}</strong>
                  <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>
                </div>
                <p>{etf.issuer} · {etf.category}</p>
              </div>
              <div className={styles.chartMock} aria-hidden="true"><i /></div>
            </section>

            <section className={styles.factGrid} aria-label="ETF 핵심 정보">
              <div><span>순자산</span><strong>{etf.aum}</strong><p>{etf.theme}</p></div>
              <div><span>총보수</span><strong>{etf.fee}</strong><p>장기 보유 비용</p></div>
              <div><span>분배금</span><strong>{etf.distribution}</strong><p>현금흐름 방식</p></div>
              <div><span>환헤지</span><strong>{etf.hedge}</strong><p>환율 노출</p></div>
              <div><span>거래량</span><strong>{etf.volume}</strong><p>유동성 참고</p></div>
              <div><span>상장일</span><strong>{etf.listedAt}</strong><p>운용 기간</p></div>
            </section>

            <section className={styles.summaryBox}>
              <span>한입 요약</span>
              <p>{etf.oneLine}</p>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>주요 구성종목</h2>
                <span>예시 비중</span>
              </div>
              <div className={styles.holdingList}>
                {etf.holdings.map(holding => (
                  <div key={holding.name}>
                    <div>
                      <strong>{holding.name}</strong>
                      <p>{holding.note}</p>
                    </div>
                    <b>{holding.weight}</b>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>비슷한 ETF</h2>
                <span>{relatedEtfs.length}개</span>
              </div>
              <div className={styles.relatedList}>
                {relatedEtfs.map(item => (
                  <Link href={etfPath(item.slug)} key={item.slug}>
                    <div>
                      <strong>{item.name}</strong>
                      <p>{item.theme} · 총보수 {item.fee} · {item.fit}</p>
                    </div>
                    <span>{item.change}</span>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={styles.sideCard}>
              <h2>관련 질문</h2>
              {etf.relatedQuestions.map(question => (
                <article className={styles.questionCard} key={question.title}>
                  <span>{question.tag}</span>
                  <strong>{question.title}</strong>
                  <p>{question.meta}</p>
                </article>
              ))}
            </section>

            <section className={styles.sparringCard}>
              <span>진행중 스파링</span>
              <strong>{etf.sparringTitle}</strong>
              <p>1,284명 투표 중 · 2일 남음</p>
              <Link href="/sparring">참여하기</Link>
            </section>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
