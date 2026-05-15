'use client';

/**
 * 크리에이터 신청 관리 — admin 전용.
 * - 신청 목록 (pending / approved / rejected)
 * - 승인 시 creators 행 자동 생성 + slug 결정
 * - 거절 시 사유 입력
 */

import { useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { creatorPath, normalizeSlug, type CreatorApplication, type Creator } from '@/lib/creator';
import styles from './AdminCreators.module.css';

type Tab = 'pending' | 'approved' | 'rejected' | 'creators';

export function AdminCreatorsClient({
  initialApplications,
  initialCreators,
}: {
  initialApplications: CreatorApplication[];
  initialCreators: Creator[];
}) {
  const [apps, setApps] = useState(initialApplications);
  const [creators, setCreators] = useState(initialCreators);
  const [tab, setTab] = useState<Tab>('pending');
  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const filtered = useMemo(() => {
    if (tab === 'creators') return null;
    return apps.filter(a => a.status === tab);
  }, [apps, tab]);

  const refresh = async () => {
    const supabase = createClient();
    const [{ data: a }, { data: c }] = await Promise.all([
      supabase.from('creator_applications').select('*').order('applied_at', { ascending: false }),
      supabase.from('creators').select('*').order('created_at', { ascending: false }),
    ]);
    if (a) setApps(a as CreatorApplication[]);
    if (c) setCreators(c as Creator[]);
  };

  const approve = async (app: CreatorApplication) => {
    if (pending) return;
    const desiredSlug = app.slug || normalizeSlug(app.display_name);
    const slug = window.prompt(
      `URL slug 확정 (영문/숫자/대시):\n예상: ${desiredSlug}`,
      desiredSlug
    );
    if (!slug) return;
    const cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) {
      alert('유효한 slug 입력 필요');
      return;
    }
    setPending(app.id);
    try {
      const supabase = createClient();
      // 1. creators 행 생성
      const { error: insertErr } = await supabase.from('creators').insert({
        user_id: app.user_id,
        slug: cleanSlug,
        display_name: app.display_name,
        bio: app.bio,
        channel_url: app.channel_url,
        topics: app.topics,
        is_published: true,
      });
      if (insertErr) {
        if (insertErr.code === '23505') {
          alert('이미 같은 slug 또는 user 의 크리에이터가 있어요.');
        } else {
          alert(`승인 실패: ${insertErr.message}`);
        }
        return;
      }
      // 2. 신청 상태 업데이트
      const { error: updateErr } = await supabase
        .from('creator_applications')
        .update({
          status: 'approved',
          slug: cleanSlug,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', app.id);
      if (updateErr) {
        alert(`상태 업데이트 실패: ${updateErr.message}`);
        return;
      }
      setToast(`✓ ${app.display_name} 승인 — /creator/${cleanSlug}`);
      await refresh();
    } finally {
      setPending(null);
    }
  };

  const reject = async (app: CreatorApplication) => {
    if (pending) return;
    const reason = window.prompt('거절 사유 (신청자에게 노출됩니다)');
    if (!reason) return;
    setPending(app.id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('creator_applications')
        .update({
          status: 'rejected',
          reject_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', app.id);
      if (error) {
        alert(`거절 실패: ${error.message}`);
        return;
      }
      setToast(`✓ ${app.display_name} 거절`);
      await refresh();
    } finally {
      setPending(null);
    }
  };

  const togglePublish = async (creator: Creator) => {
    setPending(creator.id);
    try {
      const supabase = createClient();
      const next = !creator.is_published;
      const { error } = await supabase
        .from('creators')
        .update({ is_published: next })
        .eq('id', creator.id);
      if (error) {
        alert(error.message);
        return;
      }
      setToast(`✓ ${creator.display_name} ${next ? '공개' : '비공개'}로 전환`);
      await refresh();
    } finally {
      setPending(null);
    }
  };

  // Toast auto dismiss
  if (toast) {
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>크리에이터 관리</h1>
        <p>핀플루언서 신청 검토 + 승인 + 운영.</p>
      </header>

      <nav className={styles.tabs}>
        {([
          { key: 'pending', label: `심사 중 (${apps.filter(a => a.status === 'pending').length})` },
          { key: 'approved', label: '승인됨' },
          { key: 'rejected', label: '거절됨' },
          { key: 'creators', label: `활성 크리에이터 (${creators.length})` },
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            type="button"
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabOn : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab !== 'creators' && filtered && (
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>해당 상태의 신청이 없어요.</div>
          ) : (
            filtered.map(app => (
              <article key={app.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <strong>{app.display_name}</strong>
                  <span className={styles.itemDate}>
                    {new Date(app.applied_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {app.bio && <p className={styles.itemBio}>{app.bio}</p>}
                <div className={styles.itemMeta}>
                  {app.channel_url && (
                    <a href={app.channel_url} target="_blank" rel="noopener noreferrer">채널 →</a>
                  )}
                  {typeof app.follower_count === 'number' && (
                    <span>구독자 {app.follower_count.toLocaleString()}</span>
                  )}
                  {app.topics.length > 0 && <span>{app.topics.join(' · ')}</span>}
                </div>
                {app.sample_content && (
                  <details className={styles.itemDetails}>
                    <summary>샘플 콘텐츠 보기</summary>
                    <pre>{app.sample_content}</pre>
                  </details>
                )}
                {app.motivation && (
                  <details className={styles.itemDetails}>
                    <summary>지원 동기</summary>
                    <pre>{app.motivation}</pre>
                  </details>
                )}
                {app.reject_reason && (
                  <div className={styles.rejectBox}>거절 사유: {app.reject_reason}</div>
                )}
                {tab === 'pending' && (
                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      onClick={() => approve(app)}
                      disabled={pending === app.id}
                      className={styles.btnApprove}
                    >
                      {pending === app.id ? '처리 중…' : '승인'}
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(app)}
                      disabled={pending === app.id}
                      className={styles.btnReject}
                    >
                      거절
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {tab === 'creators' && (
        <div className={styles.list}>
          {creators.length === 0 ? (
            <div className={styles.empty}>아직 활성 크리에이터가 없어요.</div>
          ) : (
            creators.map(c => (
              <article key={c.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <strong>{c.display_name}</strong>
                  <span className={`${styles.itemBadge} ${c.is_published ? styles.badgeOn : styles.badgeOff}`}>
                    {c.is_published ? '공개' : '비공개'}
                  </span>
                </div>
                <div className={styles.itemMeta}>
                  <a href={creatorPath(c.slug)}>/creator/{c.slug}</a>
                  <span>팔로워 {c.follower_count}</span>
                  <span>멤버 {c.member_count}</span>
                  <span>글 {c.post_count}</span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    onClick={() => togglePublish(c)}
                    disabled={pending === c.id}
                    className={styles.btnSecondary}
                  >
                    {c.is_published ? '비공개로' : '공개로'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
