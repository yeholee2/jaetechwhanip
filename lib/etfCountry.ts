/**
 * underlyingCountry 코드 → 한국어 라벨 + 국기 이모지.
 *
 * 사용 예: countryLabel('US') → '미국 🇺🇸'
 */

const MAP: Record<string, { label: string; flag: string }> = {
  KR: { label: '국내', flag: '🇰🇷' },
  US: { label: '미국', flag: '🇺🇸' },
  CN: { label: '중국', flag: '🇨🇳' },
  JP: { label: '일본', flag: '🇯🇵' },
  IN: { label: '인도', flag: '🇮🇳' },
  EU: { label: '유럽', flag: '🇪🇺' },
  VN: { label: '베트남', flag: '🇻🇳' },
  TW: { label: '대만', flag: '🇹🇼' },
  HK: { label: '홍콩', flag: '🇭🇰' },
  EM: { label: '신흥국', flag: '🌏' },
  GLOBAL: { label: '글로벌', flag: '🌍' },
};

export function countryInfo(code?: string): { label: string; flag: string; isOverseas: boolean } {
  const c = (code || 'KR').toUpperCase();
  const m = MAP[c] || { label: c, flag: '🏳️' };
  return { ...m, isOverseas: c !== 'KR' };
}

export function countryLabel(code?: string): string {
  const { label, flag } = countryInfo(code);
  return `${flag} ${label}`;
}
