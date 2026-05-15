'use client';

/**
 * 사용자 알림함 — AppShell의 종 아이콘.
 *
 * - unread count 폴링 (60초마다)
 * - 클릭 → 드롭다운 패널 (최근 20개)
 * - 알림 클릭 → 읽음 처리 + link 이동
 * - "모두 읽음" 버튼
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FaIcon } from './FaIcon';
import {
  countUnread,
  listMyNotifications,
  markAsRead,
  markAllRead,
  type UserNotification,
} from '@/lib/alerts';
import styles from './NotificationBell.module.css';

const KIND_EMOJI: Record<UserNotification['kind'], string> = {
  alert: '🔔',
  system: 'ℹ️',
  creator_post_published: '✨',
  creator_post_liked: '♥',
  creator_post_commented: '💬',
  qa_answered: '💡',
};

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(iso);
  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // unread 카운트 폴링
  const refresh = useCallback(async () => {
    const n = await countUnread();
    setUnread(n);
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 열 때 목록 fetch
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listMyNotifications(20).then(list => {
      setItems(list);
      setLoading(false);
    });
  }, [open]);

  const handleItemClick = async (n: UserNotification) => {
    if (!n.read_at) {
      await markAsRead(n.id);
      setItems(prev => prev.map(p => p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p));
      setUnread(u => Math.max(0, u - 1));
    }
  };

  const handleMarkAll = async () => {
    if (unread === 0) return;
    await markAllRead();
    setItems(prev => prev.map(p => ({ ...p, read_at: p.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.btn}
        onClick={() => setOpen(o => !o)}
        aria-label={`알림 ${unread}개`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <FaIcon name="bell" size={18} />
        {unread > 0 && (
          <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelHead}>
            <h4>알림</h4>
            <button
              type="button"
              className={styles.markAll}
              onClick={handleMarkAll}
              disabled={unread === 0}
            >
              모두 읽음
            </button>
          </div>
          <ul className={styles.list}>
            {loading && <li className={styles.empty}>불러오는 중…</li>}
            {!loading && items.length === 0 && (
              <li className={styles.empty}>
                아직 알림이 없어요.<br />
                ETF 상세 페이지에서 가격 알림을 추가해보세요.
              </li>
            )}
            {!loading && items.map(n => {
              const isUnread = !n.read_at;
              const Content = (
                <>
                  <div className={styles.itemTitle}>
                    <span aria-hidden style={{ marginRight: 6 }}>{KIND_EMOJI[n.kind] || '🔔'}</span>
                    {n.title}
                  </div>
                  {n.body && <p className={styles.itemBody}>{n.body}</p>}
                  <span className={styles.itemDate}>{timeAgo(n.created_at)}</span>
                </>
              );
              return (
                <li
                  key={n.id}
                  className={`${styles.item} ${isUnread ? styles.itemUnread : ''}`}
                  onClick={() => handleItemClick(n)}
                >
                  {n.link ? (
                    <Link href={n.link} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {Content}
                    </Link>
                  ) : Content}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
