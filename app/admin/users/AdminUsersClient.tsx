'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from '../admin.module.css';

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return '오늘';
  if (days < 30) return `${days}일 전`;
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
}

const ROLES = ['user', 'expert', 'admin'] as const;

export default function AdminUsersClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(i =>
      i.name?.toLowerCase().includes(query) ||
      i.email?.toLowerCase().includes(query)
    );
  }, [items, q]);

  const updateRole = async (id: string, nextRole: string) => {
    setBusy(id);
    const supabase = createClient();
    const { error } = await supabase.from('users').update({ role: nextRole }).eq('id', id);
    setBusy(null);
    if (error) {
      alert('변경 실패: ' + error.message);
      return;
    }
    setItems(prev => prev.map(p => p.id === id ? { ...p, role: nextRole } : p));
  };

  return (
    <>
      <div className={styles.head}>
        <h1>사용자 관리</h1>
        <p>최근 200명. 권한(user / expert / admin)을 조정할 수 있어요.</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          placeholder="이름·이메일 검색"
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
          <h2>{filtered.length}명</h2>
        </div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>일치하는 사용자가 없어요.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
                <th>권한</th>
                <th>가입일</th>
                <th>프로필</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.name || '—'}</td>
                  <td style={{ color: 'var(--t3)', fontSize: 12 }}>{item.email || '—'}</td>
                  <td>
                    <select
                      value={item.role || 'user'}
                      onChange={e => updateRole(item.id, e.target.value)}
                      disabled={busy === item.id}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--line)',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        background: item.role === 'admin' ? 'rgba(49,130,246,.08)' : 'var(--white)',
                        color: item.role === 'admin' ? 'var(--blue)' : 'var(--t1)',
                      }}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td>{fmtTime(item.created_at)}</td>
                  <td>
                    <Link
                      href={`/u/${item.id}`}
                      className={styles.actionBtn}
                      target="_blank"
                    >
                      보기
                    </Link>
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
