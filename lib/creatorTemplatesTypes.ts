/**
 * 글 템플릿 타입/라벨 — 클라이언트·서버 양쪽 안전.
 * server-only fetch 는 lib/creatorTemplates.ts.
 */

export type TemplateKind =
  | 'stock_analysis'
  | 'etf_review'
  | 'market_recap'
  | 'portfolio'
  | 'backtest'
  | 'custom';

export type PostTemplate = {
  id: string;
  creator_id: string | null;
  kind: TemplateKind;
  name: string;
  description: string | null;
  emoji: string | null;
  body_html: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export const KIND_LABELS: Record<TemplateKind, string> = {
  stock_analysis: '종목 분석',
  etf_review: 'ETF 리뷰',
  market_recap: '시황',
  portfolio: '포트폴리오',
  backtest: '백테스트',
  custom: '커스텀',
};
