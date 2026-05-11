/**
 * ETF v2 — AI 요약 캐시 helpers
 * docs/etf-portfolio-spec.md §5, migration_etf_v2.sql 참조.
 *
 * 캐시 정책: 24h TTL. 만료 시 새로 호출.
 * 실제 OpenAI 호출은 server route (`app/api/ai/*`)에서 처리.
 * 본 모듈은 캐시 조회/저장만 담당 (브라우저/서버 양쪽).
 */
import { createClient as createBrowserClient, hasSupabase } from '@/lib/supabase/client';

export type AISummaryType = 'overview' | 'risk' | 'outlook' | 'market_brief';

export type AIEtfSummary = {
  id: string;
  etf_code: string;
  summary_type: AISummaryType;
  content: string;
  source_data?: any;
  generated_at: string;
  expires_at: string;
  created_by_model: string;
};

const TABLE = 'ai_etf_summaries';
const MARKET_BRIEF_CODE = '__market__'; // 시장 동향은 etf_code='__market__' 로 저장

/** 캐시에서 요약 조회. expires_at 지났으면 null. */
export async function getCachedSummary(
  etfCode: string,
  type: AISummaryType,
): Promise<AIEtfSummary | null> {
  if (!hasSupabase()) return null;
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from(TABLE)
    .select('*')
    .eq('etf_code', etfCode)
    .eq('summary_type', type)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return (data as AIEtfSummary) || null;
}

/** ETF별 3섹션 요약 일괄 조회. */
export async function getEtfFullSummary(etfCode: string): Promise<{
  overview: AIEtfSummary | null;
  risk: AIEtfSummary | null;
  outlook: AIEtfSummary | null;
}> {
  const [overview, risk, outlook] = await Promise.all([
    getCachedSummary(etfCode, 'overview'),
    getCachedSummary(etfCode, 'risk'),
    getCachedSummary(etfCode, 'outlook'),
  ]);
  return { overview, risk, outlook };
}

/** 시장 동향 (브리프) 캐시 조회. */
export async function getMarketBrief(): Promise<AIEtfSummary | null> {
  return getCachedSummary(MARKET_BRIEF_CODE, 'market_brief');
}

/** 만료까지 남은 시간 (시/분, UI 표시용). */
export function describeFreshness(summary: AIEtfSummary): string {
  const generated = new Date(summary.generated_at);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - generated.getTime()) / 60000);
  if (diffMin < 60) return `${diffMin}분 전 생성`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전 생성`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}일 전 생성`;
}

export { MARKET_BRIEF_CODE };
