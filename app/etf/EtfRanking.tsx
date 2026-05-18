'use client';

/**
 * ETF 랭킹 TOP 10.
 * 시장(전체/국내상장/미국상장) + 카테고리 + 정렬 다축 조합.
 * DB에서 받은 전체 ETF를 클라이언트에서 정렬/필터 (1,000개 규모면 충분).
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { EtfLogo } from './EtfLogo';
import { Chip, Badge } from '@/components/ui';
import sec from './sectionStyles.module.css';
import styles from './EtfRanking.module.css';

const SORT_OPTIONS = ['수익률', '순자산', '거래량', '이름순'] as const;
const CATEGORY_OPTIONS = ['전체', '주식', '채권', '원자재', '테마'] as const;
const MARKET_OPTIONS = [
  { key: 'all', label: '🌐 전체' },
  { key: 'kr', label: '🇰🇷 국내' },
  { key: 'us', label: '🇺🇸 미국' },
] as const;
type SortKey = typeof SORT_OPTIONS[number];
type CategoryKey = typeof CATEGORY_OPTIONS[number];
type MarketKey = typeof MARKET_OPTIONS[number]['key'];

function num(v: string | undefined): number {
  if (!v) return 0;
  const m = v.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}
function signedChange(v: string | undefined, tone: 'up' | 'down' | 'flat'): number {
  return tone === 'down' ? -Math.abs(num(v)) : Math.abs(num(v));
}
function hasNumber(v: string | undefined): boolean {
  return Boolean(v && /-?\d/.test(v));
}
function parseAum(v: string | undefined): number {
  if (!v) return 0;
  // "1조 2,345억" → 1.2345e12
  const t = v.replace(/,/g, '');
  let total = 0;
  const tri = t.match(/(\d+(?:\.\d+)?)\s*조/);
  if (tri) total += parseFloat(tri[1]) * 1e12;
  const eok = t.match(/(\d+(?:\.\d+)?)\s*억/);
  if (eok) total += parseFloat(eok[1]) * 1e8;
  if (!total) total = num(v);
  return total;
}
function parseVol(v: string | undefined): number {
  if (!v) return 0;
  // "12.5만주" → 125000
  const man = v.match(/(\d+(?:\.\d+)?)\s*만주/);
  if (man) return parseFloat(man[1]) * 10_000;
  return num(v);
}
function isMarketDataUsable(etf: EtfInfo): boolean {
  const source = etf.dataSource || 'database';
  return source !== 'static' && source !== 'missing';
}
function metricValue(etf: EtfInfo, key: SortKey): number {
  if (key === '수익률') return signedChange(etf.change, etf.changeTone);
  if (key === '순자산') return parseAum(etf.aum);
  if (key === '거래량') return parseVol(etf.volume);
  return 0;
}
function hasMetric(etf: EtfInfo, key: SortKey): boolean {
  if (!isMarketDataUsable(etf)) return false;
  if (key === '수익률') return hasNumber(etf.change);
  if (key === '순자산') return parseAum(etf.aum) > 0;
  if (key === '거래량') return parseVol(etf.volume) > 0;
  return true;
}
function rankSourcePriority(etf: EtfInfo, key: SortKey): number {
  if (key === '이름순' || !hasMetric(etf, key)) return 0;
  return etf.dataSource === 'naver' ? 1 : 0;
}
function compareMetric(a: EtfInfo, b: EtfInfo, key: SortKey): number {
  return (
    rankSourcePriority(b, key) - rankSourcePriority(a, key) ||
    Number(hasMetric(b, key)) - Number(hasMetric(a, key)) ||
    metricValue(b, key) - metricValue(a, key) ||
    a.shortName.localeCompare(b.shortName)
  );
}
function categoryMatch(etf: EtfInfo, cat: CategoryKey): boolean {
  if (cat === '전체') return true;
  const c = etf.category || '';
  const t = etf.theme || '';
  if (cat === '주식') return /국내주식|해외주식/.test(c);
  if (cat === '채권') return /채권/.test(c) || /채권/.test(t);
  if (cat === '원자재') return /원자재/.test(c) || /원자재|금|은|원유|구리/.test(t);
  if (cat === '테마') return /테마|커버드콜|레버리지|배당/.test(c);
  return true;
}

/** 레버리지·인버스(2X/3X 등) ETF 식별 — name·shortName·theme 텍스트 매칭 */
function isLeveraged(etf: EtfInfo): boolean {
  const text = `${etf.name} ${etf.shortName} ${etf.theme || ''}`.toLowerCase();
  return /레버리지|인버스|2x|3x|leverage|inverse/.test(text);
}

