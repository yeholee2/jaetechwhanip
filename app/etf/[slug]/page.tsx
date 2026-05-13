import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { getEtfsWithMarketData } from '@/lib/etf-live-data';
import { ETF_HOME_PATH, etfPath, etfUrl, etfs, getEtfBySlug } from '@/lib/etfs';
import { fetchEtfs, fetchEtfBySlug, fetchEtfByCode } from '@/lib/etfsDb';
import { findSimilarEtfs, buildIssuerSummary } from '@/lib/etfSimilar';
import { findTemplatesByEtfCode } from '@/lib/templateLookup';
import { IssuerCard } from '../IssuerCard';
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
import { Button, Chip, Badge, Stat, DataCell } from '@/components/ui';
import { buildEtfInsight, computeFeeStats, type EtfTag } from '@/lib/etfInsights';
import { buildSectorBreakdown } from '@/lib/etfBreakdown';
import { DonutChart, CompareBar, RiskMeter, MiniBarChart } from '@/components/ui';
import { buildEtfRisk } from '@/lib/etfRisk';
import { buildDistributionHistory } from '@/lib/etfDistribution';
import { countryInfo } from '@/lib/etfCountry';
import { WatchButton } from '../WatchButton';
import { AlertButton } from '../AlertButton';
import { Suspense } from 'react';
import { EtfReturns } from './EtfReturns';
import { ShareButton } from '../ShareButton';
import { RecordEtfView } from '../RecordEtfView';
import { EtfChart } from '../EtfChart';
import { EtfChat } from '../EtfChat';
import styles from './EtfDetailPage.module.css';

type Props = { params: { slug: string } };

export const revalidate = 300;

export function generateStaticParams() {
  return etfs.map(etf => ({ slug: etf.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug);
  const etf = getEtfBySlug(decodedSlug)
    || await fetchEtfBySlug(decodedSlug)
    || await fetchEtfByCode(decodedSlug);
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
      card: 'summary_large_image',
      title: `${etf.name} ETF | ${SITE_NAME}`,
      description,
    },
  };
}

