'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Heart, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { getEtfAccountEligibility } from '@/lib/etfAccountEligibility';
import { listWatchedEtfCodes, subscribeWatchChanges, syncEtfWatchFromServer, toggleEtfWatch } from '@/lib/etfWatch';
import { EtfLogo } from '../EtfLogo';
import styles from './EtfScreener.module.css';

type SortKey = 'change' | 'tradeValue' | 'volume' | 'aum' | 'fee' | 'name';
type CategoryKey = '전체' | '국내주식' | '해외주식' | '채권' | '원자재' | '테마' | '월배당';
type MarketKey = 'all' | 'kr' | 'us';
type AumBandKey = 'all' | 'under100' | '100to1000' | 'over1000' | 'over1t';
type ReturnBandKey = 'all' | 'up' | 'up1' | 'up3' | 'down';
type TradeBandKey = 'all' | 'hasTrade' | 'over1b' | 'over10b' | 'over100b';
type FeeBandKey = 'all' | 'under010' | 'under030' | 'under050';
type MenuKey = 'add' | 'market' | 'category' | 'aum' | 'return' | 'trade' | 'fee' | 'sort' | null;
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

type ScreenState = {
  sort: SortKey;
  category: CategoryKey;
  market: MarketKey;
  aumBand: AumBandKey;
  returnBand: ReturnBandKey;
  tradeBand: TradeBandKey;
  feeBand: FeeBandKey;
  excludeLeveraged: boolean;
  pensionOnly: boolean;
};

type PresetConfig = {
  key: PresetKey;
  label: string;
  description: string;
  badge?: string;
  state: Partial<ScreenState>;
};

type Option<T extends string> = {
  key: T;
  label: string;
  description?: string;
};

const DEFAULT_STATE: ScreenState = {
  sort: 'change',
  category: '전체',
  market: 'kr',
  aumBand: 'all',
  returnBand: 'all',
  tradeBand: 'all',
  feeBand: 'all',
  excludeLeveraged: true,
  pensionOnly: false,
};

const PRESETS: PresetConfig[] = [
  {
    key: 'movers',
    label: '오늘 많이 오른 ETF',
    description: '등락률 기준으로 움직임이 큰 ETF',
    badge: '인기',
    state: { sort: 'change' },
  },
  {
    key: 'active',
    label: '거래 활발한 ETF',
    description: '거래대금이 큰 ETF',
    state: { sort: 'tradeValue', tradeBand: 'over1b' },
  },
  {
    key: 'large',
    label: '순자산 큰 ETF',
    description: '운용 규모가 큰 ETF',
    state: { sort: 'aum', aumBand: 'over1000' },
  },
  {
    key: 'lowFee',
    label: '보수 낮은 ETF',
    description: '총보수가 낮은 ETF',
    state: { sort: 'fee', feeBand: 'under030' },
  },
  {
    key: 'dividend',
    label: '월배당 ETF',
    description: '분배금 흐름을 보는 ETF',
    badge: '인기',
    state: { sort: 'aum', category: '월배당' },
  },
  {
    key: 'pension',
    label: '연금 가능 ETF',
    description: '개인연금·퇴직연금 후보',
    state: { sort: 'aum', market: 'kr', pensionOnly: true, excludeLeveraged: true },
  },
  {
    key: 'noLeverage',
    label: '레버리지 제외',
    description: '고위험 상품을 뺀 목록',
    state: { sort: 'change', excludeLeveraged: true },
  },
  {
    key: 'domestic',
    label: '국내 대표 ETF',
    description: '국내상장 ETF만 보기',
    state: { sort: 'aum', market: 'kr' },
  },
  {
    key: 'us',
    label: '미국 대표 ETF',
    description: '미국상장 ETF만 보기',
    state: { sort: 'aum', market: 'us' },
  },
  {
    key: 'theme',
    label: '테마형 ETF',
    description: '반도체·AI·배당 테마',
    state: { sort: 'change', category: '테마' },
  },
];

