'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { etfPath, getEtfByCode } from '@/lib/etfs';
import { listWatchedEtfCodes, subscribeWatchChanges, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import styles from './HomeWatchWidget.module.css';

/**
 * 홈 우 사이드바: 내 관심 ETF 미니 리스트.
 * 비로그인 + 등록 0건 시: 빈 안내 카드.
 */
export function HomeWatchWidget() {
  const [codes, setCodes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, EtfLivePrice>>({});

  useEffect(() => {
    setMounted(true);
    setCodes(listWatchedEtfCodes());
    void syncEtfWatchFromServer();
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(buildLivePriceMap(res.items));
    });
    return subscribeWatchChanges(setCodes);
  }, []);

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
    .map(c => getEtfByCode(c))
    .filter((e): e is NonNullable<typeof e> => Boolean(e))
    .slice(0, 5);

  if (items.length === 0) {
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
          const change = live?.change || etf.change;
          const tone = live?.changeTone || etf.changeTone;
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
