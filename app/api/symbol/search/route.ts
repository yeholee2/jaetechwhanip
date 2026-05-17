/**
 * 종목/ETF 자동완성 — 포트폴리오 추가 시 사용.
 *
 *   GET /api/symbol/search?q=삼성
 *
 * 소스:
 *   1. 한국어 사전 (instant)
 *   2. Yahoo lookup API (네트워크)
 *
 * 응답: [{ symbol, name, currency, exchange }]
 */
import { NextRequest, NextResponse } from 'next/server';
import { KR_STOCK_DICT, KR_ETF_DICT } from '@/lib/stockDictionary';

export const runtime = 'edge';
export const revalidate = 600;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15';

type Result = { symbol: string; name: string; currency: 'KRW' | 'USD'; exchange?: string; kind?: 'stock' | 'etf' };

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (!q) return NextResponse.json({ results: [] });

  const results: Result[] = [];
  const seen = new Set<string>();

  // 1) 한국어 사전 매칭 (instant)
  const lc = q.toLowerCase();
  for (const s of KR_STOCK_DICT) {
    if (
      s.name.includes(q) ||
      s.code.startsWith(q) ||
      (s.aliases || []).some(a => a.includes(q))
    ) {
      if (!seen.has(s.code)) {
        seen.add(s.code);
        results.push({ symbol: s.code, name: s.name, currency: 'KRW', exchange: 'KRX', kind: 'stock' });
      }
    }
  }
  for (const e of KR_ETF_DICT) {
    if (
      e.name.includes(q) ||
      e.code.startsWith(q) ||
      (e.aliases || []).some(a => a.includes(q))
    ) {
      if (!seen.has(e.code)) {
        seen.add(e.code);
        results.push({ symbol: e.code, name: e.name, currency: 'KRW', exchange: 'KRX', kind: 'etf' });
      }
    }
  }

  // 2) Yahoo lookup (US 종목 + 그 외 — 4글자 이상이고 영문일 때)
  if (q.length >= 1 && /[a-zA-Z]/.test(q) && results.length < 8) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
      const r = await fetch(url, {
        headers: { 'User-Agent': UA },
        next: { revalidate: 600 },
      });
      if (r.ok) {
        const j = await r.json();
        for (const it of j?.quotes || []) {
          if (!it.symbol) continue;
          const sym = String(it.symbol).toUpperCase();
          if (seen.has(sym)) continue;
          // 한국 종목 .KS / .KQ 는 6자리 코드로
          let symbol = sym;
          let currency: 'KRW' | 'USD' = 'USD';
          let exchange: string | undefined = it.exchange;
          if (sym.endsWith('.KS') || sym.endsWith('.KQ')) {
            symbol = sym.replace(/\.K[SQ]$/, '');
            currency = 'KRW';
            exchange = 'KRX';
          }
          if (seen.has(symbol)) continue;
          seen.add(symbol);
          results.push({
            symbol,
            name: it.longname || it.shortname || symbol,
            currency,
            exchange,
            kind: it.quoteType === 'ETF' ? 'etf' : 'stock',
          });
        }
      }
    } catch { /* ignore */ }
  }

  return NextResponse.json({ results: results.slice(0, 15) }, {
    headers: { 'Cache-Control': 'public, s-maxage=600' },
  });
}
