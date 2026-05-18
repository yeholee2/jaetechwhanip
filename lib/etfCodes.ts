import type { EtfInfo } from '@/lib/etfs';

export type EtfCodeInput = Pick<EtfInfo, 'code' | 'name' | 'slug'>;

const KNOWN_ALPHA_CODE_FIXES: { pattern: RegExp; code: string }[] = [
  {
    pattern: /ace.*k.*휴머노이드.*로봇.*top2/i,
    code: '0177X0',
  },
];

export function normalizeEtfCode(value: string | null | undefined) {
  return (value || '').trim().toUpperCase();
}

export function isKrEtfCode(value: string | null | undefined) {
  return /^[0-9A-Z]{6}$/.test(normalizeEtfCode(value));
}

export function resolveEtfMarketCode(etf: EtfCodeInput) {
  const current = normalizeEtfCode(etf.code);
  if (current && !/^[0-9]{6}$/.test(current)) return current;

  const haystack = `${etf.name || ''} ${decodeURIComponent(etf.slug || '')}`.toLowerCase();
  const hit = KNOWN_ALPHA_CODE_FIXES.find(item => item.pattern.test(haystack));
  return hit?.code || current;
}

export function applyResolvedEtfCode<T extends EtfCodeInput>(etf: T): T {
  const resolved = resolveEtfMarketCode(etf);
  if (!resolved || resolved === etf.code) return etf;
  return { ...etf, code: resolved };
}

export function compactEtfName(value: string | null | undefined) {
  return (value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()\[\]{}·ㆍ\-_]/g, '')
    .replace(/상장지수투자신탁|증권상장지수투자신탁|증권투자신탁|투자신탁/g, '')
    .replace(/etf/g, '');
}
