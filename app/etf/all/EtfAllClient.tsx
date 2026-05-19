'use client';

import { useMemo, useState } from 'react';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { EtfLogo } from '../EtfLogo';
import { Chip, Badge } from '@/components/ui';
import styles from './EtfAll.module.css';

type SortKey = 'name' | 'aum' | 'fee' | 'change';
type CategoryKey = '전체' | '국내주식' | '해외주식' | '채권' | '원자재' | '테마';
type MarketTab = 'all' | 'kr' | 'us';

const MARKET_TABS: { key: MarketTab; label: string; flag: string; sublabel: string }[] = [
  { key: 'all', label: '전체', flag: '🌐', sublabel: '국내 + 미국' },
  { key: 'kr', label: '국내상장', flag: '🇰🇷', sublabel: 'KRX' },
  { key: 'us', label: '미국상장', flag: '🇺🇸', sublabel: 'NYSE · NASDAQ' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'change', label: '변동률' },
  { key: 'aum', label: '순자산' },
  { key: 'fee', label: '총보수' },
  { key: 'name', label: '이름순' },
];

// 카테고리 → ETF 카테고리 매핑 (etf.category 문자열 일부 매칭)
const CATEGORY_MATCHERS: Record<Exclude<CategoryKey, '전체'>, (etf: EtfInfo) => boolean> = {
  '국내주식': e => /국내주식|코스피|코스닥|KOSPI|KOSDAQ/.test(e.category),
  '해외주식': e => /해외주식|미국|S&P|나스닥|글로벌/.test(e.category),
  '채권': e => /채권/.test(e.category) || /채권/.test(e.theme || ''),
  '원자재': e => /원자재|금|은|구리|원유/.test(e.category) || /원자재/.test(e.theme || ''),
  '테마': e => /테마|반도체|AI|배당/.test(e.theme || ''),
};

const CATEGORIES: CategoryKey[] = ['전체', '국내주식', '해외주식', '채권', '원자재', '테마'];

// 추천 프리셋 — 첫 진입 시 발견 동선
const PRESETS: { key: string; label: string; emoji: string; sub: string; apply: (set: PresetSetter) => void }[] = [
  {
    key: 'us-sp500',
    label: 'S&P500 ETF',
    emoji: '🇺🇸',
    sub: '미국 대표 지수',
    apply: ({ setMarket, setCategory, setQ }) => { setMarket('us'); setCategory('해외주식'); setQ('S&P500'); },
  },
  {
    key: 'dividend',
    label: '월배당 ETF',
    emoji: '💰',
    sub: '꾸준한 현금 흐름',
    apply: ({ setQ, setCategory }) => { setQ('월배당'); setCategory('전체'); },
  },
  {
    key: 'semi',
    label: '반도체·AI ETF',
    emoji: '⚡',
    sub: '성장 테마',
    apply: ({ setCategory, setQ }) => { setCategory('테마'); setQ('반도체'); },
  },
  {
    key: 'bond',
    label: '채권 ETF',
    emoji: '🏦',
    sub: '안정 자산',
    apply: ({ setCategory, setQ }) => { setCategory('채권'); setQ(''); },
  },
];

type PresetSetter = {
  setMarket: (k: MarketTab) => void;
  setCategory: (k: CategoryKey) => void;
  setQ: (s: string) => void;
};

function ChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

