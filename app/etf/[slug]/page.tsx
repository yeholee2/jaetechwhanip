import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FaIcon } from '@/components/FaIcon';
import { getEtfsWithMarketData, type EtfInfoWithMarketData } from '@/lib/etf-live-data';
import { ETF_HOME_PATH, etfPath, etfUrl, etfs, getEtfBySlug, type EtfInfo } from '@/lib/etfs';
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
import { buildEtfInsight, computeFeeStats } from '@/lib/etfInsights';
import { buildSectorBreakdown } from '@/lib/etfBreakdown';
import { DonutChart, CompareBar, RiskMeter } from '@/components/ui';
import { HoldingClickable } from '@/components/stock/HoldingClickable';
import { MentionedPosts } from '@/components/stock/MentionedPosts';
import { fetchPostsBySymbol } from '@/lib/postMentions';
import { buildEtfRisk } from '@/lib/etfRisk';
import { countryInfo } from '@/lib/etfCountry';
import { WatchButton } from '../WatchButton';
import { AlertButton } from '../AlertButton';
import { EtfSectionNav } from './EtfSectionNav';
import { computePeriodReturns, type PricePoint } from '@/lib/etfPriceHistory';
import type { EtfHoldingsData } from '@/lib/etfHoldings';
import { ShareButton } from '../ShareButton';
import { RecordEtfView } from '../RecordEtfView';
import { EtfChart } from '../EtfChart';
import { RangeBar } from '@/components/etf/RangeBar';
import { applyResolvedEtfCode, isKrEtfCode } from '@/lib/etfCodes';
import { getEtfAccountEligibility } from '@/lib/etfAccountEligibility';
import { fetchNaverEtfNavHistory, fetchNaverEtfRealtime } from '@/lib/naverEtfData';
// import { EtfChat } from '../EtfChat'; // 일단 제거
import styles from './EtfDetailPage.module.css';

function hasFactValue(value: string | null | undefined) {
  const v = value?.toString().trim();
  return !!v && v !== '—' && v !== '-' && v !== '정보 없음';
}

/** 빈 값 처리 — 비어 있는 데이터는 투자정보처럼 보이지 않게 공시 확인 톤으로 낮춘다. */
function FactValue({
  value,
  emptyLabel = '공시 확인 필요',
}: {
  value: string | null | undefined;
  emptyLabel?: string;
}) {
  const v = value?.toString().trim();
  if (!hasFactValue(v)) {
    return <span className={`${styles.factValue} ${styles.factValueEmpty}`}>{emptyLabel}</span>;
  }
  return <span className={styles.factValue}>{v}</span>;
}