const INITIAL_STATE: ScreenState = {
  ...DEFAULT_STATE,
  sort: 'change',
};

const SORT_OPTIONS: Option<SortKey>[] = [
  { key: 'change', label: '등락률 높은 순', description: '오늘 움직임이 큰 ETF를 먼저 봐요.' },
  { key: 'tradeValue', label: '거래대금 많은 순', description: '실제로 많이 거래되는 ETF를 먼저 봐요.' },
  { key: 'volume', label: '거래량 많은 순', description: '체결 수량이 많은 ETF를 먼저 봐요.' },
  { key: 'aum', label: '순자산 큰 순', description: '운용 규모가 큰 ETF를 먼저 봐요.' },
  { key: 'fee', label: '총보수 낮은 순', description: '장기 보유 비용이 낮은 ETF를 먼저 봐요.' },
];

const MARKET_OPTIONS: Option<MarketKey>[] = [
  { key: 'all', label: '전체', description: '국내상장과 미국상장 ETF를 함께 봐요.' },
  { key: 'kr', label: '국내', description: '국내상장 ETF만 봐요.' },
  { key: 'us', label: '미국', description: '미국상장 ETF만 봐요.' },
];

const CATEGORY_OPTIONS: Option<CategoryKey>[] = [
  { key: '전체', label: '전체' },
  { key: '국내주식', label: '국내주식' },
  { key: '해외주식', label: '해외주식' },
  { key: '채권', label: '채권' },
  { key: '원자재', label: '원자재' },
  { key: '테마', label: '테마' },
  { key: '월배당', label: '월배당' },
];

const AUM_OPTIONS: Option<AumBandKey>[] = [
  { key: 'all', label: '전체', description: '순자산 조건을 쓰지 않아요.' },
  { key: 'under100', label: '100억원 미만', description: '작은 규모의 ETF까지 살펴봐요.' },
  { key: '100to1000', label: '100억원 ~ 1,000억원', description: '중간 규모 ETF를 봐요.' },
  { key: 'over1000', label: '1,000억원 이상', description: '규모가 어느 정도 검증된 ETF를 봐요.' },
  { key: 'over1t', label: '1조원 이상', description: '대형 대표 ETF만 봐요.' },
];

const RETURN_OPTIONS: Option<ReturnBandKey>[] = [
  { key: 'all', label: '전체', description: '등락률 조건을 쓰지 않아요.' },
  { key: 'up', label: '상승 중', description: '오늘 플러스인 ETF만 봐요.' },
  { key: 'up1', label: '+1% 이상', description: '오늘 1% 이상 오른 ETF를 봐요.' },
  { key: 'up3', label: '+3% 이상', description: '오늘 강하게 오른 ETF를 봐요.' },
  { key: 'down', label: '하락 중', description: '오늘 마이너스인 ETF만 봐요.' },
];

const TRADE_OPTIONS: Option<TradeBandKey>[] = [
  { key: 'all', label: '전체', description: '거래대금 조건을 쓰지 않아요.' },
  { key: 'hasTrade', label: '거래 있음', description: '거래대금 또는 거래량이 확인된 ETF만 봐요.' },
  { key: 'over1b', label: '10억원 이상', description: '거래가 어느 정도 붙은 ETF를 봐요.' },
  { key: 'over10b', label: '100억원 이상', description: '거래가 활발한 ETF를 봐요.' },
  { key: 'over100b', label: '1,000억원 이상', description: '거래대금 상위권 ETF만 봐요.' },
];

const FEE_OPTIONS: Option<FeeBandKey>[] = [
  { key: 'all', label: '전체', description: '총보수 조건을 쓰지 않아요.' },
  { key: 'under010', label: '0.10% 이하', description: '초저보수 ETF를 봐요.' },
  { key: 'under030', label: '0.30% 이하', description: '장기투자 비용이 낮은 ETF를 봐요.' },
  { key: 'under050', label: '0.50% 이하', description: '비교적 낮은 비용의 ETF를 봐요.' },
];

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

