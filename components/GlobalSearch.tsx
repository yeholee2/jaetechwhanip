'use client';

/**
 * 글로벌 검색 (⌘+K) — Q&A + ETF + 크리에이터 + 블로그 통합.
 *
 * - ⌘+K (mac) / Ctrl+K (win) 으로 토글
 * - ESC 로 닫기
 * - 검색어 입력 시 디바운스 후 /api/search 호출
 * - 카테고리별 그룹핑 (ETF / 재프콘 / Q&A / 블로그)
 * - ↑↓ 화살표 키 탐색 + Enter 진입
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { SearchHit } from '@/app/api/search/route';
import styles from './GlobalSearch.module.css';

const KIND_LABEL: Record<SearchHit['kind'], { label: string; emoji: string }> = {
  etf: { label: 'ETF', emoji: '📊' },
  creator: { label: '재프콘', emoji: '✨' },
  qa: { label: 'Q&A', emoji: '💬' },
  blog: { label: '재테크 한입 블로그', emoji: '📰' },
};

const ORDER: SearchHit['kind'][] = ['etf', 'creator', 'qa', 'blog'];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen(v => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // 열릴 때 input focus + 검색어 초기화
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
      setHits([]);
      setCursor(0);
    }
  }, [open]);

  // 디바운스 검색
  useEffect(() => {
    if (!open || !query.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        if (!r.ok) return;
        const j = await r.json();
        if (!cancelled) {
          setHits(j.hits || []);
          setCursor(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  // 그룹 정렬 (kind 순서대로)
  const ordered = useMemo(() => {
    const groups: Record<SearchHit['kind'], SearchHit[]> = { etf: [], creator: [], qa: [], blog: [] };
    for (const h of hits) groups[h.kind].push(h);
    const out: SearchHit[] = [];
    for (const k of ORDER) out.push(...groups[k]);
    return out;
  }, [hits]);

  const move = useCallback((delta: number) => {
    if (ordered.length === 0) return;
    setCursor(c => (c + delta + ordered.length) % ordered.length);
  }, [ordered.length]);

  const submit = useCallback(() => {
    const target = ordered[cursor];
    if (!target) return;
    setOpen(false);
    if (target.url.startsWith('http')) {
      window.open(target.url, '_blank', 'noopener,noreferrer');
    } else {
      router.push(target.url);
    }
  }, [ordered, cursor, router]);

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  };

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={() => setOpen(false)} role="presentation">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>
        <div className={styles.searchRow}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="ETF · 크리에이터 · 질문 · 블로그를 검색하세요"
            className={styles.input}
          />
          <kbd className={styles.kbd}>ESC</kbd>
        </div>

        <div className={styles.results}>
          {!query.trim() ? (
            <div className={styles.hint}>
              <strong>빠른 검색 가이드</strong>
              <ul>
                <li>📊 ETF 코드·이름·테마 (예: <code>VOO</code>, <code>반도체</code>)</li>
                <li>✨ 크리에이터 이름 또는 소개</li>
                <li>💬 Q&A 제목 또는 본문</li>
                <li>📰 재테크 한입 블로그 글</li>
              </ul>
              <p className={styles.hintFoot}>
                <kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 열기 · <kbd>ESC</kbd> 닫기
              </p>
            </div>
          ) : loading && ordered.length === 0 ? (
            <div className={styles.empty}>검색 중…</div>
          ) : ordered.length === 0 ? (
            <div className={styles.empty}>
              <strong>"{query}" 결과 없음</strong>
              <span>다른 키워드로 시도해 보세요.</span>
            </div>
          ) : (
            <GroupedList ordered={ordered} cursor={cursor} onPick={(i) => { setCursor(i); submit(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function GroupedList({
  ordered,
  cursor,
  onPick,
}: {
  ordered: SearchHit[];
  cursor: number;
  onPick: (i: number) => void;
}) {
  // 카테고리 그룹별로 헤더 + 항목 렌더, 글로벌 index 로 cursor 매칭
  const sections: { kind: SearchHit['kind']; items: { hit: SearchHit; index: number }[] }[] = [];
  let idx = 0;
  const seen = new Map<SearchHit['kind'], { hit: SearchHit; index: number }[]>();
  for (const k of ORDER) seen.set(k, []);
  for (const h of ordered) {
    seen.get(h.kind)!.push({ hit: h, index: idx++ });
  }
  for (const k of ORDER) {
    const items = seen.get(k)!;
    if (items.length) sections.push({ kind: k, items });
  }

  return (
    <>
      {sections.map(sec => (
        <section key={sec.kind} className={styles.section}>
          <header className={styles.sectionHead}>
            <span className={styles.sectionEmoji}>{KIND_LABEL[sec.kind].emoji}</span>
            <span>{KIND_LABEL[sec.kind].label}</span>
            <span className={styles.sectionCount}>{sec.items.length}</span>
          </header>
          <ul className={styles.list}>
            {sec.items.map(({ hit, index }) => (
              <li
                key={hit.id}
                className={`${styles.item} ${index === cursor ? styles.itemOn : ''}`}
                onMouseEnter={() => { /* hover hint only */ }}
              >
                <Link
                  href={hit.url}
                  target={hit.url.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={styles.itemLink}
                  onClick={(e) => {
                    e.preventDefault();
                    onPick(index);
                  }}
                >
                  <div className={styles.itemBody}>
                    <strong>{hit.title}</strong>
                    {hit.subtitle && <span>{hit.subtitle}</span>}
                  </div>
                  {hit.meta && <span className={styles.itemMeta}>{hit.meta}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
