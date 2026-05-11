/**
 * 리포트 자동 수집 소스 (Phase 6-D)
 *
 * 운영 현실:
 * - 증권사 리서치 리포트는 대부분 가입자 한정 → 자동수집 불가, 6-B 어드민 폼으로 큐레이션
 * - 공식 운용사 IR/공지는 RSS가 일부만 공개
 * - DART 공시(open.dart.fss.or.kr)가 가장 안정적인 공식 소스
 *
 * 따라서 자동 수집은 "공식 공시" 위주로 좁히고,
 * 콘텐츠성 리포트는 6-B 어드민 폼이 담당.
 */

import { parseRss, stripHtml, truncateText } from '@/lib/rss';

export type CollectedReport = {
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl: string | null;
  category: string;       // FEED 카테고리 키
  publishedAt: string;    // ISO
  relatedEtfCodes: string[];
};

/**
 * 운용사 공식 RSS — 공개 확인된 곳만 등록.
 * 환경변수 REPORT_SOURCE_RSS 로 추가 URL을 콤마구분으로 받을 수 있음.
 */
const STATIC_RSS_SOURCES: Array<{ name: string; url: string; defaultCategory: string }> = [
  // 현재는 비어둠. 실제 운영에서 확인된 공식 운용사·정부기관 RSS만 추가할 것.
  // 예시 (실제 사용 전 URL 확인 필요):
  // { name: '미래에셋자산운용', url: 'https://www.miraeasset.com/...rss', defaultCategory: '해외주식·ETF' },
];

function dynamicRssSources(): Array<{ name: string; url: string; defaultCategory: string }> {
  const raw = process.env.REPORT_SOURCE_RSS;
  if (!raw) return [];
  return raw.split(',').map(entry => {
    const [name, url, category] = entry.split('|').map(s => s.trim());
    if (!name || !url) return null;
    return { name, url, defaultCategory: category || '재테크입문' };
  }).filter((x): x is { name: string; url: string; defaultCategory: string } => Boolean(x));
}

function classifyCategoryFromText(text: string, fallback: string): string {
  if (/(QQQ|VOO|SPY|나스닥|S&P|미국주식|해외주식)/i.test(text)) return '해외주식·ETF';
  if (/(ETF|KODEX|TIGER|코스피|코스닥|국내주식|배당)/.test(text)) return '국내주식·ETF';
  if (/(절세|세금|연말정산|양도세|ISA|연금저축|IRP)/i.test(text)) return '절세';
  if (/(보험|실손|연금보험|종신|암보험)/.test(text)) return '보험';
  if (/(대출|부채|금리|주담대|신용대출|전세대출)/.test(text)) return '대출·부채';
  return fallback;
}

/** RSS 소스 수집. 실패는 소스 단위로 무시. */
export async function fetchRssReports(): Promise<CollectedReport[]> {
  const all = [...STATIC_RSS_SOURCES, ...dynamicRssSources()];
  if (all.length === 0) return [];

  const results = await Promise.allSettled(
    all.map(async source => {
      const res = await fetch(source.url, {
        headers: { accept: 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 0 }, // cron 직접 호출이므로 캐시 무시
      });
      if (!res.ok) return [];
      const xml = await res.text();
      const entries = parseRss(xml, 30);
      return entries.map(entry => ({
        source: source.name,
        title: entry.title,
        summary: truncateText(stripHtml(entry.description || entry.contentHtml), 220),
        url: entry.link,
        thumbnailUrl: entry.thumbnailUrl,
        category: classifyCategoryFromText(`${entry.title} ${entry.description}`, source.defaultCategory),
        publishedAt: entry.publishedAt,
        relatedEtfCodes: [],
      } as CollectedReport));
    }),
  );

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

/**
 * DART 공시 API (open.dart.fss.or.kr).
 * https://opendart.fss.or.kr/api/list.json
 *
 * 환경변수:
 *   DART_API_KEY        — DART에서 발급받은 인증키
 *   DART_CORP_CODES     — 콤마구분 운용사 corp_code (예: 미래에셋자산운용 ...)
 *                         값 없으면 운용사 전체로는 너무 많아서 빈 결과 반환.
 *
 * 키 없으면 빈 배열 (안전 fallback).
 */
export async function fetchDartReports(): Promise<CollectedReport[]> {
  const key = process.env.DART_API_KEY;
  const corpCodes = (process.env.DART_CORP_CODES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!key || corpCodes.length === 0) return [];

  const today = new Date();
  const fromDate = new Date(today.getTime() - 1000 * 60 * 60 * 24 * 14); // 최근 14일
  const formatDate = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '');

  const results = await Promise.allSettled(
    corpCodes.map(async corpCode => {
      const params = new URLSearchParams({
        crtfc_key: key,
        corp_code: corpCode,
        bgn_de: formatDate(fromDate),
        end_de: formatDate(today),
        page_count: '20',
      });
      const res = await fetch(`https://opendart.fss.or.kr/api/list.json?${params.toString()}`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) return [];
      const data: any = await res.json();
      if (data.status !== '000' || !Array.isArray(data.list)) return [];

      return data.list.map((row: any): CollectedReport => ({
        source: row.corp_name || 'DART',
        title: row.report_nm || '',
        summary: `${row.corp_name} ${row.report_nm} (DART 공시)`,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${row.rcept_no}`,
        thumbnailUrl: null,
        category: classifyCategoryFromText(row.report_nm || '', '재테크입문'),
        publishedAt: new Date(
          `${row.rcept_dt.slice(0, 4)}-${row.rcept_dt.slice(4, 6)}-${row.rcept_dt.slice(6, 8)}T09:00:00+09:00`,
        ).toISOString(),
        relatedEtfCodes: [],
      }));
    }),
  );

  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
}

/** 모든 소스 통합. */
export async function collectAllReports(): Promise<CollectedReport[]> {
  const [rss, dart] = await Promise.all([fetchRssReports(), fetchDartReports()]);
  return [...rss, ...dart];
}
