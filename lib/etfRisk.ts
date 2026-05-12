/**
 * ETF 위험 등급 + 투자 포인트 (rule-based).
 *
 * 보수/순자산/환헤지/카테고리 키워드로 1~5 단계 위험도와
 * 토스 스타일 "투자 포인트" 불릿을 생성한다.
 */

import type { EtfInfo } from '@/lib/etfs';

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export type EtfRisk = {
  level: RiskLevel;
  label: string;          // '낮음' / '다소 낮음' / '보통' / '다소 높음' / '높음'
  tone: 'good' | 'neutral' | 'warn';
  reasons: string[];      // 등급을 결정한 이유 1~3개
  points: {
    text: string;
    tone: 'good' | 'neutral' | 'warn';
  }[];
};

function feePct(fee: string): number {
  const m = fee.replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

function aumWon(aum: string): number {
  const t = aum.replace(/,/g, '');
  let total = 0;
  const tri = t.match(/(\d+(?:\.\d+)?)\s*조/);
  if (tri) total += parseFloat(tri[1]) * 1e12;
  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) total += parseFloat(eok[1]) * 1e8;
  return total;
}

const HIGH_RISK_KEYWORDS = /레버리지|인버스|2X|3X|곱버스|커버드콜|선물|원유|천연가스|니켈|코코아|비트코인|이더리움|가상자산/;
const MID_RISK_KEYWORDS = /신흥국|중국|인도|베트남|메타버스|AI|반도체|2차전지|전기차|바이오|로봇|클라우드/;
const LOW_RISK_KEYWORDS = /국고채|단기채|MMF|머니마켓|배당주|배당성장|S&P500|나스닥100|코스피200|TR/;

export function buildEtfRisk(etf: EtfInfo): EtfRisk {
  const reasons: string[] = [];
  let score = 0; // 음수 = 안전, 양수 = 위험

  // 1) 카테고리/이름 키워드
  const probe = `${etf.name} ${etf.theme} ${etf.category} ${etf.tags.join(' ')}`;
  if (HIGH_RISK_KEYWORDS.test(probe)) {
    score += 2;
    reasons.push('레버리지·파생·원자재 계열');
  } else if (MID_RISK_KEYWORDS.test(probe)) {
    score += 1;
    reasons.push('테마·신흥시장 익스포저');
  } else if (LOW_RISK_KEYWORDS.test(probe)) {
    score -= 1;
    reasons.push('대표지수·채권 등 코어 자산');
  }

  // 2) 환헤지 여부
  if (/언헤지|미.*헤지|no hedge/i.test(etf.hedge || '')) {
    score += 0.5;
    reasons.push('환 노출 (달러 변동 영향)');
  }

  // 3) 순자산 — 작을수록 위험 ↑
  const won = aumWon(etf.aum);
  if (won > 0 && won < 30_000_000_000) {
    score += 1;
    reasons.push('순자산 소형 (유동성 주의)');
  } else if (won >= 1_000_000_000_000) {
    score -= 0.5;
    reasons.push('순자산 1조+ 대형');
  }

  // 4) 보수 — 직접 위험은 아니지만 누적 비용
  const pct = feePct(etf.fee);
  if (pct > 0.8) {
    score += 0.5;
  }

  // -> 5단계로 분류
  let level: RiskLevel;
  if (score <= -1) level = 1;
  else if (score < 0.5) level = 2;
  else if (score < 1.5) level = 3;
  else if (score < 2.5) level = 4;
  else level = 5;

  const labels: Record<RiskLevel, string> = {
    1: '낮음',
    2: '다소 낮음',
    3: '보통',
    4: '다소 높음',
    5: '높음',
  };
  const tones: Record<RiskLevel, 'good' | 'neutral' | 'warn'> = {
    1: 'good',
    2: 'good',
    3: 'neutral',
    4: 'warn',
    5: 'warn',
  };

  // 투자 포인트 불릿 (good/warn/neutral 섞어서)
  const points: EtfRisk['points'] = [];

  if (pct > 0 && pct <= 0.25) {
    points.push({ text: `총보수 ${etf.fee} — 장기 보유에 유리해요.`, tone: 'good' });
  } else if (pct > 0.5) {
    points.push({ text: `총보수 ${etf.fee} — 장기 누적 비용 부담을 체크하세요.`, tone: 'warn' });
  }

  if (won >= 1_000_000_000_000) {
    points.push({ text: `순자산 ${etf.aum} — 대형 ETF로 유동성이 풍부해요.`, tone: 'good' });
  } else if (won > 0 && won < 30_000_000_000) {
    points.push({ text: `순자산 ${etf.aum} — 소형이라 상장폐지·호가공백 리스크가 있어요.`, tone: 'warn' });
  }

  if (/월/.test(etf.distribution)) {
    points.push({ text: '매월 분배금 — 현금흐름을 만드는 데 적합해요.', tone: 'good' });
  } else if (/TR|없|미실시/i.test(etf.distribution)) {
    points.push({ text: 'TR(재투자) 구조 — 세후 복리 측면에서 유리할 수 있어요.', tone: 'neutral' });
  }

  if (/언헤지|미.*헤지/i.test(etf.hedge || '')) {
    points.push({ text: '환 노출 상품 — 달러 강·약세가 손익에 함께 반영돼요.', tone: 'warn' });
  }

  if (HIGH_RISK_KEYWORDS.test(probe)) {
    points.push({ text: '레버리지·파생 계열 — 단기 트레이딩용에 적합, 장기 보유 시 변동성 누적 위험.', tone: 'warn' });
  }

  // 최소 1개는 보장
  if (points.length === 0) {
    points.push({ text: `${etf.category} 카테고리에서 평이한 구조의 ETF예요.`, tone: 'neutral' });
  }

  return {
    level,
    label: labels[level],
    tone: tones[level],
    reasons: reasons.slice(0, 3),
    points: points.slice(0, 4),
  };
}
