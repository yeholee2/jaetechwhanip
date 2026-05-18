'use client';

/**
 * 관련 칼럼 사이드바 위젯.
 * 잠금 없거나 부분잠금 글만 노출 (멤버 전용 글은 후킹 못 함).
 *
 * 데이터 소스: creator_posts (is_member_only=false 만)
 * 추후 sector·tag 매칭 확장 여지 — 현재는 최신 발행 4개.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './ColumnsWidget.module.css';

type ColumnRow = {
  slug: string;
  title: string;
  preview: string | null;
  published_at: string;
  creator_slug: string;
  creator_name: string;
};

export function ColumnsWidget() {
  const [rows, setRows] = useState<ColumnRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) { setLoaded(true); return; }
    const supabase = createClient();
    const nowIso = new Date().toISOString();
    (async () => {
      const { data } = await supabase
        .from('creator_posts')
        .select('slug, title, preview, body, published_at, creators:creator_id(slug, display_name)')
        .eq('is_published', true)
        .eq('is_member_only', false)
        .or(`publish_at.is.null,publish_at.lte.${nowIso}`)
        .order('published_at', { ascending: false })
        .limit(8);
      // 인라인 페이월(전체 본문 잠금까지는 아님)도 OK — 본문 일부는 비멤버 노출되는 글은 후킹 가능
      // 단, 완전 멤버 전용은 is_member_only=true 로 이미 필터됨
      const filtered = (data || []).slice(0, 4).map((p: any) => ({
        slug: p.slug,
        title: p.title,
        preview: p.preview,
        published_at: p.published_at,
        creator_slug: p.creators?.slug || '',
        creator_name: p.creators?.display_name || '',
      })) as ColumnRow[];
      setRows(filtered);
      setLoaded(true);
    })().catch(() => setLoaded(true));
  }, []);

  // 비로그인이거나 칼럼이 없으면 위젯 자체 미노출 — 빈 카드 안 깔리게
  if (!loaded || rows.length === 0) return null;

  return (
    <div className={styles.widget}>
      <div className={styles.head}>
        <strong>관련 칼럼</strong>
        <Link href="/creators" className={styles.more}>더보기</Link>
      </div>
      <ul className={styles.list}>
        {rows.map(r => (
          <li key={r.slug}>
            <Link href={`/creator/${encodeURIComponent(r.creator_slug)}/posts/${encodeURIComponent(r.slug)}`} className={styles.item}>
              <strong className={styles.itemTitle}>{r.title}</strong>
              <span className={styles.itemMeta}>{r.creator_name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
