'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { etfPath, etfs, type EtfInfo } from '@/lib/etfs';
import { listWatchedEtfCodes, subscribeWatchChanges, removeEtfWatch, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import { EtfLogo } from './EtfLogo';
import { Card, Button, Badge } from '@/components/ui';
import styles from './WatchList.module.css';

export function WatchList({ allEtfs }: { allEtfs?: EtfInfo[] }) {
  const pool = allEtfs ?? etfs;
  const getEtfByCode = (code: string) => pool.find(e => e.code === code);
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

  // 마운트 전: skeleton placeholder (layout shift 방지)
  if (!mounted) {
    return (
      <section className={styles.list} aria-busy="true" aria-label="내 관심 ETF 불러오는 중">
        <div className={styles.listHead}>
          <h2>내 관심 ETF</h2>
        </div>
        <ul>
          {[1, 2, 3].map(i => (
            <li key={i}>
              <div className={styles.skeletonItem} aria-hidden="true">
                <span className={styles.skelLogo} />
                <span className={styles.skelText} />
                <span className={styles.skelPrice} />
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const items = codes
    .map(c => getEtfByCode(c))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  if (items.length === 0) {
    // 추천 ETF 3개를 sample preview 로 노출
    const samples = etfs.slice(0, 3);
    return (
      <Card pad="lg" className={styles.empty}>
        <div className={styles.emptyInner}>
          <Badge tone="primary">관심 ETF</Badge>
          <h2 className={styles.emptyTitle}>♡ 한 번 누르면 이렇게 모여요</h2>
          <p className={styles.emptyBody}>
            ETF 상세 페이지에서 ♡를 누르면 시세를 한 화면에서 추적할 수 있어요.
          </p>

          {/* 샘플 미리보기 */}
          <ul className={styles.samplePreview} aria-label="예시 미리보기">
            {samples.map(etf => (
              <li key={etf.code}>
                <Link className={styles.sampleItem} href={etfPath(etf.slug)}>
                  <EtfLogo name={etf.shortName} code={etf.code} size={32} />
                  <div className={styles.sampleInfo}>
                    <strong>{etf.shortName}</strong>
                    <span>{etf.code}</span>
                  </div>
                  <div className={styles.sampleRight}>
                    <span className={styles.samplePrice}>{etf.price}</span>
                    <span className={etf.changeTone === 'down' ? styles.down : styles.up}>{etf.change}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className={styles.sampleNote}>↑ 추천 ETF 예시. ♡를 누르면 내 리스트로 추가돼요.</p>

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
        <div>
          <h2>관심 ETF <span className={styles.headCount}>TOP {Math.min(items.length, 10)}</span></h2>
          <p className={styles.headSub}>관심 그룹에 담아보세요</p>
        </div>
      </div>
      <ul>
        {items.slice(0, 10).map(etf => {
          const live = priceMap[etf.code];
          const price = live?.price || etf.price;
          const change = live?.change || etf.change;
          const tone = live?.changeTone || etf.changeTone;
          return (
            <li key={etf.slug}>
              <Link className={styles.item} href={etfPath(etf.slug)}>
                <EtfLogo name={etf.shortName} code={etf.code} size={44} />
                <div className={styles.info}>
                  <strong>{etf.shortName}</strong>
                  <span>{etf.code}{etf.issuer ? ` · ${etf.issuer}` : ''}</span>
                </div>
                <div className={styles.right}>
                  <span className={styles.price}>{price}</span>
                  <span className={tone === 'down' ? styles.down : styles.up}>{change}</span>
                </div>
              </Link>
              <button
                type="button"
                className={styles.heartBtn}
                onClick={() => removeEtfWatch(etf.code)}
                aria-label={`${etf.shortName} 관심 해제`}
                title="관심 해제"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 21s-7.5-4.8-9.6-9.4C1 8.2 3 4.8 6.5 4.8c1.9 0 3.5 1.1 4.4 2.6h.2c.9-1.5 2.5-2.6 4.4-2.6 3.5 0 5.5 3.4 4.1 6.8C19.5 16.2 12 21 12 21z"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
