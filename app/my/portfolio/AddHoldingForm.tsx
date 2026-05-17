'use client';

/**
 * 종목 추가 폼 — 자동완성 + 수량·평단·메모.
 */

import { useEffect, useRef, useState } from 'react';
import styles from './Portfolio.module.css';

type SearchResult = {
  symbol: string;
  name: string;
  currency: 'KRW' | 'USD';
  exchange?: string;
  kind?: 'stock' | 'etf';
};

export function AddHoldingForm({ onAdded }: { onAdded: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState('');
  const [avgCost, setAvgCost] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (picked) return; // 선택했으면 검색 중단
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 1) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/symbol/search?q=${encodeURIComponent(query)}`);
        if (!r.ok) return;
        const j = await r.json();
        setResults(j.results || []);
      } catch { /* ignore */ }
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, picked]);

  const submit = async () => {
    setErr('');
    if (!picked) { setErr('종목을 검색해서 선택해주세요.'); return; }
    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) { setErr('수량을 정확히 입력해주세요.'); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/portfolio/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: picked.symbol,
          name: picked.name,
          quantity: q,
          avgCost: avgCost ? Number(avgCost) : null,
          currency: picked.currency,
          memo: memo || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || '저장 실패'); return; }
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.addForm}>
      <div className={styles.addRow}>
        <div className={styles.searchWrap}>
          <label>종목 검색</label>
          <input
            type="text"
            value={picked ? `${picked.name} (${picked.symbol})` : query}
            onChange={e => { setQuery(e.target.value); setPicked(null); }}
            placeholder="삼성전자, AAPL, KODEX 200 ..."
            className={styles.input}
          />
          {!picked && results.length > 0 && (
            <ul className={styles.searchList}>
              {results.map(r => (
                <li key={r.symbol}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(r);
                      setResults([]);
                      setQuery('');
                    }}
                  >
                    <strong>{r.name}</strong>
                    <span>{r.symbol} · {r.exchange || (r.currency === 'KRW' ? 'KRX' : 'US')} {r.kind === 'etf' && ' · ETF'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.addRow}>
        <div>
          <label>수량</label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="10"
            min={0}
            step="0.0001"
            className={styles.input}
          />
        </div>
        <div>
          <label>평균 매입가 (선택)</label>
          <input
            type="number"
            value={avgCost}
            onChange={e => setAvgCost(e.target.value)}
            placeholder={picked?.currency === 'USD' ? '180.50' : '75,000'}
            min={0}
            step="0.01"
            className={styles.input}
          />
        </div>
      </div>

      <div>
        <label>메모 (선택)</label>
        <input
          type="text"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="장기 보유, 배당 목적 등"
          className={styles.input}
          maxLength={200}
        />
      </div>

      {err && <div className={styles.errorBox}>{err}</div>}

      <div className={styles.formActions}>
        <button type="button" onClick={submit} disabled={saving} className={styles.primaryBtn}>
          {saving ? '저장 중…' : '추가'}
        </button>
      </div>
    </div>
  );
}
