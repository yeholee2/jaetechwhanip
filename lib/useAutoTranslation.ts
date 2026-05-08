'use client';

import { useEffect, useMemo, useState } from 'react';

export type AutoTranslationItem = {
  id: string;
  type?: string;
  text: string;
};

type TranslationState = Record<string, string>;

function shouldTranslateForBrowser() {
  if (typeof navigator === 'undefined') return false;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const primary = languages[0]?.toLowerCase() || '';
  return primary.startsWith('en') && !primary.startsWith('ko');
}

function hasKorean(text: string) {
  return /[ㄱ-ㅎ가-힣]/.test(text);
}

function storageKey(item: AutoTranslationItem) {
  return `translation:v1:en-US:${item.id}:${item.text}`;
}

export function useAutoTranslation(items: AutoTranslationItem[]) {
  const [enabled, setEnabled] = useState(false);
  const [translations, setTranslations] = useState<TranslationState>({});
  const normalized = useMemo(
    () => items
      .filter(item => item.id && item.text?.trim() && hasKorean(item.text))
      .map(item => ({ ...item, text: item.text.trim() }))
      .slice(0, 24),
    [JSON.stringify(items.map(item => [item.id, item.text]))],
  );
  const signature = useMemo(
    () => normalized.map(item => `${item.id}:${item.text}`).join('|'),
    [normalized],
  );

  useEffect(() => {
    setEnabled(shouldTranslateForBrowser());
  }, []);

  useEffect(() => {
    if (!enabled || normalized.length === 0) return;

    const cached: TranslationState = {};
    const missing: AutoTranslationItem[] = [];

    normalized.forEach(item => {
      const saved = window.localStorage.getItem(storageKey(item));
      if (saved) cached[item.id] = saved;
      else missing.push(item);
    });

    if (Object.keys(cached).length > 0) {
      setTranslations(prev => ({ ...prev, ...cached }));
    }

    if (missing.length === 0) return;

    let cancelled = false;
    fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetLocale: 'en-US', items: missing }),
    })
      .then(res => res.json())
      .then(data => {
        if (cancelled || !Array.isArray(data?.items)) return;

        const next: TranslationState = {};
        data.items.forEach((item: any) => {
          const source = missing.find(m => m.id === item.id);
          if (!source || !item.translated || typeof item.text !== 'string') return;
          next[item.id] = item.text;
          window.localStorage.setItem(storageKey(source), item.text);
        });

        if (Object.keys(next).length > 0) {
          setTranslations(prev => ({ ...prev, ...next }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, signature]);

  return {
    enabled,
    hasAny: Object.keys(translations).length > 0,
    text(id: string, fallback: string) {
      return translations[id] || fallback;
    },
    isTranslated(id: string) {
      return Boolean(translations[id]);
    },
  };
}
