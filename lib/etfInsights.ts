/**
 * ETF 자동 한줄평·태그 생성 (rule-based).
 *
 * AI를 호출하지 않고도 룰 기반으로 "이 ETF가 좋은 편/평균/주의" 한 줄을 만든다.
 * 추후 ANTHROPIC_API_KEY가 있으면 generate via /api/etf/chat 으로 확장 가능.
 */

import type { EtfInfo } from '@/lib/etfs';

export type EtfTag = {
  label: string;
  tone: 'good' | 'neutral' | 'warn';
};

export type EtfInsight = {
  /** 페이지 hero 한 줄 — 가장 강한 시그널 */
  oneLiner: string;
  /** 사실별 작은 태그 (보수/분배/환헤지/순자산 옆에 붙임) */
  tags: {
    fee?: EtfTag;
    distribution?: EtfTag;
    hedge?: EtfTag;
    aum?: EtfTag;
  };
};

function parseFeePercent(fee: string): number {
  const m = fee.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseAumWon(aum: string): number {
  // "1조 2,345억" → 1_234_500_000_000 같은 환산
  const txt = aum.replace(/,/g, '');
  let total = 0;
  const trillion = txt.match(/(\d+(?:\.\d+)?)\s*조/);
  if (trillion) total += parseFloat(trillion[1]) * 1_000_000_000_000;
  const hundredMillion = txt.match(/(\d+(?:\.\d+)?)\s*억/);
  if (hundredMillion) total += parseFloat(hundredMillion[1]) * 100_000_000;
  return total;
}

function feeTag(fee: string): EtfTag {
  const pct = parseFeePercent(fee);
  if (!pct) return { label: '공시 확인 필요', tone: 'neutral' };
  if (pct <= 0.1) return { label: '아주 낮음', tone: 'good' };
  if (pct <= 0.25) return { label: '낮은 편', tone: 'good' };
  if (pct <= 0.5) return { label: '평균', tone: 'neutral' };
  if (pct <= 0.8) return { label: '높은 편', tone: 'warn' };
  return { label: '꽤 높음', tone: 'warn' };
}

function distributionTag(distribution: string): EtfTag {
  const d = distribution || '';
  if (/월/.test(d)) return { label: '월 분배', tone: 'good' };
  if (/분기/.test(d)) return { label: '분기 분배', tone: 'neutral' };
  if (/반기|연/.test(d)) return { label: '반기/연 분배', tone: 'neutral' };
  if (/없|미실시|TR/i.test(d)) return { label: 'TR (재투자)', tone: 'neutral' };
  return { label: d, tone: 'neutral' };
}

function hedgeTag(hedge: string): EtfTag {
  const h = hedge || '';
  if (/언헤지|미.*헤지|H 없음|no hedge/i.test(h)) return { label: '환 노출', tone: 'warn' };
  if (/헤지|H/i.test(h)) return { label: '환헤지', tone: 'neutral' };
  if (/원화|국내/.test(h)) return { label: '원화 자산', tone: 'neutral' };
  return { label: h, tone: 'neutral' };
}

function aumTag(aum: string): EtfTag {
  const won = parseAumWon(aum);
  if (won === 0) return { label: '공시 확인 필요', tone: 'neutral' };
  if (won >= 1_000_000_000_000) return { label: '대형 (1조+)', tone: 'good' };
  if (won >= 300_000_000_000) return { label: '중대형', tone: 'good' };
  if (won >= 100_000_000_000) return { label: '중형', tone: 'neutral' };
  if (won >= 30_000_000_000) return { label: '소형', tone: 'neutral' };
  return { label: '아주 작음', tone: 'warn' };
}

function buildOneLiner(
  etf: EtfInfo,
  fee: EtfTag,
  dist: EtfTag,
  hedge: EtfTag,
  aum: EtfTag,
): string {
  const missingFee = fee.label === '공시 확인 필요';
  const missingAum = aum.label === '공시 확인 필요';
  if (missingFee || missingAum) {
    const target = etf.theme ? `${etf.theme} 테마` : (etf.category || '해당 자산');
    return `${target}에 투자하는 ETF예요. 비용·유동성 지표는 공식 공시 기준으로 함께 확인하세요.`;
  }

  // 1) 강한 긍정 — 보수 낮음 + 대형
  if (fee.tone === 'good' && aum.tone === 'good') {
    if (dist.label === '월 분배') {
      return `보수가 낮고 매월 분배까지 들어오는 안정형 ETF예요.`;
    }
    return `보수가 낮고 순자산도 큰 편이라 장기 보유 부담이 적어요.`;
  }
  // 2) 환 위험 강조
  if (hedge.tone === 'warn') {
    return `환 노출 상품이라 달러 강세·약세에 따라 손익이 추가로 흔들릴 수 있어요.`;
  }
  // 3) 작은 규모 주의
  if (aum.tone === 'warn') {
    return `순자산이 작은 편이라 유동성·상장폐지 리스크를 같이 살펴보는 게 좋아요.`;
  }
  // 4) 보수 높음
  if (fee.tone === 'warn') {
    return `총보수가 높은 편이라 장기 보유 시 비용 부담이 누적될 수 있어요.`;
  }
  // 5) 기본 — 분배 톤 강조
  if (dist.label === '월 분배') {
    return `매월 분배금이 들어와 현금흐름을 만들고 싶은 분께 잘 맞아요.`;
  }
  // 6) 평이한 구조
  return `${etf.category} 안에서 보수·순자산을 함께 비교해볼 만한 ETF예요.`;
}

/**
 * 같은 카테고리 ETF 중 보수 분포 (min/avg/max) 계산.
 * 한 ETF 가 카테고리 내에서 어느 위치인지 비교용.
 */
export function computeFeeStats(currentEtf: EtfInfo, allEtfs: EtfInfo[]) {
  const current = parseFeePercent(currentEtf.fee);
  if (current <= 0) return null;
  const peers = allEtfs.filter(
    e => e.category === currentEtf.category && e.fee && parseFeePercent(e.fee) > 0,
  );
  const fees = peers.map(e => parseFeePercent(e.fee)).filter(n => n > 0);
  if (fees.length < 2) return null;
  const min = Math.min(...fees);
  const max = Math.max(...fees);
  const avg = fees.reduce((a, b) => a + b, 0) / fees.length;
  return {
    current,
    min,
    max,
    avg,
    peerCount: fees.length,
  };
}

export function buildEtfInsight(etf: EtfInfo): EtfInsight {
  const fee = feeTag(etf.fee);
  const dist = distributionTag(etf.distribution);
  const hedge = hedgeTag(etf.hedge);
  const aum = aumTag(etf.aum);

  return {
    oneLiner: buildOneLiner(etf, fee, dist, hedge, aum),
    tags: { fee, distribution: dist, hedge, aum },
  };
}
