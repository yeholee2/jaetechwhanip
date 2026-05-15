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

export default function AdminAnswersClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(i =>
      i.body?.toLowerCase().includes(query) ||
      (i.questions as any)?.title?.toLowerCase().includes(query)
    );
  }, [items, q]);

  const remove = async (id: string) => {
    if (!confirm('이 답변을 삭제할까요? 댓글도 함께 사라집니다.')) return;
    setBusy(id);
    const res = await fetch('/api/admin/mutate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete', table: 'answers', id }),
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
        <h1>답변 관리</h1>
        <p>최근 200개. 스팸·부적절한 답변을 빠르게 정리할 수 있어요.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="답변 본문·질문 제목 검색"
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 14px',
            border: '1px solid var(--line)',
            borderRadius: 8,
            fontSize: 14,
          }}
        />
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <h2>{filtered.length}개 답변</h2>
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>일치하는 답변이 없어요.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>본문 (요약)</th>
                <th>질문</th>
                <th>작성자</th>
                <th>채택</th>
                <th>추천</th>
                <th>등록</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const question = (item.questions as any) || {};
                return (
                  <tr key={item.id}>
                    <td style={{ maxWidth: 380 }}>
                      <span style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--t1)',
                        fontSize: 13,
                      }}>{item.body}</span>
                    </td>
                    <td>
                      <Link
                        href={`/q/${question.slug || item.question_id}`}
                        className={styles.cellTitle}
                        target="_blank"
                        style={{ maxWidth: 220 }}
                      >
                        {question.title || '(삭제됨)'}
                      </Link>
                    </td>
                    <td>{(item.users as any)?.name || '익명'}</td>
                    <td>{item.is_adopted ? '✅' : '—'}</td>
                    <td>{item.like_count || 0}</td>
                    <td>{fmtTime(item.created_at)}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.danger}`}
                        onClick={() => remove(item.id)}
                        disabled={busy === item.id}
                      >
                        {busy === item.id ? '삭제중…' : '삭제'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