export function EtfRanking({ allEtfs }: { allEtfs: EtfInfo[] }) {
  const [sort, setSort] = useState<SortKey>('수익률');
  const [category, setCategory] = useState<CategoryKey>('전체');
  const [market, setMarket] = useState<MarketKey>('all');
  const [excludeLev, setExcludeLev] = useState(false);

  const ranked = useMemo(() => {
    const list = allEtfs.filter(e => {
      const c = (e.country || 'KR').toUpperCase();
      if (market === 'kr' && c !== 'KR') return false;
      if (market === 'us' && c !== 'US') return false;
      if (excludeLev && isLeveraged(e)) return false;
      return categoryMatch(e, category);
    });
    const sorted = [...list];
    if (sort === '수익률') {
      sorted.sort((a, b) => compareMetric(a, b, sort));
    } else if (sort === '순자산') {
      sorted.sort((a, b) => compareMetric(a, b, sort));
    } else if (sort === '거래량') {
      sorted.sort((a, b) => compareMetric(a, b, sort));
    } else if (sort === '이름순') {
      sorted.sort((a, b) => a.shortName.localeCompare(b.shortName));
    }
    return sorted.slice(0, 10);
  }, [allEtfs, sort, category, market, excludeLev]);

  return (
    <section className={sec.card} aria-label="ETF 랭킹 TOP 10">
      <div className={sec.head}>
        <h3 className={sec.title}>랭킹 TOP 10</h3>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setExcludeLev(v => !v)}
            style={{
              padding: '5px 10px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              border: excludeLev ? '1.5px solid var(--rw-primary)' : '1px solid var(--rw-hairline)',
              background: excludeLev ? 'var(--rw-primary-bg)' : 'transparent',
              color: excludeLev ? 'var(--rw-primary)' : 'var(--rw-text-muted)',
              cursor: 'pointer',
              transition: 'all .12s',
              whiteSpace: 'nowrap',
            }}
            aria-pressed={excludeLev}
            title="레버리지·인버스(2X/3X) 제외"
          >
            {excludeLev ? '✓ 레버리지 제외' : '레버리지 제외'}
          </button>
          <Badge tone="primary">{ranked.length}</Badge>
        </div>
      </div>

      {/* 상장 시장 */}
      <div className={`${sec.bleedScroller} ${styles.chipRow}`}>
        {MARKET_OPTIONS.map(opt => (
          <Chip key={opt.key} active={opt.key === market} size="sm" onClick={() => setMarket(opt.key)}>
            {opt.label}
          </Chip>
        ))}
      </div>

      {/* 정렬 기준 */}
      <div className={`${sec.bleedScroller} ${styles.chipRow}`}>
        {SORT_OPTIONS.map(opt => (
          <Chip key={opt} active={opt === sort} size="sm" onClick={() => setSort(opt)}>
            {opt}
          </Chip>
        ))}
      </div>

      {/* 카테고리 */}
      <div className={`${sec.bleedScroller} ${styles.chipRow}`}>
        {CATEGORY_OPTIONS.map(cat => (
          <Chip key={cat} active={cat === category} subtle size="sm" onClick={() => setCategory(cat)}>
            {cat}
          </Chip>
        ))}
      </div>

      <ol className={styles.list}>
        {ranked.length === 0 && (
          <li style={{ padding: '20px', color: 'var(--rw-text-muted)', fontSize: 13, textAlign: 'center' }}>
            조건에 맞는 ETF가 없어요.
          </li>
        )}
        {ranked.map((etf, idx) => (
          <li key={etf.slug}>
            <Link className={styles.item} href={etfPath(etf.slug)}>
              <span className={styles.rank}>{idx + 1}</span>
              <EtfLogo name={etf.shortName} code={etf.code} size={36} className={styles.logo} />
              <div className={styles.info}>
                <strong>{etf.shortName}</strong>
                <span>
                  {etf.price} <em className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</em>
                </span>
              </div>
              {(etf.country || 'KR').toUpperCase() === 'US' && (
                <span style={{ fontSize: 11, color: 'var(--rw-text-muted)', fontWeight: 700 }}>🇺🇸</span>
              )}
            </Link>
          </li>
        ))}
      </ol>

      <Link className={styles.more} href="/etf/all">
        전체 ETF 보기 →
      </Link>
    </section>
  );
}