function matchesAum(etf: EtfInfo, band: AumBandKey): boolean {
  if (band === 'all') return true;
  const value = parseKoreanMoney(etf.aum);
  if (value <= 0) return false;
  if (band === 'under100') return value < 10_000_000_000;
  if (band === '100to1000') return value >= 10_000_000_000 && value < 100_000_000_000;
  if (band === 'over1000') return value >= 100_000_000_000;
  return value >= 1_000_000_000_000;
}

function matchesReturn(etf: EtfInfo, band: ReturnBandKey): boolean {
  if (band === 'all') return true;
  const value = parseChange(etf.change, etf.changeTone);
  if (band === 'up') return value > 0;
  if (band === 'up1') return value >= 1;
  if (band === 'up3') return value >= 3;
  return value < 0;
}

function matchesTrade(etf: EtfInfo, band: TradeBandKey): boolean {
  if (band === 'all') return true;
  const tradeValue = parseKoreanMoney(etf.tradeValue);
  if (band === 'hasTrade') return isActiveEtf(etf);
  if (band === 'over1b') return tradeValue >= 1_000_000_000;
  if (band === 'over10b') return tradeValue >= 10_000_000_000;
  return tradeValue >= 100_000_000_000;
}

function matchesFee(etf: EtfInfo, band: FeeBandKey): boolean {
  if (band === 'all') return true;
  const fee = parseFee(etf.fee);
  if (!Number.isFinite(fee)) return false;
  if (band === 'under010') return fee <= 0.1;
  if (band === 'under030') return fee <= 0.3;
  return fee <= 0.5;
}

function sortValue(etf: EtfInfo, sort: SortKey): number {
  if (sort === 'change') return parseChange(etf.change, etf.changeTone);
  if (sort === 'tradeValue') return parseKoreanMoney(etf.tradeValue);
  if (sort === 'volume') return parseVolume(etf.volume);
  if (sort === 'aum') return parseKoreanMoney(etf.aum);
  if (sort === 'fee') return parseFee(etf.fee);
  return 0;
}

function optionLabel<T extends string>(options: Option<T>[], key: T): string {
  return options.find(option => option.key === key)?.label || '';
}

function presetTitle(activePreset: PresetKey, state: ScreenState) {
  const preset = PRESETS.find(item => item.key === activePreset);
  if (preset) return preset;
  const sortLabel = optionLabel(SORT_OPTIONS, state.sort).replace(' 순', '');
  return {
    key: 'custom' as const,
    label: `${sortLabel} 기준 ETF`,
    description: '선택한 필터에 맞는 ETF',
    state: {},
  };
}

