'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { getEtfAccountEligibility } from '@/lib/etfAccountEligibility';
import { EtfLogo } from '../EtfLogo';
import styles from './EtfScreener.module.css';

type SortKey = 'change' | 'tradeValue' | 'volume' | 'aum' | 'fee' | 'name';
type CategoryKey = '전체' | '국내주식' | '해외주식' | '채권' | '원자재' | '테마' | '월배당';
type MarketKey = 'all' | 'kr' | 'us';
type PresetKey =
  | 'movers'
  | 'active'
  | 'large'
  | 'lowFee'
  | 'dividend'
  | 'pension'
  | 'noLeverage'
  | 'domestic'
  | 'us'
  | 'theme'
  | 'custom';

type PresetConfig = {
  key: PresetKey;
  label: string;
  description: string;
  badge?: string;
  state: Partial<ScreenState>;
};

type ScreenState = {
  sort: SortKey;
  category: CategoryKey;
  market: MarketKey;
  excludeLeveraged: boolean;
  pensionOnly: boolean;
  activeOnly: boolean;
};

const DEFAULT_STATE: ScreenState = {
  sort: 'change',
  category: '전체',
  market: 'all',
  excludeLeveraged: true,
  pensionOnly: false,
  activeOnly: false,
};

const PRESETS: PresetConfig[] = [
  {
    key: 'movers',
    label: '오늘 많이 오른 ETF',
    description: '장중 상승률이 높은 ETF',
    badge: '인기',
    state: { sort: 'change', category: '전체', market: 'all', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'active',
    label: '거래 활발한 ETF',
    description: '거래대금이 큰 ETF',
    state: { sort: 'tradeValue', category: '전체', market: 'all', activeOnly: true, pensionOnly: false },
  },
  {
    key: 'large',
    label: '순자산 큰 ETF',
    description: '운용 규모가 큰 ETF',
    state: { sort: 'aum', category: '전체', market: 'all', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'lowFee',
    label: '보수 낮은 ETF',
    description: '총보수가 낮은 ETF',
    state: { sort: 'fee', category: '전체', market: 'all', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'dividend',
    label: '월배당 ETF',
    description: '분배금 흐름을 보는 ETF',
    badge: '인기',
    state: { sort: 'aum', category: '월배당', market: 'all', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'pension',
    label: '연금 가능 ETF',
    description: '개인연금·퇴직연금 후보',
    state: { sort: 'aum', category: '전체', market: 'kr', excludeLeveraged: true, pensionOnly: true },
  },
  {
    key: 'noLeverage',
    label: '레버리지 제외',
    description: '고위험 상품을 뺀 목록',
    state: { sort: 'change', category: '전체', market: 'all', excludeLeveraged: true, pensionOnly: false },
  },
  {
    key: 'domestic',
    label: '국내 대표 ETF',
    description: '국내상장 ETF만 보기',
    state: { sort: 'aum', category: '전체', market: 'kr', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'us',
    label: '미국 대표 ETF',
    description: '미국상장 ETF만 보기',
    state: { sort: 'aum', category: '전체', market: 'us', activeOnly: false, pensionOnly: false },
  },
  {
    key: 'theme',
    label: '테마형 ETF',
    description: '반도체·AI·배당 테마',
    state: { sort: 'change', category: '테마', market: 'all', activeOnly: false, pensionOnly: false },
  },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'change', label: '상승률' },
  { key: 'tradeValue', label: '거래대금' },
  { key: 'volume', label: '거래량' },
  { key: 'aum', label: '순자산' },
  { key: 'fee', label: '낮은 보수' },
];

const MARKET_OPTIONS: { key: MarketKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'kr', label: '국내' },
  { key: 'us', label: '미국' },
];

const CATEGORY_OPTIONS: CategoryKey[] = ['전체', '국내주식', '해외주식', '채권', '원자재', '테마', '월배당'];

const CATEGORY_MATCHERS: Record<Exclude<CategoryKey, '전체'>, (etf: EtfInfo) => boolean> = {
  '국내주식': e => /국내주식|코스피|코스닥|KOSPI|KOSDAQ/.test(e.category),
  '해외주식': e => /해외주식|미국|S&P|나스닥|글로벌/.test(e.category),
  '채권': e => /채권/.test(e.category) || /채권/.test(e.theme || ''),
  '원자재': e => /원자재|금|은|구리|원유/.test(e.category) || /원자재/.test(e.theme || ''),
  '테마': e => /테마|반도체|AI|배당|커버드콜/.test(`${e.category} ${e.theme || ''}`),
  '월배당': e => /월/.test(e.distribution || '') || /월배당/.test(`${e.name} ${e.shortName} ${e.theme || ''} ${(e.tags || []).join(' ')}`),
};

function num(value: string | undefined): number {
  if (!value) return 0;
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : 0;
}

function parseKoreanMoney(value: string | undefined): number {
  if (!value) return 0;
  const text = value.replace(/,/g, '');
  let total = 0;
  const trillion = text.match(/(\d+(?:\.\d+)?)\s*조/);
  if (trillion) total += parseFloat(trillion[1]) * 1_000_000_000_000;
  const hundredMillion = text.match(/(\d+(?:\.\d+)?)\s*억/);
  if (hundredMillion) total += parseFloat(hundredMillion[1]) * 100_000_000;
  const tenThousand = text.match(/(\d+(?:\.\d+)?)\s*만/);
  if (!trillion && !hundredMillion && tenThousand) total += parseFloat(tenThousand[1]) * 10_000;
  return total || num(value);
}

function parseVolume(value: string | undefined): number {
  if (!value) return 0;
  const text = value.replace(/,/g, '');
  const man = text.match(/(\d+(?:\.\d+)?)\s*만주/);
  if (man) return parseFloat(man[1]) * 10_000;
  return num(value);
}

function parseChange(value: string | undefined, tone: EtfInfo['changeTone']): number {
  const valueNumber = num(value);
  return tone === 'down' ? -Math.abs(valueNumber) : Math.abs(valueNumber);
}

function parseFee(value: string | undefined): number {
  const valueNumber = num(value);
  return valueNumber > 0 ? valueNumber : Number.POSITIVE_INFINITY;
}

function isLeveraged(etf: EtfInfo): boolean {
  const text = `${etf.name} ${etf.shortName} ${etf.theme || ''} ${(etf.tags || []).join(' ')}`;
  return /레버리지|인버스|곱버스|2X|3X|2배|3배|leverage|inverse/i.test(text);
}

function isPensionAvailable(etf: EtfInfo): boolean {
  return getEtfAccountEligibility(etf).some(item => (
    (item.key === 'personalPension' || item.key === 'retirementPension') &&
    item.status !== 'unavailable'
  ));
}

function isActiveEtf(etf: EtfInfo): boolean {
  return parseKoreanMoney(etf.tradeValue) > 0 || parseVolume(etf.volume) > 0;
}

function sortValue(etf: EtfInfo, sort: SortKey): number {
  if (sort === 'change') return parseChange(etf.change, etf.changeTone);
  if (sort === 'tradeValue') return parseKoreanMoney(etf.tradeValue);
  if (sort === 'volume') return parseVolume(etf.volume);
  if (sort === 'aum') return parseKoreanMoney(etf.aum);
  if (sort === 'fee') return parseFee(etf.fee);
  return 0;
}

function presetTitle(activePreset: PresetKey, state: ScreenState) {
  const preset = PRESETS.find(item => item.key === activePreset);
  if (preset) return preset;
  const sortLabel = SORT_OPTIONS.find(item => item.key === state.sort)?.label || '조건';
  return {
    key: 'custom' as const,
    label: `${sortLabel} 기준 ETF`,
    description: '선택한 필터에 맞는 ETF',
    state: {},
  };
}

export function EtfScreenerClient({ initialEtfs }: { initialEtfs: EtfInfo[] }) {
  const [state, setState] = useState<ScreenState>(DEFAULT_STATE);
  const [activePreset, setActivePreset] = useState<PresetKey>('movers');

  const activeInfo = presetTitle(activePreset, state);

  const filtered = useMemo(() => {
    const list = initialEtfs.filter(etf => {
      const country = (etf.country || 'KR').toUpperCase();
      if (state.market === 'kr' && country !== 'KR') return false;
      if (state.market === 'us' && country !== 'US') return false;
      if (state.category !== '전체' && !CATEGORY_MATCHERS[state.category](etf)) return false;
      if (state.excludeLeveraged && isLeveraged(etf)) return false;
      if (state.pensionOnly && !isPensionAvailable(etf)) return false;
      if (state.activeOnly && !isActiveEtf(etf)) return false;
      return true;
    });

    const sorted = [...list];
    if (state.sort === 'name') {
      sorted.sort((a, b) => a.shortName.localeCompare(b.shortName));
    } else if (state.sort === 'fee') {
      sorted.sort((a, b) => sortValue(a, state.sort) - sortValue(b, state.sort));
    } else {
      sorted.sort((a, b) => sortValue(b, state.sort) - sortValue(a, state.sort));
    }
    return sorted;
  }, [initialEtfs, state]);

  const patchState = (patch: Partial<ScreenState>) => {
    setState(prev => ({ ...prev, ...patch }));
    setActivePreset('custom');
  };

  const applyPreset = (preset: PresetConfig) => {
    setState({ ...DEFAULT_STATE, ...preset.state });
    setActivePreset(preset.key);
  };

  const reset = () => {
    setState(DEFAULT_STATE);
    setActivePreset('movers');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="ETF 골라보기 목록">
        <h2>ETF 골라보기 목록</h2>
        <div className={styles.railGroup}>
          <span>내가 만든</span>
          <button type="button" className={styles.createButton} disabled>
            + 직접 만들기
          </button>
        </div>
        <div className={styles.railGroup}>
          <span>한입 추천</span>
          <nav className={styles.presetList}>
            {PRESETS.map(preset => (
              <button
                key={preset.key}
                type="button"
                className={`${styles.presetButton} ${activePreset === preset.key ? styles.presetButtonOn : ''}`}
                onClick={() => applyPreset(preset)}
              >
                <strong>{preset.label}</strong>
                {preset.badge && <em>{preset.badge}</em>}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <section className={styles.main} aria-label="ETF 스크리너 결과">
        <header className={styles.hero}>
          <p>ETF 스크리너</p>
          <h1>{activeInfo.label}</h1>
          <span>{activeInfo.description}</span>
        </header>

        <div className={styles.filterBar}>
          <div className={styles.chipRow}>
            <span className={styles.rowLabel}>시장</span>
            {MARKET_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                className={`${styles.chip} ${state.market === option.key ? styles.chipOn : ''}`}
                onClick={() => patchState({ market: option.key })}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.chipRow}>
            <span className={styles.rowLabel}>ETF유형</span>
            {CATEGORY_OPTIONS.map(option => (
              <button
                key={option}
                type="button"
                className={`${styles.chip} ${state.category === option ? styles.chipOn : ''}`}
                onClick={() => patchState({ category: option })}
              >
                {option}
              </button>
            ))}
          </div>

          <div className={styles.chipRow}>
            <span className={styles.rowLabel}>정렬</span>
            {SORT_OPTIONS.map(option => (
              <button
                key={option.key}
                type="button"
                className={`${styles.chip} ${state.sort === option.key ? styles.chipOn : ''}`}
                onClick={() => patchState({ sort: option.key })}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className={styles.chipRow}>
            <span className={styles.rowLabel}>조건</span>
            <button
              type="button"
              className={`${styles.chip} ${state.excludeLeveraged ? styles.chipOn : ''}`}
              onClick={() => patchState({ excludeLeveraged: !state.excludeLeveraged })}
            >
              레버리지 제외
            </button>
            <button
              type="button"
              className={`${styles.chip} ${state.pensionOnly ? styles.chipOn : ''}`}
              onClick={() => patchState({ pensionOnly: !state.pensionOnly })}
            >
              연금 가능
            </button>
            <button
              type="button"
              className={`${styles.chip} ${state.activeOnly ? styles.chipOn : ''}`}
              onClick={() => patchState({ activeOnly: !state.activeOnly })}
            >
              거래 활발
            </button>
            <button type="button" className={styles.resetButton} onClick={reset}>
              필터 되돌리기
            </button>
          </div>
        </div>

        <div className={styles.resultHead}>
          <strong>조건에 맞는 ETF · {filtered.length.toLocaleString('ko-KR')}개</strong>
          <span>최근 시세 기준</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>조건에 맞는 ETF가 없어요. 다른 목록이나 필터를 눌러보세요.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.colRank}>순위</th>
                  <th scope="col" className={styles.colName}>상품명</th>
                  <th scope="col">현재가</th>
                  <th scope="col">등락률</th>
                  <th scope="col">순자산</th>
                  <th scope="col">거래대금</th>
                  <th scope="col">총보수</th>
                  <th scope="col">시장</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 80).map((etf, index) => {
                  const isUS = (etf.country || 'KR').toUpperCase() === 'US';
                  return (
                    <tr key={etf.slug}>
                      <td className={styles.colRank}>{index + 1}</td>
                      <td className={styles.colName}>
                        <Link href={etfPath(etf.slug)} className={styles.nameLink}>
                          <EtfLogo name={etf.shortName} code={etf.code} size={34} />
                          <span>
                            <em>{etf.code} · {etf.issuer}</em>
                            <strong>{etf.shortName}</strong>
                          </span>
                        </Link>
                      </td>
                      <td>{etf.price || '-'}</td>
                      <td className={etf.changeTone === 'down' ? styles.down : styles.up}>
                        {etf.change || '-'}
                      </td>
                      <td>{etf.aum || '-'}</td>
                      <td>{etf.tradeValue || etf.volume || '-'}</td>
                      <td>{etf.fee || '-'}</td>
                      <td className={styles.marketCell}>{isUS ? 'US' : 'KR'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
