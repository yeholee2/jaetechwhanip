'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../admin.module.css';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function AdminQuestionsClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [busy, setBusy] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter(i => {
      if (cat !== 'all' && i.category !== cat) return false;
      if (query && !i.title?.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, q, cat]);

  const remove = async (id: string, title: string) => {
    if (!confirm(`이 질문을 삭제할까요?\n\n"${title}"\n\n답변·댓글도 함께 사라집니다.`)) return;
    setBusy(id);
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: 'questions', id }),
    });
    const json = await res.json();
    setBusy(null);
    if (!json.ok) {
      alert('삭제 실패: ' + (json.error || 'unknown'));
      return;
    }
    setItems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <>
      <div className={styles.head}>
        <h1>질문 관리</h1>
        <p>최근 200개. 검색·카테고리 필터로 빠르게 찾아 삭제할 수 있어요.</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="search"
          placeholder="제목 검색"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
        <select
          value={cat}
          onChange={e => setCat(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 14,
            background: 'var(--white)',
          }}
        >
          <option value="all">전체 카테고리</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>{filtered.length}개 질문</h2>
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>일치하는 질문이 없어요.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>제목</th>
                <th>카테고리</th>
                <th>작성자</th>
                <th>답변</th>
                <th>추천</th>
                <th>조회</th>
                <th>등록</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/q/${item.slug || item.id}`} className={styles.cellTitle} target="_blank">
                      {item.title}
                    </Link>
                  </td>
                  <td>{item.category}</td>
                  <td>{(item.users as any)?.name || '익명'}</td>
                  <td>{item.answer_count || 0}</td>
                  <td>{item.like_count || 0}</td>
                  <td>{item.view_count || 0}</td>
                  <td>{fmtTime(item.created_at)}</td>
                  <td>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.danger}`}
                      onClick={() => remove(item.id, item.title)}
                      disabled={busy === item.id}
                    >
                      {busy === item.id ? '삭제중…' : '삭제'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
