import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';
import { ETF_HOME_PATH, etfPath, etfUrl, etfs, getEtfBySlug, getRelatedEtfs } from '@/lib/etfs';
import { SITE_NAME, truncateDescription } from '@/lib/seo';
import { sampleQuestions } from '@/lib/sampleData';
import { listSparrings } from '@/lib/sparring';
import { fetchGhostArticles } from '@/lib/feed';
import { fetchRecentReportsWithFallback } from '@/lib/reports';
import {
  findRelatedQuestionsForEtf,
  findRelatedSparringsForEtf,
  findRelatedArticlesForEtf,
  findRelatedReportsForEtf,
} from '@/lib/relatedContent';
import { RelatedContent } from '@/components/RelatedContent';
import { Button, Chip, Badge } from '@/components/ui';
import { WatchButton } from '../WatchButton';
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

export default async function EtfDetailPage({ params }: Props) {
  const marketEtfs = await getEtfsWithMarketData();
  const staticEtf = getEtfBySlug(params.slug);
  const etf = marketEtfs.find(item => item.slug === decodeURIComponent(params.slug)) || (staticEtf
    ? { ...staticEtf, dataNotice: '공식 API 키 등록 전 예시 데이터' }
    : null);
  if (!etf) notFound();

  const etfNav = 'nav' in etf ? etf.nav : undefined;
  const etfBaseDate = 'baseDate' in etf ? etf.baseDate : undefined;
  const relatedEtfs = getRelatedEtfs(etf.slug, 3);

  // 분절 해소: ETF 키워드로 4페이지 + 리포트 연결
  const baseEtf = staticEtf || etf;
  const [sparringRes, articles, reports] = await Promise.all([
    listSparrings(),
    fetchGhostArticles(),
    fetchRecentReportsWithFallback(),
  ]);
  const relatedQs = findRelatedQuestionsForEtf(baseEtf as any, sampleQuestions as any, 3);
  const relatedSparrings = findRelatedSparringsForEtf(baseEtf as any, sparringRes.sparrings, 2);
  const relatedArticles = findRelatedArticlesForEtf(baseEtf as any, articles, 3);
  const relatedReports = findRelatedReportsForEtf(baseEtf as any, reports, 3);
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
            <span className={styles.heroEyebrow}>
              <Badge tone="neutral">{etf.code}</Badge>
              <span className={styles.heroIssuer}>{etf.issuer} · {etf.category}</span>
            </span>
            <h1>{etf.name}</h1>
            <p>{etf.summary}</p>
            <div className={styles.tags}>
              {etf.tags.map(tag => (
                <Chip key={tag} subtle size="sm">#{tag}</Chip>
              ))}
            </div>
          </div>
          <div className={styles.actions}>
            <WatchButton code={etf.code} shortName={etf.shortName} />
            <Button href={`/etf/compare?a=${etf.code}`} variant="outline" size="md">비교하기</Button>
            <Button href="/?ask=1" variant="primary" size="md">질문하기</Button>
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
              <p>{etf.issuer} · {etf.category}<br />{etf.dataNotice}</p>
            </div>
              <div className={styles.chartMock} aria-hidden="true"><i /></div>
            </section>

            <section className={styles.factGrid} aria-label="ETF 핵심 정보">
              <div><span>순자산</span><strong>{etf.aum}</strong><p>{etf.theme}</p></div>
              {etfNav && <div><span>NAV</span><strong>{etfNav}</strong><p>공식 API 기준</p></div>}
              <div><span>총보수</span><strong>{etf.fee}</strong><p>장기 보유 비용</p></div>
              <div><span>분배금</span><strong>{etf.distribution}</strong><p>현금흐름 방식</p></div>
              <div><span>환헤지</span><strong>{etf.hedge}</strong><p>환율 노출</p></div>
              <div><span>거래량</span><strong>{etf.volume}</strong><p>유동성 참고</p></div>
              <div><span>{etfBaseDate ? '기준일' : '상장일'}</span><strong>{etfBaseDate || etf.listedAt}</strong><p>{etfBaseDate ? '시세 기준' : '운용 기간'}</p></div>
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
            <RelatedContent
              heading={`${etf.shortName} 관련 콘텐츠`}
              questions={relatedQs.map(q => ({ slug: q.slug, title: q.title, ans: q.ans }))}
              sparrings={relatedSparrings}
              articles={relatedArticles}
              reports={relatedReports}
            />

            {relatedQs.length === 0 && relatedSparrings.length === 0 && relatedArticles.length === 0 && relatedReports.length === 0 && (
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
            )}
          </aside>
        </div>
      </main>
    </AppShell>
  );
}
