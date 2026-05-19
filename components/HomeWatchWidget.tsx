'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { etfPath } from '@/lib/etfs';
import { listWatchedEtfCodes, subscribeWatchChanges, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import { listRecentEtfSlugs, subscribeRecentEtfChanges } from '@/lib/recentActivity';
import styles from './HomeWatchWidget.module.css';

import { EtfLogo } from '@/app/etf/EtfLogo';

type EtfMeta = {
  code: string;
  shortName: string;
  slug: string;
  issuer: string;
  price?: string;
  change?: string;
  changeTone?: 'up' | 'down' | 'flat';
};
type SavedView = 'recent' | 'watch';

async function fetchEtfMeta({
  codes = [],
  slugs = [],
}: {
  codes?: string[];
  slugs?: string[];
}): Promise<EtfMeta[]> {
  if (codes.length === 0 && slugs.length === 0) return [];
  try {
    const params = new URLSearchParams();
    if (codes.length > 0) params.set('codes', codes.join(','));
    if (slugs.length > 0) params.set('slugs', slugs.join(','));
    const res = await fetch(`/api/etf/meta?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json() as { items: EtfMeta[] };
    return data.items ?? [];
  } catch {
    return [];
  }
}

/**
 * 홈 우 사이드바: 내 관심 ETF 미니 리스트.
 * 비로그인 + 등록 0건 시: 빈 안내 카드.
 */
export function HomeWatchWidget() {
  const [codes, setCodes] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [view, setView] = useState<SavedView>('recent');
  const [mounted, setMounted] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, EtfLivePrice>>({});
  const [metaByCode, setMetaByCode] = useState<Record<string, EtfMeta>>({});
  const [metaBySlug, setMetaBySlug] = useState<Record<string, EtfMeta>>({});

  const mergeMeta = (items: EtfMeta[]) => {
    setMetaByCode(prev => {
      const next = { ...prev };
      for (const item of items) next[item.code] = item;
      return next;
    });
    setMetaBySlug(prev => {
      const next = { ...prev };
      for (const item of items) next[normalizeSlug(item.slug)] = item;
      return next;
    });
  };

  const loadMeta = (nextCodes: string[], nextSlugs: string[]) => {
    void fetchEtfMeta({
      codes: nextCodes.slice(0, 8),
      slugs: nextSlugs.slice(0, 8),
    }).then(mergeMeta);
  };

  useEffect(() => {
    setMounted(true);
    const initialCodes = listWatchedEtfCodes();
    const initialSlugs = listRecentEtfSlugs();
    setCodes(initialCodes);
    setRecentSlugs(initialSlugs);
    setView(initialSlugs.length > 0 ? 'recent' : 'watch');
    loadMeta(initialCodes, initialSlugs);
    void syncEtfWatchFromServer();
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(buildLivePriceMap(res.items));
    });
    const unsubscribeWatch = subscribeWatchChanges(next => {
      setCodes(next);
      loadMeta(next, listRecentEtfSlugs());
    });
    const refreshRecent = () => {
      const next = listRecentEtfSlugs();
      setRecentSlugs(next);
      loadMeta(listWatchedEtfCodes(), next);
    };
    const unsubscribeRecent = subscribeRecentEtfChanges(next => {
      setRecentSlugs(next);
      loadMeta(listWatchedEtfCodes(), next);
    });
    window.addEventListener('focus', refreshRecent);
    window.addEventListener('visibilitychange', refreshRecent);
    return () => {
      unsubscribeWatch();
      unsubscribeRecent();
      window.removeEventListener('focus', refreshRecent);
      window.removeEventListener('visibilitychange', refreshRecent);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return;
    if (view === 'recent' && recentSlugs.length === 0 && codes.length > 0) setView('watch');
    if (view === 'watch' && codes.length === 0 && recentSlugs.length > 0) setView('recent');
  }, [codes.length, mounted, recentSlugs.length, view]);

  if (!mounted) {
    return (
      <div className={styles.widget} aria-busy="true">
        <div className={styles.head}>
          <span className={styles.title}>최근·관심 ETF</span>
        </div>
        <ul className={styles.list}>
          {[1, 2, 3].map(i => (
            <li key={i} className={styles.skelRow}>
              <span className={styles.skelName} />
              <span className={styles.skelChange} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const watchItems = codes
    .map(c => metaByCode[c])
    .filter((e): e is EtfMeta => Boolean(e))
    .slice(0, 5);
  const recentItems = recentSlugs
    .map(slug => metaBySlug[normalizeSlug(slug)])
    .filter((e): e is EtfMeta => Boolean(e))
    .slice(0, 5);
  const items = view === 'recent' ? recentItems : watchItems;
  const hasSaved = codes.length > 0 || recentSlugs.length > 0;

  // 코드는 있는데 메타가 아직 로드 중이면 스켈레톤 유지
  if (hasSaved && items.length === 0) {
    return (
      <div className={styles.widget} aria-busy="true">
        <div className={styles.head}>
          <span className={styles.title}>최근·관심 ETF</span>
        </div>
        <SavedSwitch view={view} onChange={setView} recentCount={recentSlugs.length} watchCount={codes.length} />
        <ul className={styles.list}>
          {[1, 2, 3].map(i => (
            <li key={i} className={styles.skelRow}>
              <span className={styles.skelName} />
              <span className={styles.skelChange} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!hasSaved) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyHead}>최근·관심 ETF</div>
        <p>상세 화면을 열면 최근 본 종목이 남고, 관심 등록하면 시세를 한눈에 추적할 수 있어요.</p>
        <Link href="/etf/all" className={styles.more}>ETF 둘러보기 →</Link>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.title}>
            {view === 'recent' ? '최근 본 ETF' : '관심 ETF'}
            <span className={styles.count}>{items.length}</span>
          </h3>
          <p className={styles.sub}>최근 본 종목과 관심 종목을 바로 확인해요</p>
        </div>
        <Link href={`/etf?tab=watch&view=${view}`} className={styles.moreLink}>전체 →</Link>
      </div>
      <SavedSwitch view={view} onChange={setView} recentCount={recentSlugs.length} watchCount={codes.length} />
      <ul className={styles.list}>
        {items.map(etf => {
          const live = priceMap[etf.code];
          const price = live?.price || etf.price || '—';
          const change = live?.change || etf.change || '—';
          const tone = (live?.changeTone || etf.changeTone || 'flat') as 'up' | 'down' | 'flat';
          return (
            <li key={etf.code}>
              <Link className={styles.item} href={etfPath(etf.slug)}>
                <EtfLogo name={etf.shortName} code={etf.code} size={36} />
                <span className={styles.name}>{etf.shortName}</span>
                <span className={styles.right}>
                  <strong>{price}</strong>
                  <em className={tone === 'down' ? styles.down : styles.up}>{change}</em>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function normalizeSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function SavedSwitch({
  view,
  onChange,
  recentCount,
  watchCount,
}: {
  view: SavedView;
  onChange: (view: SavedView) => void;
  recentCount: number;
  watchCount: number;
}) {
  return (
    <div className={styles.switcher} role="tablist" aria-label="ETF 저장 목록">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'recent'}
        className={`${styles.switchButton} ${view === 'recent' ? styles.switchActive : ''}`}
        onClick={() => onChange('recent')}
      >
        최근 본 <span>{recentCount}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'watch'}
        className={`${styles.switchButton} ${view === 'watch' ? styles.switchActive : ''}`}
        onClick={() => onChange('watch')}
      >
        관심 <span>{watchCount}</span>
      </button>
    </div>
  );
}
