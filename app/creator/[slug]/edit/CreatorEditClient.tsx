'use client';

/**
 * 크리에이터 본인 편집 — 팬딩/네프콘 스타일.
 * - 프로필: 아바타/커버/bio/topics/channel
 * - 멤버십: ON/OFF, 월 구독료, 티어명, 혜택
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Creator } from '@/lib/creator';
import { CATEGORY_DEFINITIONS, normalizeCreatorTopic, normalizeCreatorTopics } from '@/lib/categories';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from './CreatorEdit.module.css';

const TOPIC_OPTIONS = CATEGORY_DEFINITIONS.map(category => ({
  key: category.key,
  label: category.label,
}));

export function CreatorEditClient({ creator }: { creator: Creator }) {
  const router = useRouter();
  const [form, setForm] = useState({
    display_name: creator.display_name,
    bio: creator.bio || '',
    channel_url: creator.channel_url || '',
    avatar_url: creator.avatar_url || '',
    cover_url: creator.cover_url || '',
    topics: creator.topics || [],
    membership_enabled: creator.membership_enabled,
    membership_price_won: creator.membership_price_won || 4900,
    membership_tier_name: creator.membership_tier_name || '멤버',
    membership_perks: creator.membership_perks || '',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');

  const toggleTopic = (t: string) => {
    setForm(f => ({
      ...f,
      topics: f.topics.some(x => normalizeCreatorTopic(x) === t)
        ? normalizeCreatorTopics(f.topics.filter(x => normalizeCreatorTopic(x) !== t))
        : normalizeCreatorTopics([...f.topics, t]),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.display_name.trim()) {
      setErr('이름은 필수예요.');
      return;
    }
    if (form.membership_enabled && (!form.membership_price_won || form.membership_price_won < 1000)) {
      setErr('멤버십 가격은 최소 1,000원 이상이어야 해요.');
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('creators')
        .update({
          display_name: form.display_name.trim(),
          bio: form.bio.trim() || null,
          channel_url: form.channel_url.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          cover_url: form.cover_url.trim() || null,
          topics: normalizeCreatorTopics(form.topics),
          membership_enabled: form.membership_enabled,
          membership_price_won: form.membership_enabled ? form.membership_price_won : null,
          membership_tier_name: form.membership_tier_name.trim() || '멤버',
          membership_perks: form.membership_perks.trim() || null,
        })
        .eq('id', creator.id);
      if (error) {
        setErr(error.message);
        return;
      }
      setToast('✓ 저장 완료');
      setTimeout(() => {
        router.refresh();
        setToast('');
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>페이지 편집</h1>
        <p>프로필과 멤버십 설정을 관리해요.</p>
      </header>

      <form onSubmit={submit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>프로필</h2>

          <div className={styles.field}>
            <label>활동명</label>
            <input
              type="text"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              maxLength={32}
            />
          </div>

          <div className={styles.field}>
            <label>소개 <span className={styles.optional}>(최대 240자)</span></label>
            <textarea
              rows={4}
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              maxLength={240}
              placeholder="어떤 콘텐츠를 다루는지 한두 문장으로 알려주세요."
            />
            <span className={styles.charCount}>{form.bio.length} / 240</span>
          </div>

          <div className={styles.field}>
            <ImageUploader
              label="아바타 이미지"
              value={form.avatar_url}
              onChange={url => setForm(f => ({ ...f, avatar_url: url }))}
              scope="avatar"
              shape="circle"
            />
          </div>

          <div className={styles.field}>
            <ImageUploader
              label="커버 이미지 (16:9 권장)"
              value={form.cover_url}
              onChange={url => setForm(f => ({ ...f, cover_url: url }))}
              scope="cover"
              shape="wide"
            />
          </div>

          <div className={styles.field}>
            <label>외부 채널 URL <span className={styles.optional}>(YouTube, 블로그 등)</span></label>
            <input
              type="url"
              value={form.channel_url}
              onChange={e => setForm(f => ({ ...f, channel_url: e.target.value }))}
              placeholder="https://youtube.com/@..."
            />
          </div>

          <div className={styles.field}>
            <label>다루는 토픽</label>
            <div className={styles.topicGrid}>
              {TOPIC_OPTIONS.map(t => (
                <button
                  type="button"
                  key={t.key}
                  className={`${styles.topicChip} ${form.topics.some(topic => normalizeCreatorTopic(topic) === t.key) ? styles.topicOn : ''}`}
                  onClick={() => toggleTopic(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>멤버십</h2>

          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={form.membership_enabled}
              onChange={e => setForm(f => ({ ...f, membership_enabled: e.target.checked }))}
            />
            <span>멤버십 활성화 — 유료 멤버 전용 콘텐츠 제공</span>
          </label>

          {form.membership_enabled && (
            <>
              <div className={styles.field}>
                <label>월 구독료 (원)</label>
                <input
                  type="number"
                  min={1000}
                  step={100}
                  value={form.membership_price_won}
                  onChange={e => setForm(f => ({ ...f, membership_price_won: Number(e.target.value) }))}
                />
              </div>

              <div className={styles.field}>
                <label>티어 이름</label>
                <input
                  type="text"
                  value={form.membership_tier_name}
                  onChange={e => setForm(f => ({ ...f, membership_tier_name: e.target.value }))}
                  maxLength={20}
                  placeholder="멤버, 서포터, VIP 등"
                />
              </div>

              <div className={styles.field}>
                <label>멤버 혜택 <span className={styles.optional}>(줄바꿈으로 구분)</span></label>
                <textarea
                  rows={5}
                  value={form.membership_perks}
                  onChange={e => setForm(f => ({ ...f, membership_perks: e.target.value }))}
                  placeholder={'주 2회 멤버 전용 글\n월간 라이브 Q&A\n멤버 채팅방 입장'}
                />
              </div>
            </>
          )}
        </section>

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
