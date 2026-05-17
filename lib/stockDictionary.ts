/**
 * 한국 종목명 ↔ 코드 사전 — 본문 자동 인덱싱 용.
 *
 * 시드 데이터는 시총 상위 + 인기 종목 위주.
 * 더 큰 사전이 필요하면 KRX 상장종목 전체를 Supabase 테이블로 옮기면 됨.
 */

export const KR_STOCK_DICT: Array<{ name: string; aliases?: string[]; code: string }> = [
  { name: '삼성전자', code: '005930' },
  { name: 'SK하이닉스', aliases: ['하이닉스'], code: '000660' },
  { name: 'LG에너지솔루션', aliases: ['LG엔솔', '엘지엔솔'], code: '373220' },
  { name: '삼성바이오로직스', aliases: ['삼성바이오'], code: '207940' },
  { name: '현대차', aliases: ['현대자동차'], code: '005380' },
  { name: '기아', code: '000270' },
  { name: 'NAVER', aliases: ['네이버'], code: '035420' },
  { name: '카카오', code: '035720' },
  { name: 'POSCO홀딩스', aliases: ['포스코홀딩스', '포스코'], code: '005490' },
  { name: 'LG화학', code: '051910' },
  { name: '셀트리온', code: '068270' },
  { name: '삼성SDI', code: '006400' },
  { name: '현대모비스', code: '012330' },
  { name: 'KB금융', code: '105560' },
  { name: '신한지주', code: '055550' },
  { name: '하나금융지주', code: '086790' },
  { name: '메리츠금융지주', code: '138040' },
  { name: 'HD현대중공업', code: '329180' },
  { name: '한화에어로스페이스', aliases: ['한화에어로'], code: '012450' },
  { name: '한화오션', code: '042660' },
  { name: '두산에너빌리티', aliases: ['두산에너지빌리티'], code: '034020' },
  { name: 'KT&G', code: '033780' },
  { name: '에코프로비엠', code: '247540' },
  { name: '에코프로', code: '086520' },
  { name: '포스코퓨처엠', code: '003670' },
  { name: '엔켐', code: '348370' },
  { name: '리노공업', code: '058470' },
  { name: '알테오젠', code: '196170' },
  { name: 'HLB', code: '028300' },
  { name: '유한양행', code: '000100' },
  { name: '삼성생명', code: '032830' },
  { name: '삼성화재', code: '000810' },
  { name: '삼성에스디에스', aliases: ['삼성SDS'], code: '018260' },
  { name: '크래프톤', code: '259960' },
  { name: '엔씨소프트', code: '036570' },
  { name: '넷마블', code: '251270' },
  { name: '카카오뱅크', code: '323410' },
  { name: '카카오페이', code: '377300' },
  { name: '두산밥캣', code: '241560' },
  { name: '한진칼', code: '180640' },
  { name: '대한항공', code: '003490' },
  { name: 'CJ제일제당', code: '097950' },
  { name: '아모레퍼시픽', code: '090430' },
  { name: 'LG전자', code: '066570' },
  { name: 'LG디스플레이', code: '034220' },
  { name: 'LG이노텍', code: '011070' },
];

export const KR_ETF_DICT: Array<{ name: string; aliases?: string[]; code: string }> = [
  { name: 'KODEX 200', aliases: ['코덱스 200', '코덱스200'], code: '069500' },
  { name: 'KODEX 코스닥150', code: '229200' },
  { name: 'KODEX 미국S&P500', aliases: ['코덱스 미국S&P500'], code: '379800' },
  { name: 'TIGER 미국S&P500', code: '360750' },
  { name: 'TIGER 미국나스닥100', code: '133690' },
  { name: 'TIGER 미국필라델피아반도체나스닥', aliases: ['TIGER 미국반도체'], code: '381180' },
  { name: 'TIGER 2차전지테마', code: '305540' },
  { name: 'ACE 미국S&P500', code: '360200' },
  { name: 'KODEX 2차전지산업', code: '305720' },
  { name: 'KODEX 미국나스닥100', code: '133690' },
];

type DictEntry = { name: string; aliases?: string[]; code: string; kind: 'stock' | 'etf' };

let _searchIndex: { needle: string; entry: DictEntry }[] | null = null;
function getSearchIndex() {
  if (_searchIndex) return _searchIndex;
  const out: { needle: string; entry: DictEntry }[] = [];
  for (const s of KR_STOCK_DICT) {
    out.push({ needle: s.name, entry: { ...s, kind: 'stock' } });
    for (const a of s.aliases || []) out.push({ needle: a, entry: { ...s, kind: 'stock' } });
  }
  for (const e of KR_ETF_DICT) {
    out.push({ needle: e.name, entry: { ...e, kind: 'etf' } });
    for (const a of e.aliases || []) out.push({ needle: a, entry: { ...e, kind: 'etf' } });
  }
  // 긴 needle 먼저 매칭 (현대자동차 > 현대차 충돌 방지)
  out.sort((a, b) => b.needle.length - a.needle.length);
  _searchIndex = out;
  return out;
}

export function findStocksByName(text: string): Array<{ code: string; kind: 'stock' | 'etf'; count: number }> {
  const idx = getSearchIndex();
  const counts = new Map<string, { code: string; kind: 'stock' | 'etf'; count: number }>();
  const consumed = new Array(text.length).fill(false);

  for (const { needle, entry } of idx) {
    if (needle.length < 2) continue;
    let start = 0;
    while (true) {
      const i = text.indexOf(needle, start);
      if (i === -1) break;
      // 이미 더 긴 매칭에 먹힌 자리면 스킵
      let blocked = false;
      for (let k = i; k < i + needle.length; k++) if (consumed[k]) { blocked = true; break; }
      if (!blocked) {
        for (let k = i; k < i + needle.length; k++) consumed[k] = true;
        const cur = counts.get(entry.code) || { code: entry.code, kind: entry.kind, count: 0 };
        cur.count++;
        counts.set(entry.code, cur);
      }
      start = i + needle.length;
    }
  }
  return Array.from(counts.values());
}
