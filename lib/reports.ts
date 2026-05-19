/**
 * 증권사·운용사 리포트 큐레이션 (Phase 6)
 * Supabase `public.reports` 테이블에서 fetch. 미적용/실패 시 sample fallback.
 */

export type ReportItem = {
  id: string;
  source: string;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl?: string | null;
  category: string;
  publishedAt: string;
  relatedEtfCodes: string[];
  clickCount?: number;
};

/**
 * 샘플 리포트 (DB 미적용/빈 상태 fallback). 실제 운영에선 reports 테이블에서 fetch.
 */
export const sampleReports: ReportItem[] = [
  {
    id: 'sample-report-1',
    source: '미래에셋자산운용',
    title: 'TIGER 미국S&P500 — 2026년 1분기 운용 현황',
    summary: 'S&P500 지수 추종 ETF의 기초자산 구성 변화, 분배금 추이, 환헤지 미반영 환차익 영향을 정리했어요.',
    url: 'https://www.miraeasset.com/insights/sample-tiger-sp500-q1',
    thumbnailUrl: null,
    category: '해외주식·ETF',
    publishedAt: '2026-05-06T09:00:00+09:00',
    relatedEtfCodes: ['360750'],
  },
  {
    id: 'sample-report-2',
    source: '한국투자증권',
    title: '월배당 ETF 시리즈 비교: 분배율과 NAV 괴리 점검',
    summary: '국내 상장된 월배당 ETF 12종의 12개월 분배율, NAV 괴리율, 추적오차를 한 표로 비교했어요.',
    url: 'https://www.truefriend.com/research/sample-monthly-dividend-etf',
    thumbnailUrl: null,
    category: '국내주식·ETF',
    publishedAt: '2026-05-05T15:30:00+09:00',
    relatedEtfCodes: ['458730', '466920'],
  },
  {
    id: 'sample-report-3',
    source: '삼성증권',
    title: '연금저축 ETF 포트폴리오 — 2026년 디폴트 옵션 가이드',
    summary: '연금저축계좌에서 매수 가능한 ETF 중 위험·수익 프로파일별 모델 포트폴리오 3종을 제안해요.',
    url: 'https://www.samsungpop.com/research/sample-pension-etf-2026',
    thumbnailUrl: null,
    category: '절세',
    publishedAt: '2026-05-04T11:00:00+09:00',
    relatedEtfCodes: [],
  },
];

/**
 * Supabase에서 최근 리포트 fetch. 테이블 미적용/실패 시 빈 배열 반환.
 */
export async function fetchRecentReports(limit = 20): Promise<ReportItem[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];
    const res = await fetch(
      `${url}/rest/v1/reports?select=id,source,title,summary,url,thumbnail_url,category,published_at,related_etf_codes,click_count&deleted_at=is.null&order=published_at.desc&limit=${limit}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        next: { revalidate: 600 },
        signal: AbortSignal.timeout(1000),
      },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map((row: any) => ({
      id: row.id,
      source: row.source || '리포트',
      title: row.title || '',
      summary: row.summary || '',
      url: row.url,
      thumbnailUrl: row.thumbnail_url || null,
      category: row.category || '재테크입문',
      publishedAt: row.published_at,
      relatedEtfCodes: Array.isArray(row.related_etf_codes) ? row.related_etf_codes : [],
      clickCount: Number(row.click_count || 0),
    }));
  } catch {
    return [];
  }
}

/**
 * 운영 데이터가 없을 때를 위해 샘플로 채워주는 헬퍼.
 * 실제 DB에서 데이터가 들어오면 sample은 자동으로 빠짐.
 */
export async function fetchRecentReportsWithFallback(limit = 20): Promise<ReportItem[]> {
  const live = await fetchRecentReports(limit);
  if (live.length > 0) return live;
  return sampleReports.slice(0, limit);
}