function formatReturn(pct: number | null) {
  if (pct == null) return '—';
  const value = pct * 100;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function parsePercentValue(value: string | null | undefined) {
  const n = Number(String(value || '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function metricToneLabel(kind: 'fee' | 'premium' | 'volume', value: string | number | null | undefined) {
  if (kind === 'fee') {
    const pct = typeof value === 'number' ? value : parsePercentValue(value as string);
    if (pct == null) return '공시 확인';
    if (pct <= 0.1) return '낮음';
    if (pct <= 0.5) return '보통';
    return '높음';
  }
  if (kind === 'premium') {
    const pct = typeof value === 'number' ? value : parsePercentValue(value as string);
    if (pct == null) return '공시 확인';
    const abs = Math.abs(pct);
    if (abs <= 0.2) return '정상 범위';
    if (abs <= 0.5) return '확인 필요';
    return '주의';
  }
  return hasFactValue(String(value || '')) ? '거래 확인' : '공시 확인';
}

const HIDDEN_DETAIL_TAGS = new Set(['시장지수', '테마형', 'KR', 'US']);

function isVisibleDetailTag(tag: string) {
  const trimmed = tag.trim();
  if (!trimmed) return false;
  return !HIDDEN_DETAIL_TAGS.has(trimmed) && !HIDDEN_DETAIL_TAGS.has(trimmed.toUpperCase());
}

async function withSoftTimeout<T>(promise: Promise<T>, fallback: T, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const guarded = promise.catch(() => fallback);
  const timeout = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  const result = await Promise.race([guarded, timeout]);
  if (timer) clearTimeout(timer);
  return result;
}

function withMarketDataFallback(etf: EtfInfo): EtfInfoWithMarketData {
  return {
    ...etf,
    dataSource: (etf.dataSource as EtfInfoWithMarketData['dataSource']) || 'database',
    dataNotice: etf.dataNotice || (etf.baseDate ? `DB 저장 시세 · ${etf.baseDate} 기준` : 'DB 저장 ETF 정보'),
  };
}

function buildCompactEtfDescription(etf: {
  name: string;
  shortName?: string;
  category?: string;
  theme?: string;
  trackingIndex?: string;
  tags?: string[];
  underlyingCountry?: string;
  country?: string;
}) {
  const text = [
    etf.name,
    etf.shortName,
    etf.category,
    etf.theme,
    etf.trackingIndex,
    ...(etf.tags || []),
  ].filter(Boolean).join(' ');
  const hasUsSignal = /미국|S&P|나스닥|NASDAQ|다우존스|SCHD|필라델피아/i.test(text);
  const country = etf.underlyingCountry
    ? countryInfo(etf.underlyingCountry).label
    : (hasUsSignal || (etf.country || '').toUpperCase() === 'US' ? '미국' : '');
  const prefix = country && country !== '국내' ? `${country} ` : country === '국내' ? '국내 ' : '';

  if (/휴머노이드|로봇/i.test(text)) return `${prefix}휴머노이드 로봇 관련 기업에 투자하는 ETF예요.`;
  if (/S&P\s*500|에스앤피|스탠더드/i.test(text)) return `${prefix}S&P 500 내 기업에 투자하는 ETF예요.`;
  if (/나스닥\s*100|NASDAQ\s*100/i.test(text)) return `${prefix}나스닥100 기업에 투자하는 ETF예요.`;
  if (/필라델피아|반도체|semiconductor/i.test(text)) return `${prefix}반도체 기업에 투자하는 ETF예요.`;
  if (/배당|SCHD|다우존스/i.test(text)) return `${prefix}배당주에 투자하는 ETF예요.`;
  if (/AI|인공지능/i.test(text)) return `${prefix}AI 관련 기업에 투자하는 ETF예요.`;
  if (/바이오|헬스케어|의료/i.test(text)) return `${prefix}바이오·헬스케어 기업에 투자하는 ETF예요.`;
  if (/2차전지|이차전지|배터리/i.test(text)) return `${prefix}2차전지 관련 기업에 투자하는 ETF예요.`;
  if (/코스피\s*200|KOSPI\s*200/i.test(text)) return '코스피200 기업에 투자하는 ETF예요.';
  if (/코스닥\s*150|KOSDAQ\s*150/i.test(text)) return '코스닥150 기업에 투자하는 ETF예요.';
  if (/채권|국고채|국채|회사채|bond/i.test(text)) return `${prefix}채권에 투자하는 ETF예요.`;
  if (/금|골드|gold/i.test(text)) return '금에 투자하는 ETF예요.';
  if (/원유|오일|oil/i.test(text)) return '원유에 투자하는 ETF예요.';
  if (/리츠|부동산|REIT/i.test(text)) return `${prefix}리츠·부동산에 투자하는 ETF예요.`;

  const theme = (etf.theme || '')
    .replace(/테마/g, '')
    .replace(/시장지수/g, '')
    .trim();
  if (theme) return `${prefix}${theme} 관련 자산에 투자하는 ETF예요.`;
  if (/주식|equity/i.test(etf.category || '')) return `${prefix}기업에 분산 투자하는 ETF예요.`;
  return '여러 자산에 나눠 투자하는 ETF예요.';
}

type Props = { params: { slug: string } };

export const revalidate = 60;

export function generateStaticParams() {
  return etfs.map(etf => ({ slug: etf.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug);
  const rawEtf = await fetchEtfBySlug(decodedSlug)
    || await fetchEtfByCode(decodedSlug)
    || getEtfBySlug(decodedSlug);
  const etf = rawEtf ? applyResolvedEtfCode(rawEtf) : undefined;
  if (!etf) return { title: 'ETF를 찾을 수 없어요', robots: { index: false, follow: true } };

  const compactDescription = buildCompactEtfDescription(etf);
  const description = truncateDescription(`${etf.name}: ${compactDescription} 현재가, 순자산, 총보수, 분배금, 환헤지, 구성종목과 관련 질문을 함께 봅니다.`, 150);

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

  // 1) DB 우선. DB가 없을 때만 시드 메타데이터로 fallback한다.
  const dbEtfBySlug = await fetchEtfBySlug(decodedSlug);
  const dbEtfByCode = dbEtfBySlug || await fetchEtfByCode(decodedSlug);
  const staticEtf = getEtfBySlug(decodedSlug);
  const baseEtf = dbEtfByCode || staticEtf;

  if (!baseEtf) notFound();

  const resolvedBaseEtf = applyResolvedEtfCode(baseEtf);

  // 2) 선택된 ETF 1개에만 실제 시세 API를 코드로 매칭한다. 실패 시 시드 가격으로 대체하지 않는다.
  const [marketEtf] = await withSoftTimeout(
    getEtfsWithMarketData([resolvedBaseEtf]),
    [withMarketDataFallback(resolvedBaseEtf)],
    1800,
  );
  const naverRealtime = isKrEtfCode(marketEtf.code)
    ? await withSoftTimeout(fetchNaverEtfRealtime(marketEtf.code), null, 900)
    : null;
  const etf = naverRealtime
    ? {
        ...marketEtf,
        code: naverRealtime.code,
        price: naverRealtime.price || marketEtf.price,
        change: naverRealtime.change || marketEtf.change,
        changeTone: naverRealtime.changeTone,
        volume: naverRealtime.volume || marketEtf.volume,
        aum: naverRealtime.aum || marketEtf.aum,
        nav: naverRealtime.nav || marketEtf.nav,
        tradeValue: naverRealtime.tradeValue || marketEtf.tradeValue,
        baseDate: naverRealtime.baseDate || marketEtf.baseDate,
        premium: typeof naverRealtime.premium === 'number' ? naverRealtime.premium : marketEtf.premium,
        dataSource: 'naver' as const,
        dataNotice: '네이버증권 실시간 시세 기준',
      }
    : marketEtf;

  const etfNav = 'nav' in etf ? etf.nav : undefined;
  const etfBaseDate = 'baseDate' in etf ? etf.baseDate : undefined;
  const etfPremium = 'premium' in etf ? (etf as any).premium as number | undefined : undefined;

  // 분절 해소: ETF 키워드로 4페이지 + 리포트 연결 + DB 풀(유사/운용사용)
  const contentBaseEtf = applyResolvedEtfCode(dbEtfByCode || staticEtf || etf);

  // 멀티 벤치마크 — 펀ETF 톤: KOSPI · S&P500(H) · 나스닥100(H) 동시 fetch
  const [
    sparringRes, articles, reports, dbPool, priceHistory,
    kospiHistory, sp500History, nasdaq100History,
    liveHoldings, navHistory, relatedQs,
  ] = await Promise.all([
    withSoftTimeout(listSparrings(), { sparrings: [], usingFallback: true }, 1200),
    withSoftTimeout(fetchGhostArticles(), [], 1200),
    withSoftTimeout(fetchRecentReportsWithFallback(), [], 1200),
    withSoftTimeout(fetchEtfs(2000), [contentBaseEtf as EtfInfo], 1500),
    Promise.resolve([] as PricePoint[]),
    Promise.resolve([] as PricePoint[]),
    Promise.resolve([] as PricePoint[]),
    Promise.resolve([] as PricePoint[]),
    Promise.resolve(null as EtfHoldingsData | null),
    isKrEtfCode(etf.code)
      ? withSoftTimeout(fetchNaverEtfNavHistory(etf.code), [], 1000)
      : Promise.resolve([]),
    withSoftTimeout(fetchEtfRelatedQuestions(etf as any, 3), [], 1000),
  ]);

  const creatorPosts = await withSoftTimeout(fetchPostsBySymbol(etf.code, 6), [], 1000);
  const benchmarks = [
    { key: 'kospi',    name: 'KOSPI',       color: '#1B64DA', history: kospiHistory },
    { key: 'sp500',    name: 'S&P500(H)',   color: '#8AD504', history: sp500History },
    { key: 'nasdaq',   name: '나스닥100(H)', color: '#8B00FF', history: nasdaq100History },
  ];
  // DB 기반 유사 ETF + 같은 운용사
  const normalizedDbPool = dbPool.map(item => applyResolvedEtfCode(item));
  const similarResults = findSimilarEtfs(etf as any, normalizedDbPool, 8)
    .filter(result => result.etf.slug !== etf.slug && result.etf.code !== etf.code)
    .slice(0, 4);
  const similarLiveList = similarResults.length > 0
    ? await withSoftTimeout(
        getEtfsWithMarketData(similarResults.map(result => applyResolvedEtfCode(result.etf))),
        [],
        1200,
      )
    : [];
  const similarLiveBySlug = new Map(similarLiveList.map(item => [item.slug, item]));
  // 같은 운용사 — 비슷한 ETF 와 중복되면 표시 안 함 (정보 가치 낮음)
  const similarCodes = new Set(similarResults.map(r => r.etf.code));
  const issuerRaw = buildIssuerSummary(etf as any, normalizedDbPool);
  const issuerSummary = (() => {
    if (!issuerRaw) return null;
    const filtered = issuerRaw.topEtfs.filter(e => !similarCodes.has(e.code));
    // 비슷한 ETF 에 모두 포함됐다면 별도 섹션 생략 (중복)
    if (filtered.length === 0) return null;
    return { ...issuerRaw, topEtfs: filtered };
  })();
  // 이 ETF가 들어간 대가 포트폴리오 (역방향)
  const templateMentions = findTemplatesByEtfCode(etf.code);
  const relatedSparrings = findRelatedSparringsForEtf(contentBaseEtf as any, sparringRes.sparrings, 2);
  const relatedArticles = findRelatedArticlesForEtf(contentBaseEtf as any, articles, 3);
  const relatedReports = findRelatedReportsForEtf(contentBaseEtf as any, reports, 3);
  // 가격 숫자 추출 (Schema.org Offer)
  const priceNumMatch = etf.price.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  const priceValue = priceNumMatch ? priceNumMatch[0] : undefined;
  const periodReturns = computePeriodReturns(priceHistory);
  const returnSummary = ['m1', 'm3', 'ytd', 'y1']
    .map(key => periodReturns.find(item => item.key === key))
    .filter((item): item is NonNullable<typeof item> => !!item);
  const latestHistoryDate = priceHistory.length > 0
    ? priceHistory[priceHistory.length - 1].date
    : etfBaseDate;
  // 자동 한줄평 + 태그
  const insight = buildEtfInsight(etf as any);

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
  const feeStats = computeFeeStats(etf as any, dbPool);

  // 위험 등급 + 투자 포인트
  const risk = buildEtfRisk(etf as any);
  const exposureInfo = countryInfo(etf.underlyingCountry);
  const currencyExposure = exposureInfo.isOverseas
    ? {
        label: etf.hedge || `${exposureInfo.label} 자산`,
        sub: insight.tags.hedge?.label || `${exposureInfo.label} 자산`,
      }
    : {
        label: '국내 자산',
        sub: '원화 기준',
      };

  const oneMonthReturn = returnSummary.find(item => item.key === 'm1')?.pct ?? null;
  const threeMonthReturn = returnSummary.find(item => item.key === 'm3')?.pct ?? null;
  const premiumLabel = typeof etfPremium === 'number'
    ? `${etfPremium > 0 ? '+' : ''}${etfPremium.toFixed(2)}%`
    : '';
  const decisionCards = [
    {
      label: '현재가',
      value: etf.price,
      sub: etf.change || etfBaseDate || etf.dataNotice,
      tone: etf.changeTone,
    },
    {
      label: '1개월',
      value: formatReturn(oneMonthReturn),
      sub: latestHistoryDate ? `${latestHistoryDate} 종가` : '가격 데이터 기준',
      tone: oneMonthReturn && oneMonthReturn > 0 ? 'up' : oneMonthReturn && oneMonthReturn < 0 ? 'down' : 'flat',
    },
    {
      label: '3개월',
      value: formatReturn(threeMonthReturn),
      sub: threeMonthReturn == null ? '상장/가격 데이터 부족' : '단순 종가 기준',
      tone: threeMonthReturn && threeMonthReturn > 0 ? 'up' : threeMonthReturn && threeMonthReturn < 0 ? 'down' : 'flat',
    },
    {
      label: '순자산',
      value: etf.aum,
      sub: hasFactValue(etf.aum) ? '실제 수집값' : '공시 확인 필요',
      tone: 'flat',
    },
    {
      label: '총보수',
      value: etf.fee,
      sub: metricToneLabel('fee', etf.fee),
      tone: 'flat',
    },
    {
      label: '괴리율',
      value: premiumLabel,
      sub: metricToneLabel('premium', etfPremium),
      tone: typeof etfPremium === 'number' && etfPremium > 0 ? 'up' : typeof etfPremium === 'number' && etfPremium < 0 ? 'down' : 'flat',
    },
  ];

  const currentPriceNumber = parseFloat(String(etf.price || '').replace(/[^\d.]/g, ''));
  const yearAgoTimestamp = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const recentYearPrices = priceHistory.filter(p => new Date(p.date).getTime() >= yearAgoTimestamp);
  const yearlyRange = currentPriceNumber && recentYearPrices.length >= 10
    ? (() => {
        const closes = recentYearPrices.map(p => p.close);
        const rangeValues = [...closes, currentPriceNumber];
        return {
          low: Math.min(...rangeValues),
          high: Math.max(...rangeValues),
          current: currentPriceNumber,
        };
      })()
    : null;
  const formatWon = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;
  const isDomesticEquity =
    etf.underlyingCountry === 'KR' &&
    !/채권|원자재|금|커버드콜/i.test(etf.theme || etf.category || '');
  const capitalGainsTax = isDomesticEquity ? '비과세' : '15.4%';
  const accountEligibility = getEtfAccountEligibility(etf);
  const actualWeightedHoldings = liveHoldings?.holdings?.filter(h => h.weight > 0) ?? [];
  const visibleHoldingCount = Math.min(actualWeightedHoldings.length, 8);
  const compactDescription = buildCompactEtfDescription(etf);
  const visibleTags = (etf.tags || []).filter(isVisibleDetailTag).slice(0, 4);

  // 분배금 히스토리 (분배 있는 ETF만)

  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: `${etf.name} ETF`,
      identifier: etf.code,
      url: etfUrl(etf.slug),
      description: compactDescription,
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
          <div className={styles.topActions}>
            <AlertButton
              etfCode={etf.code}
              etfName={etf.shortName}
              currentPrice={etf.price}
              variant="top"
            />
            <ShareButton title={`${etf.name} | ${SITE_NAME}`} text={compactDescription} />
          </div>
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
            <p className={styles.heroSummary}>{compactDescription}</p>
            {visibleTags.length > 0 && (
              <div className={styles.tags}>
                {visibleTags.map(tag => {
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
              <WatchButton code={etf.code} shortName={etf.shortName} mode="full" />
              <Button href={`/etf/compare?a=${etf.code}`} variant="primary" size="md">
                <FaIcon name="scale-balanced" size={13} />
                비교
              </Button>
              <Button href="/questions/create" variant="ghost" size="md">질문</Button>
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

        {/* ──────────── ① 시세: 상단 설명 직후에 보는 메인 차트 ──────────── */}
        <div id="sec-quote" className={styles.quoteBlock}>
          <EtfChart
            code={etf.code}
            price={etf.price}
            changeTone={etf.changeTone}
            history={priceHistory}
            navHistory={navHistory}
            benchmarks={benchmarks}
            compact
          />
        </div>

        <section className={styles.decisionSummary} aria-label="투자 판단 요약">
          <div className={styles.decisionIntro}>
            <span>투자 판단 요약</span>
            <strong>{compactDescription}</strong>
            <p>{etf.dataNotice || (etfBaseDate ? `${etfBaseDate} 기준` : '실제 수집 데이터 기준')}</p>
          </div>
          <div className={styles.decisionGrid}>
            {decisionCards.map(card => (
              <div key={card.label} className={styles.decisionCard}>
                <span>{card.label}</span>
                {hasFactValue(card.value) ? (
                  <strong className={styles[`delta_${card.tone}`] || undefined}>{card.value}</strong>
                ) : (
                  <FactValue value={null} />
                )}
                {card.sub && <p>{card.sub}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* 52주 범위 range bar (Toss증권 패턴) — priceHistory 1년치에서 산출 */}
        {(() => {
          if (!yearlyRange || yearlyRange.low === yearlyRange.high) return null;
          return (
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <RangeBar
                label="52주 범위"
                low={yearlyRange.low}
                high={yearlyRange.high}
                current={yearlyRange.current}
              />
            </div>
          );
        })()}

        {/* iNAV · 괴리율 · 거래량 미니 통계 띠 (ETF Check 패턴) */}
        <div className={styles.heroStrip}>
          <div className={styles.heroStripCell}>
            <span className={styles.heroStripLabel}>iNAV</span>
            <strong className={styles.heroStripValue}>
              {etfNav || <FactValue value={null} emptyLabel="공시 확인" />}
            </strong>
          </div>
          <div className={styles.heroStripCell}>
            <span className={styles.heroStripLabel}>괴리율</span>
            <strong className={styles.heroStripValue}>
              {(() => {
                if (typeof etfPremium !== 'number') return <FactValue value={null} emptyLabel="공시 확인" />;
                const sign = etfPremium > 0 ? '+' : '';
                const tone = Math.abs(etfPremium) > 0.5
                  ? styles.delta_down
                  : Math.abs(etfPremium) > 0.2
                    ? ''
                    : styles.delta_up;
                return (
                  <span className={tone}>{sign}{etfPremium.toFixed(2)}%</span>
                );
              })()}
            </strong>
          </div>
          <div className={styles.heroStripCell}>
            <span className={styles.heroStripLabel}>거래량</span>
            <strong className={styles.heroStripValue}>
              <FactValue value={etf.volume} />
            </strong>
          </div>
        </div>

        <section className={styles.preTradePanel} aria-label="ETF 매수 전 체크">
          <div className={styles.preTradeHead}>
            <span>매수 전 체크</span>
            <strong>가격보다 먼저 볼 것</strong>
            <p>{etf.dataNotice || (etfBaseDate ? `${etfBaseDate} 기준` : '실제 수집 데이터 기준')}</p>
          </div>
          <div className={styles.preTradeGrid}>
            <div className={styles.preTradeCell}>
              <span>거래량</span>
              <strong><FactValue value={etf.volume} /></strong>
              <p>{hasFactValue(etf.volume) ? '사고팔기 쉬운지 확인' : '거래 데이터 확인 필요'}</p>
            </div>
            <div className={styles.preTradeCell}>
              <span>괴리율</span>
              <strong>
                {typeof etfPremium === 'number'
                  ? `${etfPremium > 0 ? '+' : ''}${etfPremium.toFixed(2)}%`
                  : <FactValue value={null} emptyLabel="공시 확인" />}
              </strong>
              <p>{metricToneLabel('premium', etfPremium)}</p>
            </div>
            <div className={styles.preTradeCell}>
              <span>총보수</span>
              <strong><FactValue value={etf.fee} /></strong>
              <p>{metricToneLabel('fee', etf.fee)}</p>
            </div>
            <div className={styles.preTradeCell}>
              <span>구성종목</span>
              <strong>{visibleHoldingCount > 0 ? `${visibleHoldingCount}개` : '확인 전'}</strong>
              <p>{visibleHoldingCount > 0 ? '상위 보유 종목 표시' : '비중 확인 필요'}</p>
            </div>
          </div>
          <div className={styles.accountEligibility} aria-label="계좌별 매수 가능 여부">
            {accountEligibility.map(item => (
              <div key={item.key} className={styles.accountEligibilityCell}>
                <span>{item.label}</span>
                <strong className={styles[`account_${item.status}`]}>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className={styles.preTradeActions}>
            <Link href={`/etf/compare?a=${etf.code}`}>
              <FaIcon name="scale-balanced" size={12} />
              비슷한 ETF와 비교
            </Link>
            <Link href="/etf?tab=watch&view=watch">
              <FaIcon name="heart" size={12} />
              관심목록 보기
            </Link>
          </div>
        </section>

        {/* 섹션 앵커 nav — 전체 폭 (사이드 카드와 동선 충돌 방지) */}
        <EtfSectionNav />

        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {/* ──────────── ETF 개요 테이블 (ETF Check 톤) ──────────── */}
            <section className={styles.section} aria-label="상품 정보">
              <div className={styles.sectionHead}>
                <h2>상품 정보</h2>
                <span>운용사·상장일·기초지수</span>
              </div>
              <dl className={styles.overviewTable}>
                <div className={styles.overviewRow}>
                  <dt>운용사</dt>
                  <dd>{etf.issuer}</dd>
                </div>
                {etf.listedAt && (
                  <div className={styles.overviewRow}>
                    <dt>상장일</dt>
                    <dd>{etf.listedAt}</dd>
                  </div>
                )}
                {etf.theme && (
                  <div className={styles.overviewRow}>
                    <dt>기초자산</dt>
                    <dd>{etf.theme}</dd>
                  </div>
                )}
                {etf.trackingIndex && (
                  <div className={styles.overviewRow}>
                    <dt>기초지수</dt>
                    <dd>{etf.trackingIndex}</dd>
                  </div>
                )}
                {liveHoldings?.holdings?.length && (
                  <div className={styles.overviewRow}>
                    <dt>구성종목수</dt>
                    <dd>{liveHoldings.holdings.length}종목</dd>
                  </div>
                )}
                {etf.distribution && (
                  <div className={styles.overviewRow}>
                    <dt>분배</dt>
                    <dd>{etf.distribution}</dd>
                  </div>
                )}
                {etf.hedge && (
                  <div className={styles.overviewRow}>
                    <dt>환헤지</dt>
                    <dd>{etf.hedge}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* ──────────── 거래정보 + 세금 테이블 (ETF Check 패턴) ──────────── */}
            <section className={styles.section} aria-label="거래정보·세금">
              <div className={styles.sectionHead}>
                <h2>거래·세금 요약</h2>
                <span>일반 위탁계좌 기준</span>
              </div>
              <div className={styles.tradeTaxGrid}>
                <div className={styles.tradeTaxCell}>
                  <span>52주 최고</span>
                  <strong>{yearlyRange ? formatWon(yearlyRange.high) : <FactValue value={null} emptyLabel="가격 데이터 부족" />}</strong>
                </div>
                <div className={styles.tradeTaxCell}>
                  <span>52주 최저</span>
                  <strong>{yearlyRange ? formatWon(yearlyRange.low) : <FactValue value={null} emptyLabel="가격 데이터 부족" />}</strong>
                </div>
                <div className={styles.tradeTaxCell}>
                  <span>일일 거래량</span>
                  <strong><FactValue value={etf.volume} /></strong>
                </div>
                {etf.currency && (
                  <div className={styles.tradeTaxCell}>
                    <span>거래통화</span>
                    <strong>{etf.currency}</strong>
                  </div>
                )}
                <div className={styles.tradeTaxCell}>
                  <span>매매차익</span>
                  <strong>{capitalGainsTax}</strong>
                </div>
                <div className={styles.tradeTaxCell}>
                  <span>분배금 세금</span>
                  <strong>15.4%</strong>
                </div>
              </div>
              <p className={styles.taxNote}>
                ISA·연금저축·IRP 계좌는 과세 방식이 달라질 수 있어요.
              </p>
            </section>

            {/* ──────────── ② 비용·리스크: 핵심 지표 + 참고 위험도 ──────────── */}
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
                    : (hasFactValue(etf.fee) ? etf.fee : '공시 확인 필요');
                  const liveYield = liveHoldings?.dividendYield;
                  const distValue = liveYield != null
                    ? `연 ${(liveYield * 100).toFixed(2)}%`
                    : (hasFactValue(etf.distribution) ? etf.distribution : '공시 확인 필요');
                  return (
                    <>
                      <DataCell
                        label="총보수"
                        value={feeValue}
                        sub={liveFee != null
                          ? (liveFee <= 0.001 ? '아주 낮음' : liveFee <= 0.0025 ? '낮은 편' : liveFee <= 0.005 ? '평균권' : '높은 편')
                          : insight.tags.fee?.label || '공식 총보수 미수집'}
                        tone={liveFee != null
                          ? (liveFee <= 0.0025 ? 'good' : liveFee <= 0.005 ? 'default' : 'warn')
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
                        label="환율 영향"
                        value={currencyExposure.label}
                        sub={currencyExposure.sub}
                        tone={insight.tags.hedge?.tone === 'good' ? 'good' : insight.tags.hedge?.tone === 'warn' ? 'warn' : 'default'}
                        help={
                          <>
                            해외 자산 ETF는 환율이 수익률에 함께 반영돼요.
                            <br />
                            <strong>환헤지(H)</strong>는 환율 영향을 줄이고, 국내 자산 ETF는 보통 원화 기준으로 봅니다.
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
                        지수와 기준가격의 차이는 <strong>추적오차</strong>, 시장가격과 기준가격의 차이는
                        <strong> 괴리율</strong>로 나눠 봅니다.
                      </>
                    }
                  />
                </div>
              )}

              {/* 동종 ETF 보수 비교 — 비용·리스크 섹션 내에 배치 */}
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
                <p className={styles.riskOneLiner}>{compactDescription}</p>
                <RiskMeter
                  title="참고 위험도"
                  level={risk.level}
                  label={risk.label}
                  tone={risk.tone}
                  reasons={risk.reasons}
                  points={risk.points}
                />
              </div>
            </section>

            {/* ──────────── ③ 구성종목: 보유 종목 + 섹터 ──────────── */}
            <section id="sec-inside" className={styles.section}>
              <div className={styles.sectionHead}>
                <h2>주요 구성종목</h2>
                <span>상위 보유 종목만 표시</span>
              </div>
              {(() => {
                if (liveHoldings?.holdings?.length) {
                  const topN = liveHoldings.holdings
                    .filter(h => h.weight > 0)
                    .slice(0, 8);
                  if (topN.length === 0) {
                    return (
                      <div className={styles.emptyHoldings}>
                        <FaIcon name="folder-open" size={22} />
                        <p className={styles.emptyHoldingsTitle}>표시할 구성종목 비중이 아직 없어요</p>
                        <p className={styles.emptyHoldingsBody}>
                          실제 비중이 확인된 종목만 이 영역에 보여줄게요.
                        </p>
                      </div>
                    );
                  }

                  const topHolding = topN[0];
                  const topSum = topN.reduce((s, h) => s + h.weight, 0);
                  const maxWeight = Math.max(...topN.map(h => h.weight));
                  const holdingRows = (
                    <div className={styles.holdingList}>
                      {topN.map((h, index) => {
                        const pct = h.weight * 100;
                        const barWidth = maxWeight > 0
                          ? Math.max(7, (h.weight / maxWeight) * 100)
                          : 0;
                        const name = (
                          <span className={styles.holdingNameButton}>{h.name}</span>
                        );
                        return (
                          <div className={styles.holdingRow} key={`${h.symbol || h.name}-${index}`}>
                            <div className={styles.holdingInfo}>
                              {h.symbol ? (
                                <HoldingClickable symbol={h.symbol} displayName={h.name}>
                                  {name}
                                </HoldingClickable>
                              ) : name}
                              <p>{h.symbol || '구성종목'}</p>
                            </div>
                            <div className={styles.holdingBar} aria-hidden="true">
                              <span style={{ width: `${barWidth}%` }} />
                            </div>
                            <b className={styles.holdingPct}>{pct.toFixed(2)}%</b>
                          </div>
                        );
                      })}
                    </div>
                  );
                  const content = (
                    <>
                      <div className={styles.holdingSummaryGrid}>
                        <div>
                          <span>상위 보유</span>
                          <strong>{topHolding?.name || '—'}</strong>
                          <p>{topHolding ? `${(topHolding.weight * 100).toFixed(2)}%` : '—'}</p>
                        </div>
                        <div>
                          <span>Top 5 합계</span>
                          <strong>{`${(topN.slice(0, 5).reduce((s, h) => s + h.weight, 0) * 100).toFixed(1)}%`}</strong>
                          <p>최근 수집 기준</p>
                        </div>
                        <div>
                          <span>표시 범위</span>
                          <strong>상위 {topN.length}개</strong>
                          <p>화면 안에서만 확인</p>
                        </div>
                      </div>
                      {holdingRows}
                    </>
                  );
                  return content;
                }
                return (
                  <div className={styles.emptyHoldings}>
                    <FaIcon name="folder-open" size={22} />
                    <p className={styles.emptyHoldingsTitle}>구성종목 데이터를 아직 불러올 수 없어요</p>
                    <p className={styles.emptyHoldingsBody}>
                      실제 비중이 확인되면 상위 구성종목만 이 화면에 보여줄게요.
                    </p>
                  </div>
                );
              })()}
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

            {/* ④ AI 챗 섹션 제거됨 (재추가 시 EtfChat) */}

            <div id="sec-social" className={styles.sectionAnchor} aria-hidden="true" />

            {/* ──────────── ④ 비교 ETF: 유사·대가·운용사 ──────────── */}
            {/* 유사 ETF (점수 기반: 추종지수/추종국가/카테고리/테마/운용사 매칭) */}
            {similarResults.length > 0 && (
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2>비슷한 ETF</h2>
                  <span>보수·순자산·거래량 비교</span>
                </div>
                <div className={styles.similarGrid}>
                  {similarResults.map(({ etf: item, reasons }) => {
                    const liveItem = similarLiveBySlug.get(item.slug) || item;
                    // 추천 이유 칩 — 기본 reasons + 보수/순자산 비교 강화
                    type Chip = { label: string; good?: boolean };
                    const chips: Chip[] = reasons.map(r => ({ label: r }));
                    const feeBase = parseFloat(String(etf.fee || '').replace(/[^\d.]/g, ''));
                    const feeItem = parseFloat(String(liveItem.fee || item.fee || '').replace(/[^\d.]/g, ''));
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
                    if (aumNum(liveItem.aum) > aumNum(etf.aum) * 1.5) {
                      chips.push({ label: '순자산 더 큼', good: true });
                    }
                    return (
                      <article key={item.slug} className={styles.similarCard}>
                        <div className={styles.similarCardHead}>
                          <div>
                            <a href={etfPath(item.slug)} className={styles.similarTitleLink}>
                              <strong>{item.shortName || item.name}</strong>
                            </a>
                            <span>{liveItem.code}</span>
                          </div>
                          {liveItem.change && (
                            <b className={liveItem.changeTone === 'down' ? styles.down : styles.up}>{liveItem.change}</b>
                          )}
                        </div>
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
                        <dl className={styles.similarMetrics}>
                          <div>
                            <dt>현재가</dt>
                            <dd>{hasFactValue(liveItem.price) ? liveItem.price : '공시 확인'}</dd>
                          </div>
                          <div>
                            <dt>총보수</dt>
                            <dd>{hasFactValue(liveItem.fee) ? liveItem.fee : '공시 확인'}</dd>
                          </div>
                          <div>
                            <dt>순자산</dt>
                            <dd>{hasFactValue(liveItem.aum) ? liveItem.aum : '공시 확인'}</dd>
                          </div>
                          <div>
                            <dt>거래량</dt>
                            <dd>{hasFactValue(liveItem.volume) ? liveItem.volume : '공시 확인'}</dd>
                          </div>
                        </dl>
                        <div className={styles.similarActions}>
                          <a href={etfPath(item.slug)} className={styles.similarDetailLink}>
                            상세
                          </a>
                          <Link href={`/etf/compare?a=${etf.code}&b=${liveItem.code}`} className={styles.similarCompareLink}>
                            비교
                          </Link>
                        </div>
                      </article>
                    );
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
                <Link href={`/etf/compare?a=${etf.code}`} className={`${styles.stickyActBtn} ${styles.stickyActPrimary}`} aria-label="비교">
                  <FaIcon name="scale-balanced" size={14} />
                </Link>
                <Link href="/questions/create" className={styles.stickyActBtn} aria-label="질문하기">
                  <FaIcon name="comment-dots" size={14} />
                </Link>
              </div>
              <div className={styles.sideQuickHead}>
                <span className={styles.sideQuickEyebrow}>
                  핵심 요약
                </span>
                <span className={styles.sideQuickCode}>{etf.code}</span>
              </div>
              <h3 className={styles.sideQuickTitle}>{etf.shortName}</h3>
              <p className={styles.sideQuickOneLiner}>{compactDescription}</p>
              <div className={styles.sideQuickFacts}>
                <div>
                  <span className={styles.factLabel}>
                    총보수
                    <Tooltip label="총보수" title="총보수 (운용보수)" align="left">
                      ETF가 매년 자동으로 떼가는 수수료. <strong>0.5% 이하면 저렴한 편</strong>이에요.
                    </Tooltip>
                  </span>
                  <FactValue value={etf.fee} />
                </div>
                <div>
                  <span className={styles.factLabel}>
                    순자산
                    <Tooltip label="순자산" title="순자산 (AUM)" align="left">
                      이 ETF에 모인 총 자산. <strong>1조원 이상이면 대형</strong>, 100억 미만은 상장폐지 위험이 있어요.
                    </Tooltip>
                  </span>
                  <FactValue value={etf.aum} />
                </div>
                <div>
                  <span className={styles.factLabel}>
                    리스크
                    <Tooltip label="참고 위험도" title="참고 위험도" align="left">
                      변동성·하락 가능성·자산 종류를 종합한 재테크한입 기준 참고 등급이에요. 공식 투자위험등급은 투자설명서를 확인하세요.
                    </Tooltip>
                  </span>
                  <span
                    className={styles.factValue}
                    style={{
                      color: risk.tone === 'good' ? 'var(--rw-green50)' :
                             risk.tone === 'warn' ? 'var(--rw-red60)' : 'var(--rw-text-strong)',
                    }}
                  >
                    참고 {risk.label}
                  </span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    환율 영향
                    <Tooltip label="환율 영향" title="환율 영향" align="left">
                      해외 자산 ETF는 환율에 영향을 받아요. 국내 자산 ETF는 보통 원화 기준으로 비교합니다.
                    </Tooltip>
                  </span>
                  <span className={styles.factValue}>
                    {currencyExposure.label}
                  </span>
                </div>
                <div>
                  <span className={styles.factLabel}>
                    거래량
                    <Tooltip label="거래량" title="일일 거래량" align="left">
                      하루에 거래된 주식 수. <strong>많을수록 사고팔기 쉽고 가격이 안정적</strong>이에요. 너무 적으면 호가 차이가 커져요.
                    </Tooltip>
                  </span>
                  <FactValue value={etf.volume} />
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
                  <FactValue value={etfBaseDate || etf.listedAt} />
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
                  title={`${etf.shortName} 관련 글`}
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
