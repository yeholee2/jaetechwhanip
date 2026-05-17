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
import { listSparrings } from '@/lib/sparring';
import { fetchGhostArticles } from '@/lib/feed';
import { fetchRecentReportsWithFallback } from '@/lib/reports';
import {
  fetchEtfRelatedQuestions,
  findRelatedSparringsForEtf,
  findRelatedArticlesForEtf,
  findRelatedReportsForEtf,
} from '@/lib/relatedContent';
import { RelatedContent } from '@/components/RelatedContent';
import { Button, Chip, Badge, Stat, DataCell, Tooltip } from '@/components/ui';
import { lookupGlossary } from '@/lib/etfGlossary';
import { buildEtfInsight, computeFeeStats, type EtfTag } from '@/lib/etfInsights';
import { buildSectorBreakdown } from '@/lib/etfBreakdown';
import { DonutChart, CompareBar, RiskMeter } from '@/components/ui';
import { HoldingClickable } from '@/components/stock/HoldingClickable';
import { MentionedPosts } from '@/components/stock/MentionedPosts';
import { fetchPostsBySymbol } from '@/lib/postMentions';
import { buildEtfRisk } from '@/lib/etfRisk';
import { countryInfo } from '@/lib/etfCountry';
import { WatchButton } from '../WatchButton';
import { AlertButton } from '../AlertButton';
import { Suspense } from 'react';
import { EtfReturns } from './EtfReturns';
import { EtfSectionNav } from './EtfSectionNav';
import { fetchMaxHistory } from '@/lib/etfPriceHistory';
import { fetchEtfHoldings } from '@/lib/etfHoldings';
import { fetchEtfHoldingsWithCache } from '@/lib/holdingsCache';
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
  const etfPremium = 'premium' in etf ? (etf as any).premium as number | undefined : undefined;

  // 분절 해소: ETF 키워드로 4페이지 + 리포트 연결 + DB 풀(유사/운용사용)
  const baseEtf = staticEtf || etf;

  // 멀티 벤치마크 — 펀ETF 톤: KOSPI · S&P500(H) · 나스닥100(H) 동시 fetch
  const [
    sparringRes, articles, reports, dbPool, priceHistory,
    kospiHistory, sp500History, nasdaq100History,
    liveHoldings, relatedQs,
  ] = await Promise.all([
    listSparrings(),
    fetchGhostArticles(),
    fetchRecentReportsWithFallback(),
    fetchEtfs(2000),
    fetchMaxHistory(etf.code),
    fetchMaxHistory('^KS11'),
    fetchMaxHistory('^GSPC'),
    fetchMaxHistory('^NDX'),
    fetchEtfHoldingsWithCache(etf.code),
    fetchEtfRelatedQuestions(etf as any, 3),
  ]);

  const creatorPosts = await fetchPostsBySymbol(etf.code, 6).catch(() => []);
  const benchmarks = [
    { key: 'kospi',    name: 'KOSPI',       color: '#1B64DA', history: kospiHistory },
    { key: 'sp500',    name: 'S&P500(H)',   color: '#8AD504', history: sp500History },
    { key: 'nasdaq',   name: '나스닥100(H)', color: '#8B00FF', history: nasdaq100History },
  ];
  // DB 기반 유사 ETF + 같은 운용사
  const similarResults = findSimilarEtfs(etf as any, dbPool, 6);
  const relatedEtfs = similarResults.map(r => r.etf).slice(0, 5);
  // 같은 운용사 — 비슷한 ETF 와 중복되면 표시 안 함 (정보 가치 낮음)
  const similarCodes = new Set(similarResults.map(r => r.etf.code));
  const issuerRaw = buildIssuerSummary(etf as any, dbPool);
  const issuerSummary = (() => {
    if (!issuerRaw) return null;
    const filtered = issuerRaw.topEtfs.filter(e => !similarCodes.has(e.code));
    // 비슷한 ETF 에 모두 포함됐다면 별도 섹션 생략 (중복)
    if (filtered.length === 0) return null;
    return { ...issuerRaw, topEtfs: filtered };
  })();
  // 이 ETF가 들어간 대가 포트폴리오 (역방향)
  const templateMentions = findTemplatesByEtfCode(etf.code);
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
  // 섹터: 라이브 (Yahoo) 우선, 없으면 시드 holdings 분석
  const liveSectors = liveHoldings?.sectors || [];
  const sectorBreakdown = liveSectors.length > 0
    ? liveSectors.map(s => ({ label: s.sector, value: s.weight * 100 })).sort((a, b) => b.value - a.value)
    : buildSectorBreakdown(etf.holdings);
  const topSector = sectorBreakdown[0];
  // "기타 (10위 외)"가 최상위면 실질 1위 섹터를 대신 표시
  const displayTopSector = topSector?.label.startsWith('기타')
    ? (sectorBreakdown.find(s => !s.label.startsWith('기타')) ?? topSector)
    : topSector;

  // 동종 카테고리 보수 비교
  const feeStats = computeFeeStats(etf as any, etfs);

  // 위험 등급 + 투자 포인트
  const risk = buildEtfRisk(etf as any);

  // 분배금 히스토리 (분배 있는 ETF만)

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
        name: '재테크한입 ETF 목록',
        url: `${etfUrl(etf.slug).replace(`/${encodeURIComponent(etf.slug)}`, '')}`,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '재테크한입', item: etfUrl(etf.slug).replace(`/etf/${encodeURIComponent(etf.slug)}`, '') },
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
            {/* 상장지/국가 chips — 종목코드는 별도 줄로 */}
            <div className={styles.heroBadges}>
              {etf.country === 'US' ? (
                <Badge tone="fresh">미국상장</Badge>
              ) : (
                <Badge tone="success">국내상장</Badge>
              )}
              {etf.underlyingCountry && countryInfo(etf.underlyingCountry).isOverseas && (
                <Badge tone="neutral">
                  추종 {countryInfo(etf.underlyingCountry).label}
                </Badge>
              )}
              <span className={styles.heroCode}>{etf.code}</span>
            </div>
            {/* 종목명 — 토스 톤 큰 글씨 */}
            <h1>{etf.name}</h1>
            {/* 운용사 (강조) + 카테고리 — 한 줄 */}
            <p className={styles.heroMeta}>
              <strong>{etf.issuer}</strong>
              <span> · {etf.category}</span>
            </p>
            {/* 추종지수 — 별도 줄 (덜 중요한 메타) */}
            {etf.trackingIndex && (
              <p className={styles.heroIndex}>
                <span className={styles.heroIndexLabel}>추종</span>
                {etf.trackingIndex}
              </p>
            )}
            {(() => {
              // 기계적 DB 생성 패턴 감지 — "ETF명 (코드) — 운용사 운용 카테고리."
              const isGeneric = !etf.summary
                || etf.summary.startsWith(`${etf.name} (${etf.code})`)
                || etf.summary === `${etf.name} (${etf.code}) — ${etf.issuer} 운용 ${etf.category}.`;
              if (etf.summary && !isGeneric) {
                return <p className={styles.heroSummary}>{etf.summary}</p>;
              }
              // 자동 1줄 설명 — 테마·추종지수·헤지 조합
              const parts: string[] = [];
              if (etf.theme) parts.push(`${etf.theme} 테마`);
              if (etf.trackingIndex) parts.push(`${etf.trackingIndex} 추적`);
              const hedge = etf.hedge || '';
              if (/헤지|H\b/i.test(hedge)) parts.push('환헤지');
              else if (etf.country === 'US' || /\bUS\b|미국/i.test(etf.category || '')) parts.push('환 노출');
              const auto = parts.length > 0
                ? `${parts.join(' · ')} 상품이에요.`
                : `${etf.issuer}가 운용하는 ${etf.category} ETF예요.`;
              return <p className={styles.heroSummary}>{auto}</p>;
            })()}
            {etf.tags && etf.tags.length > 0 && (
              <div className={styles.tags}>
                {etf.tags.slice(0, 4).map(tag => {
                  const entry = lookupGlossary(tag);
                  const chip = <Chip subtle size="sm">#{tag}</Chip>;
                  return entry ? (
                    <Tooltip
                      key={tag}
                      label={`${tag} 설명`}
                      title={entry.title}
                      trigger={chip}
                    >
                      {entry.body}
                    </Tooltip>
                  ) : (
                    <span key={tag}>{chip}</span>
                  );
                })}
              </div>
            )}
            <div className={styles.actions}>
              <WatchButton code={etf.code} shortName={etf.shortName} mode="icon" />
              <AlertButton etfCode={etf.code} etfName={etf.shortName} currentPrice={etf.price} />
              <Button href={`/etf/compare?a=${etf.code}`} variant="ghost" size="md">비교</Button>
              <Button href="/questions/create" variant="primary" size="md">질문하기</Button>
            </div>
          </div>
          <div className={styles.heroPrice}>
            <span className={styles.heroPriceLabel}>현재가</span>
            <strong className={`${styles.heroPriceBig} ${styles[`delta_${etf.changeTone ?? 'flat'}`]}`}>
              {etf.price || '—'}
            </strong>
            {etf.change && (
              <span className={`${styles.heroPriceDelta} ${styles[`delta_${etf.changeTone}`]}`}>
                {etf.changeTone === 'up' ? '▲' : etf.changeTone === 'down' ? '▼' : ''} {etf.change}
              </span>
            )}
            <p className={styles.heroPriceFoot}>
              {etfBaseDate ? `${etfBaseDate} 기준` : etf.dataNotice}
              {etfNav && ` · NAV ${etfNav}`}
            </p>
            {/* NAV 괴리율 — 현재가와 NAV 모두 있을 때만 표시 */}
            {etfNav && etf.price && (() => {
              const pNum = parseFloat(String(etf.price).replace(/[^\d.]/g, ''));
              const nNum = parseFloat(String(etfNav).replace(/[^\d.]/g, ''));
              if (!pNum || !nNum) return null;
              const pct = ((pNum - nNum) / nNum) * 100;
              if (Math.abs(pct) < 0.05) return null; // 무시할 수준
              const sign = pct > 0 ? '+' : '';
              const tone = pct > 0.5 ? styles.delta_up : pct < -0.5 ? styles.delta_down : '';
              return (
                <p className={`${styles.heroPricePremium} ${tone}`}>
                  괴리율 {sign}{pct.toFixed(2)}%
                </p>
              );
            })()}
          </div>
        </section>

        {/* 섹션 앵커 nav — 전체 폭 (사이드 카드와 동선 충돌 방지) */}
        <EtfSectionNav />

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {/* ──────────── ① 시세: 차트 + 수익률 ──────────── */}
            <div id="sec-quote">
              <EtfChart
                code={etf.code}
                price={etf.price}
                changeTone={etf.changeTone}
                history={priceHistory}
                benchmarks={benchmarks}
              />
            </div>

            {/* ──────────── 3단: 기간별 수익률 + 적립식 계산기 ──────────── */}
            <Suspense fallback={null}>
              <EtfReturns code={etf.code} etfName={etf.shortName} lastUpdated={etfBaseDate} history={priceHistory} />
            </Suspense>

            {/* ──────────── ② 건전성: 핵심 5 그리드 + 위험 등급 ──────────── */}
            <section id="sec-health" className={styles.section} aria-label="핵심 정보">
              <div className={styles.sectionHead}>
                <h2>핵심 지표</h2>
                <span>보수·규모·분배</span>
              </div>
              <DataCell.Grid columns={4}>
                {(() => {
                  // 라이브 운용보수 (Yahoo) → 시드 fallback
                  const liveFee = liveHoldings?.expenseRatio;
                  const feeValue = liveFee != null
                    ? `연 ${(liveFee * 100).toFixed(2)}%`
                    : (etf.fee || '운용사 공시 확인');
                  const liveYield = liveHoldings?.dividendYield;
                  const distValue = liveYield != null
                    ? `연 ${(liveYield * 100).toFixed(2)}%`
                    : (etf.distribution || '분배 미확정');
                  return (
                    <>
                      <DataCell
                        label="총보수"
                        value={feeValue}
                        sub={liveFee != null
                          ? (liveFee <= 0.005 ? '아주 낮음' : liveFee <= 0.01 ? '낮은 편' : liveFee <= 0.005 ? '평균' : '높은 편')
                          : insight.tags.fee?.label || '데이터 준비 중'}
                        tone={liveFee != null
                          ? (liveFee <= 0.005 ? 'good' : liveFee <= 0.015 ? 'default' : 'warn')
                          : (insight.tags.fee?.tone === 'good' ? 'good' : insight.tags.fee?.tone === 'warn' ? 'warn' : 'default')}
                        help={
                          <>
                            운용사가 받는 연간 수수료. <strong>1년 운용 시 자동 차감</strong>됩니다.
                            <br /><br />
                            기준: <strong>0.5% 이하 = 낮음</strong> · 1% 이상 = 높음 (한국 ETF 평균 ~0.3%)
                          </>
                        }
                      />
                      <DataCell
                        label="순자산"
                        value={etf.aum || '—'}
                        sub={insight.tags.aum?.label}
                        tone={insight.tags.aum?.tone === 'good' ? 'good' : insight.tags.aum?.tone === 'warn' ? 'warn' : 'default'}
                        help={
                          <>
                            ETF에 모인 총 운용 자산. <strong>클수록 유동성·안정성 ↑</strong>.
                            <br /><br />
                            기준: <strong>1조원+ 대형</strong> · 100억 미만은 상장폐지 위험.
                          </>
                        }
                      />
                      <DataCell
                        label={liveYield != null ? '분배수익률' : '분배'}
                        value={distValue}
                        sub={insight.tags.distribution?.label}
                        help={
                          <>
                            ETF가 보유 종목 배당을 모아 투자자에게 지급하는 비율.
                            <br /><br />
                            <strong>높다고 무조건 좋은 건 아님</strong> — 분배금만큼 NAV가 빠지고, 15.4% 배당소득세 부담.
                          </>
                        }
                      />
                      <DataCell
                        label="환헤지"
                        value={etf.hedge || (etf.country === 'US' ? '환 노출' : '원화')}
                        sub={insight.tags.hedge?.label}
                        tone={insight.tags.hedge?.tone === 'good' ? 'good' : insight.tags.hedge?.tone === 'warn' ? 'warn' : 'default'}
                        help={
                          <>
                            <strong>환헤지(H)</strong> — 달러 변동을 차단해 순수 자산 수익만 가져감.
                            <br />
                            <strong>환 노출</strong> — 달러 가격 변동이 손익에 추가로 영향.
                          </>
                        }
                      />
                    </>
                  );
                })()}
              </DataCell.Grid>
              {etf.trackingIndex && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <DataCell
                    label="추종 지수"
                    value={etf.trackingIndex}
                    sub="이 ETF가 따라가는 기초지수"
                    help={
                      <>
                        이 ETF가 따라가도록 설계된 <strong>기초 지수</strong>예요.
                        <br /><br />
                        성과는 이 지수의 움직임을 거의 그대로 따라가도록 설계됐고,
                        실제와의 차이를 <strong>괴리율</strong>로 측정해요.
                      </>
                    }
                  />
                </div>
              )}

              {/* 동종 ETF 보수 비교 — 건전성 섹션 내에 배치 */}
              {feeStats && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <div className={styles.sectionSubHead}>
                    <span>동종 ETF 대비</span>
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
                </div>
              )}

              {/* 구분선 */}
              <hr style={{ border: 'none', borderTop: '1px solid var(--rw-border)', margin: 'var(--space-4) 0' }} />

              {/* 한 줄 요약 + 위험 등급 */}
              <div className={styles.riskWrap}>
                <p className={styles.riskOneLiner}>{insight.oneLiner}</p>
                <RiskMeter
                  level={risk.level}
                  label={risk.label}
                  tone={risk.tone}
                  reasons={risk.reasons}
                  points={risk.points}
                />
              </div>
            </section>

            {/* ──────────── ③ 속살: 구성종목 + 섹터 + 분배금 ──────────── */}
            <section id="sec-inside" className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>
                  {liveHoldings?.holdings?.length
                    ? `구성종목 Top ${Math.min(liveHoldings.holdings.length, 10)}`
                    : etf.holdings?.length
                      ? `구성종목 Top ${etf.holdings.length}`
                      : '구성종목'}
                </h2>
                <span>
                  {liveHoldings?.holdings?.length
                    ? 'Yahoo Finance · 실데이터'
                    : etf.holdings?.length
                      ? '참고용 비중'
                      : '운용사 공시'}
                </span>
              </div>
              {(() => {
                if (liveHoldings?.holdings?.length) {
                  const max = Math.max(...liveHoldings.holdings.map(h => h.weight), 0.01);
                  // 도넛: 5개 이상일 때만 의미 있음 (3개 미만이면 막대바만)
                  const showDonut = liveHoldings.holdings.length >= 5;
                  const topN = liveHoldings.holdings.slice(0, 10);
                  const topSum = topN.reduce((s, h) => s + h.weight, 0);
                  const segments = topN.map(h => ({
                    label: h.name,
                    value: h.weight * 100,
                  }));
                  if (topSum < 1) {
                    segments.push({ label: '기타', value: (1 - topSum) * 100 });
                  }
                  const list = (
                    <div className={styles.holdingList}>
                      {liveHoldings.holdings.map(h => {
                        const row = (
                          <div className={styles.holdingRow}>
                            <div className={styles.holdingInfo}>
                              <strong>{h.name}</strong>
                              <p>{h.symbol}</p>
                            </div>
                            <div className={styles.holdingBar} aria-hidden="true">
                              <span style={{ width: `${(h.weight / max) * 100}%` }} />
                            </div>
                            <b className={styles.holdingPct}>{(h.weight * 100).toFixed(2)}%</b>
                          </div>
                        );
                        return h.symbol ? (
                          <HoldingClickable key={h.symbol} symbol={h.symbol} displayName={h.name}>
                            {row}
                          </HoldingClickable>
                        ) : (
                          <div key={h.name}>{row}</div>
                        );
                      })}
                    </div>
                  );
                  if (!showDonut) return list;
                  return (
                    <div className={styles.holdingsLayout}>
                      <div className={styles.holdingsDonut}>
                        <DonutChart
                          segments={segments}
                          centerLabel="Top 보유"
                          centerValue={`${(topSum * 100).toFixed(0)}%`}
                          size={180}
                          thickness={28}
                        />
                      </div>
                      {list}
                    </div>
                  );
                }
                if (etf.holdings?.length) {
                  const parsed = etf.holdings.map(h => ({
                    ...h,
                    pct: parseFloat(String(h.weight).replace(/[^\d.]/g, '')) || 0,
                  })).sort((a, b) => b.pct - a.pct);
                  const max = Math.max(...parsed.map(p => p.pct), 1);
                  const showDonut = parsed.length >= 5;
                  const topSum = parsed.reduce((s, p) => s + p.pct, 0);
                  const segments = parsed.map(p => ({ label: p.name, value: p.pct }));
                  if (topSum < 100) {
                    segments.push({ label: '기타', value: 100 - topSum });
                  }
                  const list = (
                    <div className={styles.holdingList}>
                      {parsed.map(holding => (
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
                      ))}
                    </div>
                  );
                  if (!showDonut) return list;
                  return (
                    <div className={styles.holdingsLayout}>
                      <div className={styles.holdingsDonut}>
                        <DonutChart
                          segments={segments}
                          centerLabel="Top 보유"
                          centerValue={`${topSum.toFixed(0)}%`}
                          size={180}
                          thickness={28}
                        />
                      </div>
                      {list}
                    </div>
                  );
                }
                const isKR = /^[0-9]{6}$/.test(etf.code);
                const disclosureUrl = isKR
                  ? `https://finance.naver.com/item/coinfo.naver?code=${etf.code}`
                  : `https://www.google.com/search?q=${encodeURIComponent(`${etf.shortName || etf.name} ETF holdings`)}`;
                const disclosureLabel = isKR ? '네이버 증권에서 구성종목 보기' : '운용사 공시 검색하기';
                return (
                  <div className={styles.emptyHoldings}>
                    <FaIcon name="folder-open" size={22} />
                    <p className={styles.emptyHoldingsTitle}>구성종목 데이터를 아직 불러올 수 없어요</p>
                    <p className={styles.emptyHoldingsBody}>
                      운용사 공식 공시(보통 매월 갱신)에서 전체 보유 종목을 확인할 수 있어요.
                    </p>
                    <a
                      href={disclosureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.emptyHoldingsCta}
                    >
                      <FaIcon name="arrow-up-right-from-square" size={11} />
                      {disclosureLabel}
                    </a>
                  </div>
                );
              })()}
              {/* 전체 구성종목 링크 — 데이터 있을 때만 */}
              {(liveHoldings?.holdings?.length || etf.holdings?.length) && /^[0-9]{6}$/.test(etf.code) && (
                <a
                  href={`https://finance.naver.com/item/coinfo.naver?code=${etf.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.holdingAllLink}
                >
                  네이버 증권에서 전체 구성종목 보기 →
                </a>
              )}
            </section>

            {/* 섹터 비중 도넛 (Toss / FunETF 스타일) */}
            {/* 기타 비중이 60% 초과면 실질 섹터 분산 데이터가 없는 것 — 차트 숨김 */}
            {(() => {
              const otherPct = sectorBreakdown.find(s => s.label.startsWith('기타'))?.value ?? 0;
              if (sectorBreakdown.length <= 1 || otherPct > 60) return null;
              return (
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h2>섹터 비중</h2>
                    <span>{displayTopSector ? `${displayTopSector.label} ${displayTopSector.value.toFixed(1)}%` : ''}</span>
                  </div>
                  <DonutChart
                    segments={sectorBreakdown}
                    centerLabel="주요 섹터"
                    centerValue={displayTopSector ? displayTopSector.label : ''}
                  />
                </section>
              );
            })()}

            {/* (분배금 mock 섹션 제거 — 실데이터 KRX API 연동 후 다시 추가) */}

            {/* ──────────── ④ 궁합: AI 매칭 ──────────── */}
            <div id="sec-match">
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
            </div>

            {/* ──────────── ⑤ 사회적 증거: 유사·대가·운용사 ──────────── */}
            {/* 유사 ETF (점수 기반: 추종지수/추종국가/카테고리/테마/운용사 매칭) */}
            {similarResults.length > 0 && (
              <section id="sec-social" className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>비슷한 ETF</h2>
                  <span>{similarResults.length}개</span>
                </div>
                <div className={styles.relatedList}>
                  {similarResults.map(({ etf: item, reasons }) => {
                    // 추천 이유 칩 — 기본 reasons + 보수/순자산 비교 강화
                    type Chip = { label: string; good?: boolean };
                    const chips: Chip[] = reasons.map(r => ({ label: r }));
                    const feeBase = parseFloat(String(etf.fee || '').replace(/[^\d.]/g, ''));
                    const feeItem = parseFloat(String(item.fee || '').replace(/[^\d.]/g, ''));
                    if (feeBase > 0 && feeItem > 0 && feeItem < feeBase) {
                      chips.push({ label: '보수 더 낮음', good: true });
                    }
                    const aumNum = (s?: string) => {
                      if (!s) return 0;
                      const m = s.match(/([\d.]+)\s*(조|억)/);
                      if (!m) return 0;
                      const n = parseFloat(m[1]);
                      return m[2] === '조' ? n * 10000 : n;
                    };
                    if (aumNum(item.aum) > aumNum(etf.aum) * 1.5) {
                      chips.push({ label: '순자산 더 큼', good: true });
                    }
                    return (
                    <Link href={etfPath(item.slug)} key={item.slug}>
                      <div>
                        <strong>{item.shortName || item.name}</strong>
                        <div className={styles.reasonChips}>
                          {chips.slice(0, 3).map((c, i) => (
                            <span
                              key={`${item.slug}-${i}`}
                              className={`${styles.reasonChip} ${c.good ? styles.reasonChipGood : ''}`}
                            >
                              {c.label}
                            </span>
                          ))}
                        </div>
                        <p>
                          {item.fee && `보수 ${item.fee}`}
                          {item.aum && (item.fee ? ` · ${item.aum}` : item.aum)}
                        </p>
                      </div>
                      <span className={item.changeTone === 'down' ? styles.down : styles.up}>{item.change}</span>
                    </Link>);
                  })}
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

            {/* (페이지 하단 CTA 제거 — Hero·사이드·Chat·관련콘텐츠 footer 에 이미 질문 진입로 다수) */}
          </div>

          <aside className={styles.sideColumn}>
            {/* Sticky 가격/액션 카드 — PC 상품성 */}
            <div className={styles.sideQuickCard}>
              <div className={styles.stickyPrice}>
                <span className={styles.stickyPriceLabel}>지금 가격</span>
                <div className={styles.stickyPriceRow}>
                  <strong className={styles.stickyPriceBig}>{etf.price || '—'}</strong>
                  {etf.change && (
                    <span className={`${styles.stickyPriceDelta} ${styles[`delta_${etf.changeTone}`]}`}>
                      {etf.changeTone === 'up' ? '▲' : etf.changeTone === 'down' ? '▼' : ''} {etf.change}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.stickyActions}>
                <WatchButton code={etf.code} shortName={etf.shortName} mode="icon" />
                <AlertButton etfCode={etf.code} etfName={etf.shortName} currentPrice={etf.price} />
                <Link href={`/etf/compare?a=${etf.code}`} className={styles.stickyActBtn} aria-label="비교">
                  <FaIcon name="scale-balanced" size={14} />
                </Link>
                <Link href="/questions/create" className={`${styles.stickyActBtn} ${styles.stickyActPrimary}`} aria-label="질문하기">
                  <FaIcon name="comment-dots" size={14} />
                </Link>
              </div>
              <div className={styles.sideQuickHead}>
                <span className={styles.sideQuickEyebrow}>
                  <span className={`${styles.sideQuickSparkle} tf`} aria-hidden="true">✨</span>
                  한입 요약
                </span>
                <span className={styles.sideQuickCode}>{etf.code}</span>
              </div>
              <h3 className={styles.sideQuickTitle}>{etf.shortName}</h3>
              <p className={styles.sideQuickOneLiner}>{insight.oneLiner}</p>
              <div className={styles.sideQuickFacts}>
                <div>
                  <span className={styles.factLabel}>
                    총보수
                    <Tooltip label="총보수" title="총보수 (운용보수)" align="left">
                      ETF가 매년 자동으로 떼가는 수수료. <strong>0.5% 이하면 저렴한 편</strong>이에요.
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>{etf.fee || '—'}</span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    순자산
                    <Tooltip label="순자산" title="순자산 (AUM)" align="left">
                      이 ETF에 모인 총 자산. <strong>1조원 이상이면 대형</strong>, 100억 미만은 상장폐지 위험이 있어요.
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>{etf.aum || '—'}</span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    위험
                    <Tooltip label="위험 등급" title="위험 등급" align="left">
                      변동성·하락 가능성·자산 종류를 종합한 5단계 등급. <strong>1등급이 가장 위험</strong>, 5등급이 가장 안전해요.
                    </Tooltip>
                  </span>
                  <span
                    className={styles.factValue}
                    style={{
                      color: risk.tone === 'good' ? 'var(--rw-green50)' :
                             risk.tone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)',
                    }}
                  >
                    {risk.label}
                  </span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    환노출
                    <Tooltip label="환노출" title="환노출" align="left">
                      해외 자산을 담은 ETF는 환율에 영향을 받아요. <strong>환헤지(H)</strong>는 환율 영향을 차단하고, <strong>환 노출</strong>은 그대로 가져가요.
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>
                    {etf.underlyingCountry === 'KR' ? '없음' : countryInfo(etf.underlyingCountry).label}
                  </span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    거래량
                    <Tooltip label="거래량" title="일일 거래량" align="left">
                      하루에 거래된 주식 수. <strong>많을수록 사고팔기 쉽고 가격이 안정적</strong>이에요. 너무 적으면 호가 차이가 커져요.
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>{etf.volume || '—'}</span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    {etfBaseDate ? '기준일' : '상장일'}
                    <Tooltip label={etfBaseDate ? '기준일' : '상장일'} title={etfBaseDate ? '기준일' : '상장일'} align="left">
                      {etfBaseDate
                        ? <>가격·NAV·순자산 값을 산출한 기준 날짜. 보통 <strong>최근 거래일 종가</strong> 기준이에요.</>
                        : <>이 ETF가 거래소에 처음 상장된 날. 상장이 오래될수록 <strong>장기 성과 데이터</strong>가 쌓여 신뢰도가 올라가요.</>}
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>{etfBaseDate || etf.listedAt || '—'}</span>
                </div>
                {etfNav && (
                  <div>
                    <span className={styles.factLabel}>
                      NAV
                      <Tooltip label="NAV" title="NAV (순자산가치)" align="left">
                        ETF가 보유한 자산의 진짜 가격. <strong>현재가가 NAV보다 비싸면 고평가, 싸면 저평가</strong>로 거래되고 있다는 신호 (=괴리율).
                      </Tooltip>
                    </span>
                    <span className={styles.factValue}>{etfNav}</span>
                  </div>
                )}
                {typeof etfPremium === 'number' && Math.abs(etfPremium) > 0.001 && (
                  <div>
                    <span className={styles.factLabel}>
                      괴리율
                      <Tooltip label="괴리율" title="괴리율 (Premium/Discount)" align="left">
                        현재가가 NAV(순자산가치)보다 얼마나 더 비싸거나 싸게 거래되는지. <strong>±0.5% 이내가 정상</strong>이고, 너무 크면 LP가 잘 작동 안 한다는 신호예요.
                      </Tooltip>
                    </span>
                    <span
                      className={styles.factValue}
                      style={{
                        color: Math.abs(etfPremium) > 0.5
                          ? 'var(--rw-red60)'
                          : Math.abs(etfPremium) > 0.2
                            ? 'var(--rw-text-strong)'
                            : 'var(--rw-green50)',
                      }}
                    >
                      {etfPremium > 0 ? '+' : ''}{etfPremium.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {/* 메타 footer — 운용사 + 추종지수 (그리드 밖) */}
              <div className={styles.sideQuickMeta}>
                <div className={styles.sideMetaRow}>
                  <span className={styles.sideMetaLabel}>운용사</span>
                  <span className={styles.sideMetaValue}>{etf.issuer}</span>
                </div>
                {etf.trackingIndex && (
                  <div className={styles.sideMetaRow}>
                    <span className={styles.sideMetaLabel}>추종 지수</span>
                    <span className={styles.sideMetaValue} title={etf.trackingIndex}>{etf.trackingIndex}</span>
                  </div>
                )}
                {etf.category && (
                  <div className={styles.sideMetaRow}>
                    <span className={styles.sideMetaLabel}>카테고리</span>
                    <span className={styles.sideMetaValue}>{etf.category}</span>
                  </div>
                )}
              </div>
            </div>

            {creatorPosts.length > 0 && (
              <section className={styles.sideCard}>
                <MentionedPosts
                  posts={creatorPosts}
                  title={`📝 ${etf.shortName} 을(를) 다룬 글`}
                />
              </section>
            )}

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