// 숫자 추출 헬퍼 (가격/수익률/순자산/총보수 문자열에서 숫자만)
function num(value: string | undefined): number {
  if (!value) return 0;
  const m = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function parseChange(value: string | undefined, tone: 'up' | 'down' | 'flat'): number {
  const n = num(value);
  return tone === 'down' ? -Math.abs(n) : Math.abs(n);
}

export function EtfAllClient({ initialEtfs }: { initialEtfs: EtfInfo[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortKey>('change');
  const [category, setCategory] = useState<CategoryKey>('전체');
  const [market, setMarket] = useState<MarketTab>('all');

  // 시장별 카운트 (탭 라벨 옆에 표시)
  const marketCounts = useMemo(() => {
    let kr = 0, us = 0;
    for (const e of initialEtfs) {
      const c = (e.country || 'KR').toUpperCase();
      if (c === 'US') us++;
      else kr++;
    }
    return { all: initialEtfs.length, kr, us };
  }, [initialEtfs]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = initialEtfs.filter(e => {
      // 상장 시장 필터
      if (market === 'kr' && (e.country || 'KR').toUpperCase() !== 'KR') return false;
      if (market === 'us' && (e.country || 'KR').toUpperCase() !== 'US') return false;
      // 카테고리 필터
      if (category !== '전체') {
        const matcher = CATEGORY_MATCHERS[category];
        if (!matcher(e)) return false;
      }
      // 검색
      if (!query) return true;
      return (
        e.name.toLowerCase().includes(query) ||
        e.shortName.toLowerCase().includes(query) ||
        e.code.includes(query) ||
        e.issuer.toLowerCase().includes(query) ||
        (e.tags || []).some(t => t.toLowerCase().includes(query)) ||
        (e.theme || '').toLowerCase().includes(query)
      );
    });

    // 정렬
    const sorted = [...list];
    if (sort === 'name') {
      sorted.sort((a, b) => a.shortName.localeCompare(b.shortName));
    } else if (sort === 'aum') {
      sorted.sort((a, b) => num(b.aum) - num(a.aum));
    } else if (sort === 'fee') {
      sorted.sort((a, b) => num(a.fee) - num(b.fee));
    } else if (sort === 'change') {
      sorted.sort(
        (a, b) => parseChange(b.change, b.changeTone) - parseChange(a.change, a.changeTone),
      );
    }
    return sorted;
  }, [initialEtfs, q, sort, category, market]);

  return (
    <div className={styles.wrap}>
      {/* 상장 시장 탭 */}
      <div className={styles.marketTabs}>
        {MARKET_TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.marketTab} ${tab.key === market ? styles.marketTabOn : ''}`}
            onClick={() => setMarket(tab.key)}
          >
            <span className={styles.marketFlag}>{tab.flag}</span>
            <span className={styles.marketLabel}>{tab.label}</span>
            <span className={styles.marketCount}>{marketCounts[tab.key]}</span>
            <span className={styles.marketSub}>{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {/* 검색 입력 */}
      <div className={styles.searchBar}>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ETF 코드·이름·테마 검색 (예: 360750, S&P500, 나스닥)"
          aria-label="ETF 검색"
        />
        {q && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => setQ('')}
            aria-label="검색어 지우기"
          >
            ✕
          </button>
        )}
      </div>

      {/* 추천 프리셋 — 첫 진입 발견 동선 */}
      {!q && category === '전체' && market === 'all' && (
        <div className={styles.presetRow}>
          <span className={styles.presetLabel}>이런 ETF 찾아보세요</span>
          <div className={styles.presetCards}>
            {PRESETS.map(p => (
              <button
                key={p.key}
                type="button"
                className={styles.presetCard}
                onClick={() => p.apply({ setMarket, setCategory, setQ })}
              >
                <span className={styles.presetEmoji}>{p.emoji}</span>
                <span className={styles.presetText}>
                  <strong>{p.label}</strong>
                  <em>{p.sub}</em>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 카테고리 필터 + 초기화 */}
      <div className={styles.filterRow}>
        {CATEGORIES.map(c => (
          <Chip
            key={c}
            active={c === category}
            size="sm"
            onClick={() => setCategory(c === category && c !== '전체' ? '전체' : c)}
          >
            {c}
          </Chip>
        ))}
        {(category !== '전체' || market !== 'all' || q.trim()) && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => { setCategory('전체'); setMarket('all'); setQ(''); }}
          >
            ↻ 초기화
          </button>
        )}
      </div>

      {/* 결과 카운터 */}
      <div className={styles.resultInfo}>
        <strong>{filtered.length}</strong>개 ETF
        {q && <span> · "{q}" 검색</span>}
        {category !== '전체' && <span> · {category}</span>}
      </div>

      {/* 결과 표 (다중 비교) */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>조건에 맞는 ETF가 없어요. 검색어나 필터를 바꿔보세요.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.colName}>
                  <button type="button" onClick={() => setSort('name')} className={`${styles.sortBtn} ${sort === 'name' ? styles.sortBtnOn : ''}`}>
                    종목 {sort === 'name' && <ChevronDown />}
                  </button>
                </th>
                <th scope="col" className={styles.colMarket}>시장</th>
                <th scope="col" className={styles.colPrice}>현재가</th>
                <th scope="col" className={styles.colChange}>
                  <button type="button" onClick={() => setSort('change')} className={`${styles.sortBtn} ${sort === 'change' ? styles.sortBtnOn : ''}`}>
                    등락률 {sort === 'change' && <ChevronDown />}
                  </button>
                </th>
                <th scope="col" className={styles.colFee}>
                  <button type="button" onClick={() => setSort('fee')} className={`${styles.sortBtn} ${sort === 'fee' ? styles.sortBtnOn : ''}`}>
                    총보수 {sort === 'fee' && <ChevronDown />}
                  </button>
                </th>
                <th scope="col" className={styles.colAum}>
                  <button type="button" onClick={() => setSort('aum')} className={`${styles.sortBtn} ${sort === 'aum' ? styles.sortBtnOn : ''}`}>
                    순자산 {sort === 'aum' && <ChevronDown />}
                  </button>
                </th>
                <th scope="col" className={styles.colIndex}>추종 지수</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(etf => {
                const isUS = (etf.country || 'KR').toUpperCase() === 'US';
                return (
                  <tr key={etf.slug} className={styles.row}>
                    <td className={styles.colName}>
                      <a href={etfPath(etf.slug)} className={styles.nameLink}>
                        <EtfLogo name={etf.shortName} code={etf.code} size={28} />
                        <span className={styles.nameMain}>
                          <strong>{etf.shortName}</strong>
                          <em>{etf.code} · {etf.issuer}</em>
                        </span>
                      </a>
                    </td>
                    <td className={styles.colMarket}>
                      {isUS ? '🇺🇸' : '🇰🇷'}
                    </td>
                    <td className={styles.colPrice}>{etf.price || '—'}</td>
                    <td className={`${styles.colChange} ${etf.changeTone === 'down' ? styles.down : styles.up}`}>
                      {etf.change || '—'}
                    </td>
                    <td className={styles.colFee}>{etf.fee || '—'}</td>
                    <td className={styles.colAum}>{etf.aum || '—'}</td>
                    <td className={styles.colIndex}>{etf.trackingIndex || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
