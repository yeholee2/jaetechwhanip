'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, Heart } from 'lucide-react';
import { etfPath, getStaticEtfMetadata, type EtfInfo } from '@/lib/etfs';
import { addEtfWatch, listWatchedEtfCodes, subscribeWatchChanges, removeEtfWatch, syncEtfWatchFromServer } from '@/lib/etfWatch';
import { fetchEtfLivePrices, buildLivePriceMap, type EtfLivePrice } from '@/lib/etfLivePrices';
import { listRecentEtfSlugs } from '@/lib/recentActivity';
import { EtfLogo } from './EtfLogo';
import { Card, Button, Badge } from '@/components/ui';
import styles from './WatchList.module.css';

const staticEtfMetadata = getStaticEtfMetadata();
type SavedListView = 'recent' | 'watch';

export function WatchList({
  allEtfs,
  initialView = 'recent',
}: {
  allEtfs?: EtfInfo[];
  initialView?: SavedListView;
}) {
  const router = useRouter();
  const pool = allEtfs ?? staticEtfMetadata;
  const getEtfByCode = (code: string) => pool.find(e => e.code === code);
  const getEtfBySlug = (slug: string) => pool.find(e => e.slug === decodeURIComponent(slug));
  const [view, setView] = useState<SavedListView>(initialView);
  const [codes, setCodes] = useState<string[]>([]);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [priceMap, setPriceMap] = useState<Record<string, EtfLivePrice>>({});

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    setMounted(true);
    setCodes(listWatchedEtfCodes());
    setRecentSlugs(listRecentEtfSlugs());
    void syncEtfWatchFromServer();
    void fetchEtfLivePrices().then(res => {
      if (res?.items) setPriceMap(buildLivePriceMap(res.items));
    });
    const unsubscribeWatch = subscribeWatchChanges(setCodes);
    const refreshRecent = () => setRecentSlugs(listRecentEtfSlugs());
    window.addEventListener('focus', refreshRecent);
    window.addEventListener('visibilitychange', refreshRecent);
    return () => {
      unsubscribeWatch();
      window.removeEventListener('focus', refreshRecent);
      window.removeEventListener('visibilitychange', refreshRecent);
    };
  }, []);

  const changeView = (next: SavedListView) => {
    setView(next);
    router.replace(`/etf?tab=watch&view=${next}`, { scroll: false });
  };

  const toggleWatch = (code: string) => {
    if (codes.includes(code)) {
      removeEtfWatch(code);
      return;
    }
    addEtfWatch(code);
  };

  // 마운트 전: skeleton placeholder (layout shift 방지)
  if (!mounted) {
    return (
      <section className={styles.list} aria-busy="true" aria-label="저장한 ETF 불러오는 중">
        <SavedListSwitch view={view} onChange={changeView} recentCount={0} watchCount={0} />
        <div className={styles.listHead}>
          <h2>저장한 ETF</h2>
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

  const watchItems = codes
    .map(c => getEtfByCode(c))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const recentItems = recentSlugs
    .map(slug => getEtfBySlug(slug))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const items = view === 'recent' ? recentItems : watchItems;

  if (items.length === 0) {
    if (recentItems.length === 0 && watchItems.length === 0) {
      const samples = staticEtfMetadata.slice(0, 3);
      return (
        <section className={styles.list} aria-label="저장한 ETF">
          <SavedListSwitch
            view={view}
            onChange={changeView}
            recentCount={0}
            watchCount={0}
          />
          <Card pad="lg" className={styles.empty}>
            <div className={styles.emptyInner}>
              <Badge tone="primary">저장한 ETF</Badge>
              <h2 className={styles.emptyTitle}>ETF를 둘러보고 다시 볼 종목을 저장해보세요</h2>
              <p className={styles.emptyBody}>
                상세 화면을 열면 최근 본 ETF에 남고, ♡를 누르면 관심 ETF로 따로 모을 수 있어요.
              </p>

              <ul className={styles.samplePreview} aria-label="추천 ETF 예시">
                {samples.map(etf => (
                  <li key={etf.code}>
                    <a className={styles.sampleItem} href={etfPath(etf.slug)}>
                      <EtfLogo name={etf.shortName} code={etf.code} size={32} />
                      <div className={styles.sampleInfo}>
                        <strong>{etf.shortName}</strong>
                        <span>{etf.code}</span>
                      </div>
                      <div className={styles.sampleRight}>
                        <span className={styles.samplePrice}>{etf.issuer}</span>
                        <span>추천</span>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>

              <div className={styles.emptyActions}>
                <Button href="/etf/screener" variant="primary" size="md">ETF 골라보기</Button>
                <Button href="/etf" variant="outline" size="md">발견 탭</Button>
              </div>
            </div>
          </Card>
        </section>
      );
    }

    if (view === 'recent') {
      return (
        <section className={styles.list} aria-label="저장한 ETF">
          <SavedListSwitch
            view={view}
            onChange={changeView}
            recentCount={recentItems.length}
            watchCount={watchItems.length}
          />
          <Card pad="lg" className={styles.empty}>
            <div className={styles.emptyInner}>
              <Badge tone="primary">최근 본 ETF</Badge>
              <h2 className={styles.emptyTitle}>아직 최근 본 ETF가 없어요</h2>
              <p className={styles.emptyBody}>
                ETF 상세 화면을 열면 여기에 최근 본 종목이 차곡차곡 모여요.
              </p>
              <div className={styles.emptyActions}>
                <Button href="/etf/screener" variant="primary" size="md">ETF 골라보기</Button>
                <Button href="/etf" variant="outline" size="md">발견 탭</Button>
              </div>
            </div>
          </Card>
        </section>
      );
    }

    // 추천 ETF 3개를 sample preview 로 노출
    const samples = staticEtfMetadata.slice(0, 3);
    return (
      <section className={styles.list} aria-label="저장한 ETF">
        <SavedListSwitch
          view={view}
          onChange={changeView}
          recentCount={recentItems.length}
          watchCount={watchItems.length}
        />
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
                  <a className={styles.sampleItem} href={etfPath(etf.slug)}>
                    <EtfLogo name={etf.shortName} code={etf.code} size={32} />
                    <div className={styles.sampleInfo}>
                      <strong>{etf.shortName}</strong>
                      <span>{etf.code}</span>
                    </div>
                    <div className={styles.sampleRight}>
                      <span className={styles.samplePrice}>{etf.issuer}</span>
                      <span>예시</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            <p className={styles.sampleNote}>추천 ETF 예시. ♡를 누르면 내 리스트로 추가돼요.</p>

            <div className={styles.emptyActions}>
              <Button href="/etf/screener" variant="primary" size="md">ETF 스크리너</Button>
              <Button href="/etf" variant="outline" size="md">발견 탭</Button>
            </div>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className={styles.list} aria-label="저장한 ETF">
      <SavedListSwitch
        view={view}
        onChange={changeView}
        recentCount={recentItems.length}
        watchCount={watchItems.length}
      />
      <div className={styles.listHead}>
        <div>
          <h2>
            {view === 'recent' ? '최근 본 ETF' : '관심 ETF'}
            <span className={styles.headCount}>
              {view === 'recent'
                ? `최근 ${Math.min(items.length, 10)}개`
                : `관심 ${Math.min(items.length, 10)}개`}
            </span>
          </h2>
          <p className={styles.headSub}>
            {view === 'recent' ? '최근 열어본 순서대로 다시 확인해요' : '관심 그룹에 담아보세요'}
          </p>
        </div>
      </div>
      <ul>
        {items.slice(0, 10).map(etf => {
          const live = priceMap[etf.code];
          const price = live?.price || etf.price || '';
          const change = live?.change || etf.change || '';
          const tone = live?.changeTone || etf.changeTone;
          const watched = codes.includes(etf.code);
          return (
            <li key={etf.slug}>
              <a
                className={styles.item}
                href={etfPath(etf.slug)}
              >
                <EtfLogo name={etf.shortName} code={etf.code} size={44} />
                <div className={styles.info}>
                  <strong>{etf.shortName}</strong>
                  <span>{etf.code}{etf.issuer ? ` · ${etf.issuer}` : ''}</span>
                </div>
                <div className={styles.right}>
                  {price ? (
                    <span className={styles.price}>{price}</span>
                  ) : (
                    <span className={styles.priceMuted}>시세 미연동</span>
                  )}
                  {change && <span className={tone === 'down' ? styles.down : styles.up}>{change}</span>}
                </div>
              </a>
              <button
                type="button"
                className={`${styles.heartBtn} ${watched ? styles.heartActive : ''}`}
                onClick={() => toggleWatch(etf.code)}
                aria-pressed={watched}
                aria-label={`${etf.shortName} ${watched ? '관심 해제' : '관심 등록'}`}
                title={watched ? '관심 해제' : '관심 등록'}
              >
                <Heart size={21} fill={watched ? 'currentColor' : 'none'} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SavedListSwitch({
  view,
  onChange,
  recentCount,
  watchCount,
}: {
  view: SavedListView;
  onChange: (view: SavedListView) => void;
  recentCount: number;
  watchCount: number;
}) {
  const items: { key: SavedListView; label: string; count: number; icon: ReactNode }[] = [
    { key: 'recent', label: '최근 본', count: recentCount, icon: <Clock3 size={15} /> },
    { key: 'watch', label: '관심', count: watchCount, icon: <Heart size={15} /> },
  ];

  return (
    <div className={styles.switchWrap}>
      <div className={styles.switcher} role="tablist" aria-label="저장한 ETF 보기">
        {items.map(item => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={view === item.key}
            className={`${styles.switchButton} ${view === item.key ? styles.switchActive : ''}`}
            onClick={() => onChange(item.key)}
          >
            {item.icon}
            <span>{item.label}</span>
            <b>{item.count}</b>
          </button>
        ))}
      </div>
    </div>
  );
}
