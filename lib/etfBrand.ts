/**
 * ETF 운용사 브랜드 매핑 — 색상 원형 + 약자 (도미노/RW 스타일).
 * 한국 ETF 주요 운용사 8개 + fallback.
 */

export type EtfBrand = {
  letter: string;
  bg: string;
  color: string;
};

const BRANDS: Array<{ match: string; brand: EtfBrand }> = [
  { match: 'KODEX', brand: { letter: 'K', bg: '#0066b3', color: '#fff' } },      // 삼성자산운용 파랑
  { match: 'TIGER', brand: { letter: 'T', bg: '#ff7a00', color: '#fff' } },      // 미래에셋 오렌지
  { match: 'ACE', brand: { letter: 'A', bg: '#00a698', color: '#fff' } },        // 한국투자신탁운용 청록
  { match: 'ARIRANG', brand: { letter: 'A', bg: '#7c3aed', color: '#fff' } },    // 한화자산운용 보라
  { match: 'RISE', brand: { letter: 'R', bg: '#ec4899', color: '#fff' } },       // KB자산운용 핑크
  { match: 'SOL', brand: { letter: 'S', bg: '#facc15', color: '#1f2937' } },     // 신한자산운용 옐로
  { match: 'HANARO', brand: { letter: 'H', bg: '#10b981', color: '#fff' } },     // NH아문디 그린
  { match: 'TIMEFOLIO', brand: { letter: 'T', bg: '#6366f1', color: '#fff' } },  // 타임폴리오 인디고
  { match: 'KOSEF', brand: { letter: 'K', bg: '#0ea5e9', color: '#fff' } },      // 키움 스카이블루
  { match: 'PLUS', brand: { letter: 'P', bg: '#dc2626', color: '#fff' } },       // 메리츠 레드
];

const FALLBACK: EtfBrand = { letter: 'E', bg: '#94a3b8', color: '#fff' };

/** ETF 이름에서 운용사 브랜드 정보 추출. */
export function getEtfBrand(name: string): EtfBrand {
  if (!name) return FALLBACK;
  for (const { match, brand } of BRANDS) {
    if (name.toUpperCase().includes(match)) return brand;
  }
  return FALLBACK;
}