export function EtfScreenerClient({ initialEtfs }: { initialEtfs: EtfInfo[] }) {
  const [state, setState] = useState<ScreenState>(INITIAL_STATE);
  const [activePreset, setActivePreset] = useState<PresetKey>('movers');
  const [activeMenu, setActiveMenu] = useState<MenuKey>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [watchedCodes, setWatchedCodes] = useState<string[]>([]);

  const activeInfo = presetTitle(activePreset, state);
  const watchedSet = useMemo(() => new Set(watchedCodes), [watchedCodes]);

  useEffect(() => {
    setWatchedCodes(listWatchedEtfCodes());
    void syncEtfWatchFromServer();
    return subscribeWatchChanges(codes => setWatchedCodes(codes));
  }, []);

  const filtered = useMemo(() => {
    const list = initialEtfs.filter(etf => {
      const country = (etf.country || 'KR').toUpperCase();
      if (state.market === 'kr' && country !== 'KR') return false;
      if (state.market === 'us' && country !== 'US') return false;
      if (state.category !== '전체' && !CATEGORY_MATCHERS[state.category](etf)) return false;
      if (!matchesAum(etf, state.aumBand)) return false;
      if (!matchesReturn(etf, state.returnBand)) return false;
      if (!matchesTrade(etf, state.tradeBand)) return false;
      if (!matchesFee(etf, state.feeBand)) return false;
      if (state.excludeLeveraged && isLeveraged(etf)) return false;
      if (state.pensionOnly && !isPensionAvailable(etf)) return false;
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

  const patchState = (patch: Partial<ScreenState>, closeMenu = false) => {
    setState(prev => ({ ...prev, ...patch }));
    setActivePreset('custom');
    setSaveStatus('idle');
    if (closeMenu) setActiveMenu(null);
  };

  const applyPreset = (preset: PresetConfig) => {
    setState({ ...DEFAULT_STATE, ...preset.state });
    setActivePreset(preset.key);
    setSaveStatus('idle');
    setActiveMenu(null);
  };

  const reset = () => {
    setState(INITIAL_STATE);
    setActivePreset('movers');
    setSaveStatus('idle');
    setActiveMenu(null);
  };

  const saveCurrentFilter = () => {
    const item = {
      label: activeInfo.label,
      description: activeInfo.description,
      state,
      savedAt: new Date().toISOString(),
    };

    try {
      const storageKey = 'etfhanip:screener-presets';
      const previous = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as Array<typeof item>;
      window.localStorage.setItem(storageKey, JSON.stringify([item, ...previous].slice(0, 8)));
    } catch {
      // localStorage가 막힌 환경에서도 화면 피드백은 유지한다.
    }

    setSaveStatus('saved');
  };

  const toggleWatch = (code: string) => {
    const next = toggleEtfWatch(code);
    setWatchedCodes(prev => (
      next
        ? Array.from(new Set([...prev, code]))
        : prev.filter(item => item !== code)
    ));
  };

  const categoryButtonLabel = state.category === '전체' ? 'ETF유형' : state.category;
  const aumButtonLabel = state.aumBand === 'all' ? '순자산' : optionLabel(AUM_OPTIONS, state.aumBand);
  const returnButtonLabel = state.returnBand === 'all' ? '등락률' : optionLabel(RETURN_OPTIONS, state.returnBand);
  const tradeButtonLabel = state.tradeBand === 'all' ? '거래대금' : optionLabel(TRADE_OPTIONS, state.tradeBand);
  const feeButtonLabel = state.feeBand === 'all' ? '총보수' : optionLabel(FEE_OPTIONS, state.feeBand);
  const sortButtonLabel = optionLabel(SORT_OPTIONS, state.sort).replace(' 순', '');

  const renderOptionGroup = <T extends string,>(
    options: Option<T>[],
    selected: T,
    onSelect: (key: T) => void,
  ) => (
    <div className={styles.panelOptions}>
      {options.map(option => (
        <button
          key={option.key}
          type="button"
          className={`${styles.panelOption} ${selected === option.key ? styles.panelOptionOn : ''}`}
          onClick={() => onSelect(option.key)}
        >
          <span>
            <strong>{option.label}</strong>
            {option.description && <em>{option.description}</em>}
          </span>
        </button>
      ))}
    </div>
  );

  const renderPanel = () => {
    if (activeMenu === 'add') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="필터추가">
          <PanelHead title="필터추가" onClose={() => setActiveMenu(null)} />
          <div className={styles.addGroups}>
            <FilterGroup title="기본">
              <PanelShortcut label="국가" description="국내·미국 ETF를 나눠봐요." onClick={() => setActiveMenu('market')} />
              <PanelShortcut label="ETF유형" description="국내주식·채권·테마처럼 분류해요." onClick={() => setActiveMenu('category')} />
              <PanelShortcut label="순자산" description="ETF 운용 규모로 걸러봐요." onClick={() => setActiveMenu('aum')} />
            </FilterGroup>
            <FilterGroup title="시세">
              <PanelShortcut label="등락률" description="오늘 오른 ETF나 내려간 ETF를 봐요." onClick={() => setActiveMenu('return')} />
              <PanelShortcut label="거래대금" description="장중 유동성이 있는 ETF를 봐요." onClick={() => setActiveMenu('trade')} />
              <PanelShortcut label="정렬 기준" description="결과 테이블의 우선순위를 바꿔요." onClick={() => setActiveMenu('sort')} />
            </FilterGroup>
            <FilterGroup title="ETF 정보">
              <PanelShortcut label="총보수" description="장기 보유 비용으로 걸러봐요." onClick={() => setActiveMenu('fee')} />
              <PanelShortcut
                label={state.pensionOnly ? '연금 가능 해제' : '연금 가능'}
                description="개인연금·퇴직연금 가능 후보만 봐요."
                onClick={() => patchState({ pensionOnly: !state.pensionOnly }, true)}
              />
              <PanelShortcut
                label={state.excludeLeveraged ? '레버리지 제외 해제' : '레버리지 제외'}
                description="레버리지·인버스 상품을 목록에서 빼요."
                onClick={() => patchState({ excludeLeveraged: !state.excludeLeveraged }, true)}
              />
            </FilterGroup>
          </div>
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'market') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="국가">
          <PanelHead title="국가" subtitle="선택한 국가의 ETF만 골라볼 수 있어요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(MARKET_OPTIONS, state.market, key => patchState({ market: key }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'category') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="ETF유형">
          <PanelHead title="ETF유형" subtitle="ETF가 담는 자산과 전략으로 나눠봐요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(CATEGORY_OPTIONS, state.category, key => patchState({ category: key }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'aum') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="순자산">
          <PanelHead title="순자산" subtitle="ETF 규모를 기준으로 안정성과 대표성을 가늠해요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(AUM_OPTIONS, state.aumBand, key => patchState({ aumBand: key }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'return') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="등락률">
          <PanelHead title="등락률" subtitle="오늘 가격 움직임으로 ETF를 걸러봐요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(RETURN_OPTIONS, state.returnBand, key => patchState({ returnBand: key, sort: 'change' }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'trade') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="거래대금">
          <PanelHead title="거래대금" subtitle="매수·매도하기 편한 유동성 있는 ETF를 찾아요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(TRADE_OPTIONS, state.tradeBand, key => patchState({ tradeBand: key, sort: key === 'all' ? state.sort : 'tradeValue' }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'fee') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="총보수">
          <PanelHead title="총보수" subtitle="ETF를 오래 들고 갈수록 비용 차이가 커져요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(FEE_OPTIONS, state.feeBand, key => patchState({ feeBand: key, sort: key === 'all' ? state.sort : 'fee' }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    if (activeMenu === 'sort') {
      return (
        <div className={styles.filterPanel} role="dialog" aria-label="정렬 기준">
          <PanelHead title="정렬 기준" subtitle="결과 테이블에서 먼저 볼 기준을 고르세요." onClose={() => setActiveMenu(null)} />
          {renderOptionGroup(SORT_OPTIONS, state.sort, key => patchState({ sort: key }, true))}
          <PanelFooter count={filtered.length} onReset={reset} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="ETF 골라보기 목록">
        <h2>ETF 골라보기 목록</h2>
        <div className={styles.railGroup}>
          <span>내가 만든</span>
          <button type="button" className={styles.createButton} onClick={saveCurrentFilter}>
            <span aria-hidden="true">+</span>
            직접 만들기
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
          <h1>{activeInfo.label}</h1>
          <span>{activeInfo.description}</span>
        </header>

        <div className={styles.filterBar}>
          <div className={styles.filterControls}>
            <FilterButton active={activeMenu === 'add'} onClick={() => setActiveMenu(activeMenu === 'add' ? null : 'add')}>
              <SlidersHorizontal size={16} />
              필터추가
            </FilterButton>
            <FilterButton active={activeMenu === 'market' || state.market !== 'all'} onClick={() => setActiveMenu(activeMenu === 'market' ? null : 'market')}>
              {optionLabel(MARKET_OPTIONS, state.market)}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'category' || state.category !== '전체'} onClick={() => setActiveMenu(activeMenu === 'category' ? null : 'category')}>
              {categoryButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'aum' || state.aumBand !== 'all'} onClick={() => setActiveMenu(activeMenu === 'aum' ? null : 'aum')}>
              {aumButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'return' || state.returnBand !== 'all'} onClick={() => setActiveMenu(activeMenu === 'return' ? null : 'return')}>
              {returnButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'trade' || state.tradeBand !== 'all'} onClick={() => setActiveMenu(activeMenu === 'trade' ? null : 'trade')}>
              {tradeButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'fee' || state.feeBand !== 'all'} onClick={() => setActiveMenu(activeMenu === 'fee' ? null : 'fee')}>
              {feeButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <FilterButton active={activeMenu === 'sort'} onClick={() => setActiveMenu(activeMenu === 'sort' ? null : 'sort')}>
              {sortButtonLabel}
              <ChevronDown size={16} />
            </FilterButton>
            <button type="button" className={styles.inlineReset} onClick={reset}>
              <RotateCcw size={14} />
              필터 되돌리기
            </button>
          </div>

          <div className={styles.saveBar}>
            <span>{saveStatus === 'saved' ? '필터를 저장했어요.' : '방금 편집한 필터를 저장할까요?'}</span>
            <button type="button" onClick={saveCurrentFilter}>
              내가 만든 목록에 저장
            </button>
          </div>

          {renderPanel()}
        </div>

        <div className={styles.resultHead}>
          <strong>검색된 ETF · {filtered.length.toLocaleString('ko-KR')}개</strong>
          <span>최근 시세 기준</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>조건에 맞는 ETF가 없어요. 다른 목록이나 필터를 눌러보세요.</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col" className={styles.colWatch}>관심</th>
                  <th scope="col" className={styles.colRank}>순위</th>
                  <th scope="col" className={styles.colName}>상품명</th>
                  <th scope="col">현재가</th>
                  <th scope="col">등락률</th>
                  <th scope="col">ETF유형</th>
                  <th scope="col">순자산</th>
                  <th scope="col">거래대금</th>
                  <th scope="col">총보수</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 80).map((etf, index) => {
                  const isUS = (etf.country || 'KR').toUpperCase() === 'US';
                  const watched = watchedSet.has(etf.code);
                  return (
                    <tr key={etf.slug}>
                      <td className={styles.watchCell}>
                        <button
                          type="button"
                          className={`${styles.watchButton} ${watched ? styles.watchButtonOn : ''}`}
                          aria-label={`${etf.shortName} ${watched ? '관심 해제' : '관심 등록'}`}
                          aria-pressed={watched}
                          onClick={() => toggleWatch(etf.code)}
                        >
                          <Heart size={19} fill={watched ? 'currentColor' : 'none'} />
                        </button>
                      </td>
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
                      <td>{etf.category || (isUS ? '미국 ETF' : '국내 ETF')}</td>
                      <td>{etf.aum || '-'}</td>
                      <td>{etf.tradeValue || etf.volume || '-'}</td>
                      <td>{etf.fee || '-'}</td>
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

function FilterButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles.filterButton} ${active ? styles.filterButtonOn : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function PanelHead({
  title,
  subtitle,
  onClose,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  return (
    <div className={styles.panelHead}>
      <div>
        <strong>{title}</strong>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button type="button" aria-label="닫기" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.addGroup}>
      <h3>{title}</h3>
      <div>{children}</div>
    </section>
  );
}

function PanelShortcut({
  label,
  description,
  onClick,
}: {
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.panelShortcut} onClick={onClick}>
      <strong>{label}</strong>
      <span>{description}</span>
    </button>
  );
}

function PanelFooter({ count, onReset }: { count: number; onReset: () => void }) {
  return (
    <div className={styles.panelFooter}>
      <button type="button" onClick={onReset}>
        <RotateCcw size={14} />
        초기화
      </button>
      <strong>{count.toLocaleString('ko-KR')}개 ETF보기</strong>
    </div>
  );
}