export default async function EtfDetailPage({ params }: Props) {
  const decodedSlug = decodeURIComponent(params.slug);

  // 1) DB 시도 (1,066 ETF 풀 — 시드에 없는 VOO 등도 매칭)
  const dbEtfBySlug = await fetchEtfBySlug(decodedSlug);
  const dbEtfByCode = dbEtfBySlug || await fetchEtfByCode(decodedSlug);

  // 2) 시드 + 시장 라이브 (KRX 시드 8개)
  const marketEtfs = await getEtfsWithMarketData();
  const staticEtf = getEtfBySlug(decodedSlug);
  const liveEtf = marketEtfs.find(item => item.slug === decodedSlug);

  const etf = liveEtf
    || (staticEtf ? { ...staticEtf, dataNotice: '공식 API 키 등록 전 예시 데이터' } : null)
    || (dbEtfByCode ? { ...dbEtfByCode, dataNotice: '실데이터' } : null);

  if (!etf) notFound();

  const etfNav = 'nav' in etf ? etf.nav : undefined;
  const etfBaseDate = 'baseDate' in etf ? etf.baseDate : undefined;

  // 분절 해소: ETF 키워드로 4페이지 + 리포트 연결 + DB 풀(유사/운용사용)
  const baseEtf = staticEtf || etf;
  const [sparringRes, articles, reports, dbPool] = await Promise.all([
    listSparrings(),
    fetchGhostArticles(),
    fetchRecentReportsWithFallback(),
    fetchEtfs(2000),
  ]);
  // DB 기반 유사 ETF + 같은 운용사
  const similarResults = findSimilarEtfs(etf as any, dbPool, 6);
  const relatedEtfs = similarResults.map(r => r.etf).slice(0, 5);
  const issuerSummary = buildIssuerSummary(etf as any, dbPool);
  // 이 ETF가 들어간 대가 포트폴리오 (역방향)
  const templateMentions = findTemplatesByEtfCode(etf.code);
  const relatedQs = findRelatedQuestionsForEtf(baseEtf as any, sampleQuestions as any, 3);
  const relatedSparrings = findRelatedSparringsForEtf(baseEtf as any, sparringRes.sparrings, 2);
  const relatedArticles = findRelatedArticlesForEtf(baseEtf as any, articles, 3);
  const relatedReports = findRelatedReportsForEtf(baseEtf as any, reports, 3);
  // 가격 숫자 추출 (Schema.org Offer)
  const priceNumMatch = etf.price.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  const priceValue = priceNumMatch ? priceNumMatch[0] : undefined;

  // 자동 한줄평 + 태그
  const insight = buildEtfInsight(etf as any);
  const tagBadgeTone = (t?: EtfTag): 'success' | 'neutral' | 'fresh' =>
    t?.tone === 'good' ? 'success' : t?.tone === 'warn' ? 'fresh' : 'neutral';

  // 섹터 도넛 차트용 비중 추출
  const sectorBreakdown = buildSectorBreakdown(etf.holdings);
  const topSector = sectorBreakdown[0];

  // 동종 카테고리 보수 비교
  const feeStats = computeFeeStats(etf as any, etfs);

  // 위험 등급 + 투자 포인트
  const risk = buildEtfRisk(etf as any);

  // 분배금 히스토리 (분배 있는 ETF만)
  const distHistory = buildDistributionHistory(etf as any);

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: `${etf.name} ETF`,
      identifier: etf.code,
      url: etfUrl(etf.slug),
      description: etf.summary,
      category: 'Exchange-Traded Fund',
      provider: {
        '@type': 'Organization',
        name: etf.issuer,
      },
      audience: { '@type': 'Audience', audienceType: 'investors' },
      feesAndCommissionsSpecification: `총보수 ${etf.fee}`,
      ...(priceValue
        ? {
            offers: {
              '@type': 'Offer',
              price: priceValue,
              priceCurrency: 'KRW',
              availability: 'https://schema.org/InStock',
            },
          }
        : {}),
      additionalProperty: [
        { '@type': 'PropertyValue', name: '순자산', value: etf.aum },
        { '@type': 'PropertyValue', name: '분배', value: etf.distribution },
        { '@type': 'PropertyValue', name: '환헤지', value: etf.hedge },
        { '@type': 'PropertyValue', name: '거래량', value: etf.volume },
        { '@type': 'PropertyValue', name: '상장일', value: etf.listedAt },
      ],
      isPartOf: {
        '@type': 'CollectionPage',
        name: 'ETF한입 ETF 목록',
        url: `${etfUrl(etf.slug).replace(`/${encodeURIComponent(etf.slug)}`, '')}`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'ETF한입', item: etfUrl(etf.slug).replace(`/etf/${encodeURIComponent(etf.slug)}`, '') },
        { '@type': 'ListItem', position: 2, name: 'ETF', item: `${etfUrl(etf.slug).replace(`/${encodeURIComponent(etf.slug)}`, '')}` },
        { '@type': 'ListItem', position: 3, name: etf.name, item: etfUrl(etf.slug) },
      ],
    },
  ];

  return (
    <AppShell active="etf" wide hideSlogan>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className={styles.page}>
        <RecordEtfView slug={etf.slug} />
        <div className={styles.topBar}>
          <Link className={styles.backLink} href={ETF_HOME_PATH}>
            <FaIcon name="chevron-left" size={12} />
            ETF
          </Link>
          <ShareButton title={`${etf.name} | ${SITE_NAME}`} text={etf.oneLine || etf.summary} />
        </div>

        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <div className={styles.heroBadges}>
              <Badge tone="neutral">{etf.code}</Badge>
              {etf.country === 'US' ? (
                <Badge tone="fresh">🇺🇸 미국상장</Badge>
              ) : (
                <Badge tone="success">🇰🇷 국내상장</Badge>
              )}
              {etf.underlyingCountry && countryInfo(etf.underlyingCountry).isOverseas && (
                <Badge tone="neutral">
                  추종 {countryInfo(etf.underlyingCountry).flag} {countryInfo(etf.underlyingCountry).label}
                </Badge>
              )}
            </div>
            <h1>{etf.name}</h1>
            <p className={styles.heroMeta}>
              <strong>{etf.issuer}</strong>
              <span> · {etf.category}</span>
              {etf.trackingIndex && (
                <span className={styles.heroIndex}> · 추종: {etf.trackingIndex}</span>
              )}
            </p>
            {etf.summary && etf.summary !== `${etf.name} (${etf.code}) — ${etf.issuer} 운용 ${etf.category}.` && (
              <p className={styles.heroSummary}>{etf.summary}</p>
            )}
            {etf.tags && etf.tags.length > 0 && (
              <div className={styles.tags}>
                {etf.tags.slice(0, 4).map(tag => (
                  <Chip key={tag} subtle size="sm">#{tag}</Chip>
                ))}
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <WatchButton code={etf.code} shortName={etf.shortName} mode="icon" />
            <AlertButton etfCode={etf.code} etfName={etf.shortName} currentPrice={etf.price} />
            <Button href={`/etf/compare?a=${etf.code}`} variant="ghost" size="md">비교</Button>
            <Button href="/?ask=1" variant="primary" size="md">질문하기</Button>
          </div>
        </section>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {/* ──────────── 1단: 가격 + 한줄평 ──────────── */}
            <section className={styles.priceCard}>
              <Stat
                label="현재가"
                value={etf.price || '—'}
                delta={etf.change}
                tone={etf.changeTone}
                size="xl"
                foot={etf.dataNotice}
              />
            </section>

            <section className={styles.takeaway} aria-label="한 줄 요약">
              <p>{insight.oneLiner}</p>
            </section>

            {/* ──────────── 2단: 핵심 5 정보 ──────────── */}
            <section aria-label="핵심 정보">
              <DataCell.Grid columns={4}>
                <DataCell
                  label="총보수"
                  value={etf.fee || '—'}
                  sub={insight.tags.fee?.label}
                  tone={insight.tags.fee?.tone === 'good' ? 'good' : insight.tags.fee?.tone === 'warn' ? 'warn' : 'default'}
                />
                <DataCell
                  label="순자산"
                  value={etf.aum || '—'}
                  sub={insight.tags.aum?.label}
                  tone={insight.tags.aum?.tone === 'good' ? 'good' : insight.tags.aum?.tone === 'warn' ? 'warn' : 'default'}
                />
                <DataCell
                  label="분배"
                  value={etf.distribution || '—'}
                  sub={insight.tags.distribution?.label}
                />
                <DataCell
                  label="환헤지"
                  value={etf.hedge || '—'}
                  sub={insight.tags.hedge?.label}
                  tone={insight.tags.hedge?.tone === 'good' ? 'good' : insight.tags.hedge?.tone === 'warn' ? 'warn' : 'default'}
                />
              </DataCell.Grid>
            </section>

            {/* ──────────── 3단: 위험 등급 + 투자 포인트 ──────────── */}
            <section aria-label="위험 등급과 투자 포인트">
              <RiskMeter
                level={risk.level}
                label={risk.label}
                tone={risk.tone}
                reasons={risk.reasons}
                points={risk.points}
              />
            </section>

            {/* ──────────── 4단: 차트 ──────────── */}
            <EtfChart code={etf.code} price={etf.price} changeTone={etf.changeTone} />

            {/* 기간별 수익률 + 적립식 계산기 (Yahoo) */}
            <Suspense fallback={null}>
              <EtfReturns code={etf.code} etfName={etf.shortName} lastUpdated={etfBaseDate} />
            </Suspense>

            {/* ──────────── 5단: 보조 정보 (거래량/기준일/NAV/추종지수) ──────────── */}
            <section aria-label="보조 정보">
              <DataCell.Grid columns={3}>
                <DataCell label="거래량" value={etf.volume || '—'} sub="유동성 참고" />
                <DataCell
                  label={etfBaseDate ? '기준일' : '상장일'}
                  value={etfBaseDate || etf.listedAt || '—'}
                  sub={etfBaseDate ? '시세 기준' : '운용 기간'}
                />
                {etfNav ? (
                  <DataCell label="NAV" value={etfNav} sub="공식 API 기준" />
                ) : (
                  <DataCell label="운용사" value={etf.issuer} sub={etf.category} />
                )}
              </DataCell.Grid>
              {etf.trackingIndex && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <DataCell
                    label="추종 지수"
                    value={etf.trackingIndex}
                    sub="이 ETF가 따라가는 기초지수"
                  />
                </div>
              )}
            </section>

            {/* 한 줄 요약은 hero 아래 takeaway에 이미 표시됨 — 중복 제거 */}

            <EtfChat
              etf={{
                code: etf.code,
                name: etf.name,
                summary: etf.summary,
                theme: etf.theme,
                fee: etf.fee,
                distribution: etf.distribution,
                hedge: etf.hedge,
                aum: etf.aum,
              }}
            />

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>주요 구성종목</h2>
                <span>예시 비중</span>
              </div>
              <div className={styles.holdingList}>
                {(() => {
                  // 비중을 숫자로 파싱해서 정렬 + 바 너비 계산용 max 추출
                  const parsed = etf.holdings.map(h => ({
                    ...h,
                    pct: parseFloat(String(h.weight).replace(/[^\d.]/g, '')) || 0,
                  })).sort((a, b) => b.pct - a.pct);
                  const max = Math.max(...parsed.map(p => p.pct), 1);
                  return parsed.map(holding => (
                    <div key={holding.name} className={styles.holdingRow}>
                      <div className={styles.holdingInfo}>
                        <strong>{holding.name}</strong>
                        <p>{holding.note}</p>
                      </div>
                      <div className={styles.holdingBar} aria-hidden="true">
                        <span style={{ width: `${(holding.pct / max) * 100}%` }} />
                      </div>
                      <b className={styles.holdingPct}>{holding.weight}</b>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* 섹터 비중 도넛 (Toss / FunETF 스타일) */}
            {sectorBreakdown.length > 1 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>섹터 비중</h2>
                  <span>{topSector ? `${topSector.label} ${topSector.value.toFixed(1)}%` : ''}</span>
                </div>
                <DonutChart
                  segments={sectorBreakdown}
                  centerLabel="가장 큰 섹터"
                  centerValue={topSector ? topSector.label : ''}
                />
              </section>
            )}

            {/* 분배금 히스토리 mini bar (Toss 스타일) */}
            {distHistory.points.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>분배금 히스토리</h2>
                  <span>
                    {distHistory.period === 'monthly' ? '월별' :
                     distHistory.period === 'quarterly' ? '분기별' :
                     distHistory.period === 'semiannual' ? '반기별' : '연별'} ·
                    {' '}최근 {distHistory.points.length}회
                  </span>
                </div>
                <MiniBarChart
                  label="1주당 분배금"
                  caption="예시 데이터 (KRX API 연동 후 실제 값)"
                  data={distHistory.points.map(p => ({
                    label: p.label,
                    value: p.value,
                    tooltip: `${p.date} · ${p.value.toLocaleString()}원`,
                  }))}
                  unit="원"
                  summary={[
                    { label: '구간 합계', value: `${distHistory.perShareSum.toLocaleString()}원` },
                    { label: '연환산 수익률', value: `${distHistory.yieldPercent.toFixed(2)}%` },
                  ]}
                />
              </section>
            )}

            {/* 동종 카테고리 보수 비교 (Toss 스타일) */}
            {feeStats && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>동종 ETF 대비</h2>
                  <span>{etf.category} {feeStats.peerCount}개</span>
                </div>
                <CompareBar
                  label="총보수"
                  current={feeStats.current}
                  min={feeStats.min}
                  max={feeStats.max}
                  avg={feeStats.avg}
                  unit="%"
                  lowerIsBetter
                />
              </section>
            )}

            {/* 유사 ETF (점수 기반: 추종지수/추종국가/카테고리/테마/운용사 매칭) */}
            {similarResults.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>이거 보는 사람들이 본 ETF</h2>
                  <span>{similarResults.length}개</span>
                </div>
                <div className={styles.relatedList}>
                  {similarResults.map(({ etf: item, reasons }) => (
                    <Link href={etfPath(item.slug)} key={item.slug}>
                      <div>
                        <strong>{item.shortName || item.name}</strong>
                        <p>
                          {reasons[0]}
                          {item.fee && ` · 보수 ${item.fee}`}
                          {item.aum && ` · ${item.aum}`}
                        </p>
                      </div>
                      <span className={item.changeTone === 'down' ? styles.down : styles.up}>{item.change}</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 이 ETF를 추천한 대가 포트폴리오 (역방향 매핑) */}
            {templateMentions.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>이 ETF가 들어간 대가 포트폴리오</h2>
                  <span>{templateMentions.length}곳</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-2)' }}>
                  {templateMentions.map(({ template: tpl, weight, role, via }) => (
                    <Link
                      key={tpl.slug}
                      href={`/portfolio/templates/${tpl.slug}`}
                      style={{
                        display: 'block', padding: 'var(--space-3)',
                        background: 'var(--rw-card-muted)', borderRadius: 'var(--rw-radius-sm)',
                        textDecoration: 'none', color: 'inherit',
                        border: '1px solid var(--rw-border)',
                        transition: 'border-color 120ms ease, transform 120ms ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--rw-text-muted)' }}>
                          {tpl.author}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--rw-primary)' }}>
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--rw-text-strong)', letterSpacing: '-0.2px', marginBottom: 4 }}>
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 600 }}>
                        역할: {role} · {via === 'us' ? '미국 직접 매칭' : '국내 대체로 매칭'}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* 운용사 정보 카드 */}
            {issuerSummary && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>같은 운용사 ETF</h2>
                  <Link href={`/etf/all?q=${encodeURIComponent(issuerSummary.name)}`} style={{ fontSize: 12, color: 'var(--rw-primary)', fontWeight: 700 }}>
                    전체 →
                  </Link>
                </div>
                <IssuerCard summary={issuerSummary} currentCode={etf.code} />
              </section>
            )}
          </div>

          <aside className={styles.sideColumn}>
            {/* 핵심 요약 카드 — 한 화면에 5개 지표 */}
            <div className={styles.sideQuickCard}>
              <div className={styles.sideQuickHead}>
                <span>핵심 요약</span>
                <span className={styles.sideQuickCode}>{etf.code}</span>
              </div>
              <h3 className={styles.sideQuickTitle}>{etf.shortName}</h3>
              <p className={styles.sideQuickOneLiner}>{insight.oneLiner}</p>
              <div className={styles.sideQuickFacts}>
                <div>
                  <span>총보수</span>
                  <strong>{etf.fee || '—'}</strong>
                </div>
                <div>
                  <span>순자산</span>
                  <strong>{etf.aum || '—'}</strong>
                </div>
                <div>
                  <span>위험</span>
                  <strong style={{
                    color: risk.tone === 'good' ? 'var(--rw-green50)' :
                           risk.tone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)'
                  }}>
                    {risk.label}
                  </strong>
                </div>
                <div>
                  <span>환노출</span>
                  <strong>
                    {etf.underlyingCountry === 'KR' ? '없음' : countryInfo(etf.underlyingCountry).label}
                  </strong>
                </div>
              </div>
            </div>

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
