'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { etfPath, type EtfInfo } from '@/lib/etfs';
import { Card, Chip, Badge, Button } from '@/components/ui';
import { EtfCompareCard } from '@/components/sparring/EtfCompareCard';
import { EtfCompareChart } from './EtfCompareChart';
import { EtfLogo } from '../EtfLogo';
import styles from './EtfCompare.module.css';

function ETFPicker({
  side,
  current,
  candidates,
  onSelect,
}: {
  side: 'A' | 'B';
  current?: EtfInfo;
  candidates: EtfInfo[];
  onSelect: (etf: EtfInfo) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return candidates.slice(0, 8);
    return candidates
      .filter(e => (
        e.name.toLowerCase().includes(query) ||
        e.shortName.toLowerCase().includes(query) ||
        e.code.includes(query)
      ))
      .slice(0, 12);
  }, [candidates, q]);

  return (
    <Card pad="md" className={styles.picker}>
      <div className={styles.pickerHead}>
        <Badge tone="primary">{side}측</Badge>
        <h3>{current ? current.shortName : 'ETF를 골라주세요'}</h3>
        {current && (
          <span className={styles.pickerMeta}>
            {current.code} · {current.issuer}
          </span>
        )}
      </div>
      <input
        type="search"
        className={styles.pickerSearch}
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="이름·코드 검색"
      />
      <ul className={styles.pickerList}>
        {filtered.map(etf => (
          <li key={etf.slug}>
            <button
              type="button"
              className={`${styles.pickerItem} ${current?.slug === etf.slug ? styles.pickerItemActive : ''}`}
              onClick={() => onSelect(etf)}
            >
              <EtfLogo name={etf.shortName} code={etf.code} size={28} />
              <div className={styles.pickerItemInfo}>
                <strong>{etf.shortName}</strong>
                <span>{etf.code} · {etf.fee}</span>
              </div>
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className={styles.pickerEmpty}>검색 결과가 없어요.</li>
        )}
      </ul>
    </Card>
  );
}

export function EtfCompareClient({
  initialA,
  initialB,
  candidates,
}: {
  initialA?: EtfInfo;
  initialB?: EtfInfo;
  candidates: EtfInfo[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [a, setA] = useState<EtfInfo | undefined>(initialA);
  const [b, setB] = useState<EtfInfo | undefined>(initialB);

  const updateUrl = (nextA?: EtfInfo, nextB?: EtfInfo) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextA) params.set('a', nextA.code); else params.delete('a');
    if (nextB) params.set('b', nextB.code); else params.delete('b');
    const qs = params.toString();
    router.replace(`/etf/compare${qs ? `?${qs}` : ''}`);
  };

  const selectA = (etf: EtfInfo) => {
    setA(etf);
    updateUrl(etf, b);
  };
  const selectB = (etf: EtfInfo) => {
    setB(etf);
    updateUrl(a, etf);
  };
  const swap = () => {
    const oldA = a;
    setA(b);
    setB(oldA);
    updateUrl(b, oldA);
  };

  // A가 선택된 경우 B 후보에서 같은 theme → 같은 category → 나머지 순으로 정렬
  const bCandidates = useMemo(() => {
    const rest = candidates.filter(e => e.slug !== a?.slug);
    if (!a) return rest;
    return [...rest].sort((x, y) => {
      const scoreOf = (e: typeof x) =>
        e.theme === a.theme ? 2 : e.category === a.category ? 1 : 0;
      return scoreOf(y) - scoreOf(x);
    });
  }, [candidates, a]);

  // B가 선택된 경우 A 후보도 동일 로직
  const aCandidates = useMemo(() => {
    const rest = candidates.filter(e => e.slug !== b?.slug);
    if (!b) return rest;
    return [...rest].sort((x, y) => {
      const scoreOf = (e: typeof x) =>
        e.theme === b.theme ? 2 : e.category === b.category ? 1 : 0;
      return scoreOf(y) - scoreOf(x);
    });
  }, [candidates, b]);

  const bothSelected = a && b;

  return (
    <div className={styles.wrap}>
      <div className={styles.pickerGrid}>
        <ETFPicker side="A" current={a} candidates={aCandidates} onSelect={selectA} />
        <button
          type="button"
          className={styles.swapBtn}
          onClick={swap}
          disabled={!a || !b}
          aria-label="A와 B 바꾸기"
        >
          ⇄
        </button>
        <ETFPicker side="B" current={b} candidates={bCandidates} onSelect={selectB} />
      </div>

      {bothSelected ? (
        <>
          <EtfCompareChart etfA={a} etfB={b} />
          <EtfCompareCard etfA={a} etfB={b} />
          <div className={styles.detailLinks}>
            <Button href={etfPath(a.slug)} variant="outline" size="md">
              {a.shortName} 상세 →
            </Button>
            <Button href={etfPath(b.slug)} variant="outline" size="md">
              {b.shortName} 상세 →
            </Button>
          </div>
        </>
      ) : (
        <Card pad="lg" className={styles.empty}>
          <p>{!a && !b ? '비교할 두 ETF를 위에서 골라주세요.' : 'ETF 하나를 더 골라주세요.'}</p>
        </Card>
      )}
    </div>
  );
}
