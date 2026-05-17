'use client';

/**
 * 크리에이터 글 작성 — 팬딩/네프콘 스타일.
 * - 제목, 본문(Markdown), 썸네일, 미리보기, 무료/멤버 전용
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizeSlug, type Creator } from '@/lib/creator';
import type { PostTemplate } from '@/lib/creatorTemplatesTypes';
import { ImageUploader } from '@/components/creator/ImageUploader';
import { RichEditor } from '@/components/creator/RichEditor';
import { TemplatePicker } from '@/components/creator/TemplatePicker';
import styles from './CreatorWrite.module.css';

export function CreatorWriteClient({ creator, templates = [] }: { creator: Creator; templates?: PostTemplate[] }) {
  const [showTemplatePicker, setShowTemplatePicker] = useState(templates.length > 0);
  const [pickedTemplate, setPickedTemplate] = useState<PostTemplate | null>(null);
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    body: '',
    cover_url: '',
    preview: '',
    is_member_only: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!form.title.trim()) {
      setErr('제목은 필수예요.');
      return;
    }
    if (!form.body.trim()) {
      setErr('본문을 입력해주세요.');
      return;
    }
    if (form.is_member_only && !creator.membership_enabled) {
      setErr('멤버 전용 글은 멤버십을 먼저 활성화해야 해요. 페이지 편집에서 켜주세요.');
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const baseSlug = normalizeSlug(form.title) || `post-${Date.now()}`;
      // slug 중복 회피: 타임스탬프 suffix
      const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;

      const { data, error } = await supabase
        .from('creator_posts')
        .insert({
          creator_id: creator.id,
          title: form.title.trim(),
          slug,
          body: form.body.trim(),
          cover_url: form.cover_url.trim() || null,
          preview: form.preview.trim() || null,
          is_member_only: form.is_member_only,
          is_published: true,
        })
        .select('id, slug')
        .single();
      if (error) {
        setErr(error.message);
        return;
      }
      // 팔로워/멤버 알림 메일 — 실패해도 발행은 성공으로.
      fetch('/api/creator/posts/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: data!.id }),
      }).catch(() => {});
      router.push(`/creator/${creator.slug}/posts/${data!.slug}`);
    } finally {
      setSaving(false);
    }
  };

  if (showTemplatePicker) {
    return (
      <main className={styles.wrap}>
        <header className={styles.head}>
          <h1>글 작성</h1>
          <p>{creator.display_name} · {creator.membership_enabled ? '멤버십 활성' : '무료 페이지'}</p>
        </header>
        <TemplatePicker
          templates={templates}
          onPick={t => {
            setPickedTemplate(t);
            setForm(f => ({ ...f, body: t.body_html }));
            setShowTemplatePicker(false);
          }}
          onSkip={() => setShowTemplatePicker(false)}
        />
      </main>
    );
  }

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <h1>글 작성</h1>
        <p>
          {creator.display_name} · {creator.membership_enabled ? '멤버십 활성' : '무료 페이지'}
          {pickedTemplate && (
            <>
              {' · '}
              <span style={{ color: 'var(--rw-primary)' }}>{pickedTemplate.emoji} {pickedTemplate.name} 템플릿</span>
              {' '}
              <button
                type="button"
                onClick={() => setShowTemplatePicker(true)}
                style={{ background: 'none', border: 'none', color: 'var(--rw-text-muted)', cursor: 'pointer', fontSize: 12, textDecoration: 'underline' }}
              >
                변경
              </button>
            </>
          )}
        </p>
      </header>

      <form onSubmit={submit} className={styles.form}>
        <div className={styles.field}>
          <input
            type="text"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="제목을 입력하세요"
            className={styles.titleInput}
            maxLength={120}
          />
        </div>

        <div className={styles.field}>
          <ImageUploader
            label="썸네일 이미지 (선택, 16:9 권장)"
            value={form.cover_url}
            onChange={url => setForm(f => ({ ...f, cover_url: url }))}
            scope="post-thumb"
            shape="wide"
          />
        </div>

        <div className={styles.field}>
          <label>본문</label>
          <RichEditor
            value={form.body}
            onChange={html => setForm(f => ({ ...f, body: html }))}
            placeholder="멤버에게 어떤 인사이트를 전달할지 적어보세요. 헤딩·인용·이미지·링크 모두 지원해요."
          />
        </div>

        <div className={styles.memberToggle}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={form.is_member_only}
              onChange={e => setForm(f => ({ ...f, is_member_only: e.target.checked }))}
              disabled={!creator.membership_enabled}
            />
            <div>
              <strong>멤버 전용 글</strong>
              <span>
                {creator.membership_enabled
                  ? `월 ${creator.membership_price_won?.toLocaleString()}원 ${creator.membership_tier_name}만 전체 본문을 볼 수 있어요.`
                  : '멤버십이 비활성화된 상태예요. 페이지 편집에서 멤버십을 켜야 사용할 수 있어요.'}
              </span>
            </div>
          </label>
        </div>

        {form.is_member_only && (
          <div className={styles.field}>
            <label>무료 미리보기 <span className={styles.optional}>(paywall 위에 노출)</span></label>
            <textarea
              rows={4}
              value={form.preview}
              onChange={e => setForm(f => ({ ...f, preview: e.target.value }))}
              placeholder="멤버가 아닌 사람도 볼 수 있는 첫 단락을 적어주세요. 호기심을 끄는 한두 문단이 좋아요."
              maxLength={400}
            />
          </div>
        )}

        {err && <div className={styles.errorBox}>{err}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={() => router.back()} className={styles.btnSecondary}>
            취소
          </button>
          <button type="submit" disabled={saving} className={styles.btnPrimary}>
            {saving ? '발행 중…' : '발행'}
          </button>
        </div>
      </form>
    </main>
  );
}
