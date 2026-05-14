'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { etfPath } from '@/lib/etfs';
import { listWatchedEtfCodes, subscribeWatchChanges, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import styles from './HomeWatchWidget.module.css';

type EtfMeta = { code: string; shortName: string; slug: string; issuer: string };

async function fetchEtfMeta(codes: string[]): Promise<EtfMeta[]> {
  if (codes.length === 0) return [];
  try {
    const res = await fetch(`/api/etf/meta?codes=${codes.join(',')}`, { cache: 'no-store' });
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
  const [mounted, setMounted] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, EtfLivePrice>>({});
  const [metaMap, setMetaMap] = useState<Record<string, EtfMeta>>({});

  useEffect(() => {
    setMounted(true);
    const initial = listWatchedEtfCodes();
    setCodes(initial);
    void syncEtfWatchFromServer();
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(buildLivePriceMap(res.items));
    });
    return subscribeWatchChanges(next => {
      setCodes(next);
      // 새 코드에 대한 메타 조회
      const unknown = next.filter(c => !metaMap[c]);
      if (unknown.length > 0) {
        void fetchEtfMeta(next).then(items => {
          setMetaMap(prev => {
            const m = { ...prev };
            for (const item of items) m[item.code] = item;
            return m;
          });
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 마운트 시 최초 메타 로드
  useEffect(() => {
    if (!mounted || codes.length === 0) return;
    void fetchEtfMeta(codes).then(items => {
      setMetaMap(prev => {
        const m = { ...prev };
        for (const item of items) m[item.code] = item;
        return m;
      });
    });
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) {
    return (
      <div className={styles.widget} aria-busy="true">
        <div className={styles.head}>
          <span className={styles.title}>내 관심 ETF</span>
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

  const items = codes
    .map(c => metaMap[c])
    .filter((e): e is EtfMeta => Boolean(e))
    .slice(0, 5);

  // 코드는 있는데 메타가 아직 로드 중이면 스켈레톤 유지
  if (codes.length > 0 && items.length === 0) {
    return (
      <div className={styles.widget} aria-busy="true">
        <div className={styles.head}>
          <span className={styles.title}>내 관심 ETF</span>
        </div>
        <ul className={styles.list}>
          {codes.slice(0, 3).map(c => (
            <li key={c} className={styles.skelRow}>
              <span className={styles.skelName} />
              <span className={styles.skelChange} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <Link href="/etf/all" className={styles.empty}>
        <div className={styles.emptyHead}>내 관심 ETF</div>
        <p>관심 등록하면 시세를 한눈에 추적할 수 있어요.</p>
        <span className={styles.more}>ETF 둘러보기 →</span>
      </Link>
    );
  }

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <span className={styles.title}>내 관심 ETF</span>
        <Link href="/etf?tab=watch" className={styles.moreLink}>전체 →</Link>
      </div>
      <ul className={styles.list}>
        {items.map(etf => {
          const live = priceMap[etf.code];
          const change = live?.change ?? '—';
          const tone = live?.changeTone ?? 'flat';
          return (
            <li key={etf.code}>
              <Link className={styles.item} href={etfPath(etf.slug)}>
                <span className={styles.name}>{etf.shortName}</span>
                <span className={tone === 'down' ? styles.down : styles.up}>{change}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
