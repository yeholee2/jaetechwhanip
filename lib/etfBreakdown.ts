/**
 * ETF 종목 리스트에서 섹터 비중 추출 (rule-based).
 * Toss / FunETF 패턴의 도넛 차트 데이터 생성.
 *
 * Holdings.note 에 보통 섹터·국가 힌트가 들어가 있어 키워드 매칭.
 * 매칭 실패 시 '기타' 로 분류. 추후 KOFIA·KRX 정식 분류 데이터로 대체.
 */

import type { EtfHolding } from '@/lib/etfs';

const SECTOR_RULES: Array<{ keys: string[]; label: string }> = [
  { keys: ['반도체', '메모리', 'TSMC', '엔비디아', 'NVIDIA', '인텔', 'Intel', 'AMD'], label: '반도체' },
  { keys: ['AI', '인공지능', '오픈AI', '마이크로소프트', 'Microsoft', 'Google', '구글', '알파벳'], label: 'AI/소프트웨어' },
  { keys: ['전기차', '테슬라', 'Tesla', '2차전지', '리튬', 'LG에너지', 'CATL'], label: '전기차/2차전지' },
  { keys: ['바이오', '제약', '존슨', 'Johnson', '화이자', 'Pfizer', '머크', '셀트리온'], label: '바이오/헬스케어' },
  { keys: ['금융', '은행', 'JP모건', 'JPMorgan', '뱅크', 'Bank', 'KB금융', '신한지주'], label: '금융' },
  { keys: ['소비재', '아마존', 'Amazon', '월마트', 'Walmart', '나이키', 'Nike', '맥도날드'], label: '소비재' },
  { keys: ['에너지', '엑손', 'Exxon', '쉐브론', 'Chevron', 'SK이노베이션', '석유'], label: '에너지' },
  { keys: ['리츠', 'REIT', '부동산', '프로로지스'], label: '부동산/리츠' },
  { keys: ['커뮤니케이션', '메타', 'Meta', '디즈니', 'Disney', '넷플릭스', 'Netflix', '버라이즌'], label: '커뮤니케이션' },
  { keys: ['산업재', '보잉', 'Boeing', '캐터필러', 'Caterpillar', '록히드', 'Lockheed', '현대중공업'], label: '산업재' },
  { keys: ['소재', '듀폰', 'DuPont', '다우', 'Dow', 'POSCO', '포스코'], label: '소재' },
  { keys: ['유틸리티', '한국전력', 'NextEra', '듀크', 'Duke'], label: '유틸리티' },
];

function classifyHolding(holding: EtfHolding): string {
  const text = `${holding.name} ${holding.note || ''}`;
  for (const rule of SECTOR_RULES) {
    if (rule.keys.some(k => text.toLowerCase().includes(k.toLowerCase()))) {
      return rule.label;
    }
  }
  return '기타';
}

function parsePct(weight: string): number {
  const m = String(weight).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

export type SectorBreakdown = { label: string; value: number }[];

/** 섹터별 비중 합산 (큰 순) */
export function buildSectorBreakdown(holdings: EtfHolding[]): SectorBreakdown {
  if (!holdings || holdings.length === 0) return [];
  const sectorMap = new Map<string, number>();
  let totalAccounted = 0;

  for (const h of holdings) {
    const sector = classifyHolding(h);
    const pct = parsePct(h.weight);
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + pct);
    totalAccounted += pct;
  }

  // 나머지 (10대 종목 외 — 100% 채우기)
  if (totalAccounted > 0 && totalAccounted < 100) {
    const remainder = Math.max(0, 100 - totalAccounted);
    if (remainder > 0.5) {
      sectorMap.set('기타 (10위 외)', (sectorMap.get('기타 (10위 외)') || 0) + remainder);
    }
  }

  return Array.from(sectorMap.entries())
    .map(([label, value]) => ({ label, value: Math.round(value * 10) / 10 }))
    .sort((a, b) => b.value - a.value);
}
