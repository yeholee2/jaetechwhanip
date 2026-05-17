'use client';

/**
 * 내 프로필 수정 — 일반 유저용.
 * - 이름 / 아바타 이미지 변경
 * - 이메일·provider 는 읽기 전용
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from './Me.module.css';

export type MyProfile = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: string | null;
  role: string;
};

export function MeClient({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: profile.name || '',
    avatar_url: profile.avatar_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) {
      setErr('이름은 비울 수 없어요.');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('users')
        .update({
          name: form.name.trim(),
          avatar_url: form.avatar_url.trim() || null,
        })
        .eq('id', profile.id);
      if (error) { setErr(error.message); return; }
      setToast('✓ 저장 완료');
      setTimeout(() => {
        router.refresh();
        setToast('');
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const providerLabel = (p: string | null) => {
    if (!p) return '이메일';
    if (p === 'google') return 'Google';
    if (p === 'kakao') return 'Kakao';
    if (p === 'naver') return 'Naver';
    if (p === 'apple') return 'Apple';
    return p;
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>내 프로필</h1>
        <p>이름과 프로필 사진을 바꿀 수 있어요. 댓글·Q&A·재프콘 어디서나 같이 적용돼요.</p>
      </header>

      <form onSubmit={submit} className={styles.form}>
        <section className={styles.section}>
          <div className={styles.field}>
            <ImageUploader
              label="프로필 사진"
              value={form.avatar_url}
              onChange={url => setForm(f => ({ ...f, avatar_url: url }))}
              scope="user-avatar"
              shape="circle"
            />
            <p className={styles.hint}>이미지 업로드하면 그대로 프사로 적용돼요. 5MB 이하 PNG·JPG·WEBP·GIF.</p>
          </div>

          <div className={styles.field}>
            <label>이름</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="댓글·게시물에 표시될 이름"
              maxLength={32}
            />
          </div>
        </section>

        <section className={styles.readonly}>
          <div className={styles.row}>
            <span>이메일</span>
            <strong>{profile.email}</strong>
          </div>
          <div className={styles.row}>
            <span>로그인 방식</span>
            <strong>{providerLabel(profile.provider)}</strong>
          </div>
        </section>

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>취소</button>
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
