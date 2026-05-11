'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { etfPath, getEtfByCode } from '@/lib/etfs';
import { listWatchedEtfCodes, subscribeWatchChanges, removeEtfWatch, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import { EtfLogo } from './EtfLogo';
import { Card, Button, Badge } from '@/components/ui';
import styles from './WatchList.module.css';

export function WatchList() {
  const [codes, setCodes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, EtfLivePrice>>({});

  useEffect(() => {
    setMounted(true);
    setCodes(listWatchedEtfCodes());
    void syncEtfWatchFromServer();

    // 실시간 시세 fetch (API 키 없으면 fallback)
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(buildLivePriceMap(res.items));
    });

    return subscribeWatchChanges(setCodes);
  }, []);

  if (!mounted) return null;

  const items = codes
    .map(c => getEtfByCode(c))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  if (items.length === 0) {
    return (
      <Card pad="lg" className={styles.empty}>
        <div className={styles.emptyInner}>
          <Badge tone="primary">관심 ETF</Badge>
          <h2 className={styles.emptyTitle}>아직 등록한 관심 ETF가 없어요</h2>
          <p className={styles.emptyBody}>
            ETF 상세 페이지의 <strong>♡ 관심</strong> 버튼을 누르면 이곳에 모여요.
            시세·뉴스·분배금을 한눈에 볼 수 있게 준비할게요.
          </p>
          <div className={styles.emptyActions}>
            <Button href="/etf/all" variant="primary" size="md">전체 ETF 검색</Button>
            <Button href="/etf" variant="outline" size="md">발견 탭</Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section className={styles.list} aria-label="내 관심 ETF">
      <div className={styles.listHead}>
        <h2>내 관심 ETF</h2>
        <span>{items.length}개</span>
      </div>
      <ul>
        {items.map(etf => {
          const live = priceMap[etf.code];
          const price = live?.price || etf.price;
          const change = live?.change || etf.change;
          const tone = live?.changeTone || etf.changeTone;
          return (
            <li key={etf.slug}>
              <Link className={styles.item} href={etfPath(etf.slug)}>
                <EtfLogo name={etf.shortName} size={36} />
                <div className={styles.info}>
                  <strong>{etf.shortName}</strong>
                  <span>{etf.code} · {etf.issuer}</span>
                </div>
                <div className={styles.right}>
                  <span className={styles.price}>{price}</span>
                  <span className={tone === 'down' ? styles.down : styles.up}>
                    {change}
                  </span>
                </div>
              </Link>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeEtfWatch(etf.code)}
                aria-label={`${etf.shortName} 관심 해제`}
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
