'use client';

/**
 * 크리에이터 개인 템플릿 관리.
 * - 시스템 템플릿: 읽기 전용 미리보기
 * - 내 템플릿: 생성·수정·삭제
 */

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Creator } from '@/lib/creator';
import type { PostTemplate, TemplateKind } from '@/lib/creatorTemplatesTypes';
import { KIND_LABELS } from '@/lib/creatorTemplatesTypes';
import { RichEditor } from '@/components/creator/RichEditor';
import styles from './Templates.module.css';

type Editing = {
  id?: string;
  name: string;
  description: string;
  emoji: string;
  body_html: string;
  kind: TemplateKind;
};

const EMPTY: Editing = {
  name: '',
  description: '',
  emoji: '📝',
  body_html: '',
  kind: 'custom',
};

export function TemplatesClient({ creator, initialTemplates }: { creator: Creator; initialTemplates: PostTemplate[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const system = templates.filter(t => t.is_system);
  const mine = templates.filter(t => !t.is_system);

  const startNew = () => setEditing({ ...EMPTY });
  const startEdit = (t: PostTemplate) => setEditing({
    id: t.id,
    name: t.name,
    description: t.description || '',
    emoji: t.emoji || '📝',
    body_html: t.body_html,
    kind: t.kind,
  });

  const save = async () => {
    if (!editing) return;
    setErr('');
    if (!editing.name.trim()) { setErr('이름을 입력해주세요.'); return; }
    if (!editing.body_html.trim()) { setErr('본문 골격을 적어주세요.'); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        creator_id: creator.id,
        kind: editing.kind,
        name: editing.name.trim(),
        description: editing.description.trim() || null,
        emoji: editing.emoji.trim() || null,
        body_html: editing.body_html,
        is_system: false,
      };
      if (editing.id) {
        const { data, error } = await supabase
          .from('creator_post_templates')
          .update(payload)
          .eq('id', editing.id)
          .select()
          .single();
        if (error) { setErr(error.message); return; }
        setTemplates(list => list.map(t => t.id === editing.id ? (data as PostTemplate) : t));
      } else {
        const { data, error } = await supabase
          .from('creator_post_templates')
          .insert(payload)
          .select()
          .single();
        if (error) { setErr(error.message); return; }
        setTemplates(list => [data as PostTemplate, ...list]);
      }
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (t: PostTemplate) => {
    if (!confirm(`"${t.name}" 템플릿을 삭제할까요?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('creator_post_templates').delete().eq('id', t.id);
    if (error) { alert(error.message); return; }
    setTemplates(list => list.filter(x => x.id !== t.id));
  };

  return (
    <main className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1>템플릿 관리</h1>
          <p>자주 쓰는 글 형식을 저장해두고 빠르게 시작해요.</p>
        </div>
        <button type="button" onClick={startNew} className={styles.newBtn}>+ 새 템플릿</button>
      </header>

      {editing && (
        <section className={styles.editor}>
          <h2>{editing.id ? '템플릿 수정' : '새 템플릿'}</h2>
          <div className={styles.editorRow}>
            <input
              type="text"
              value={editing.emoji}
              onChange={e => setEditing(s => s ? { ...s, emoji: e.target.value } : s)}
              placeholder="📝"
              className={styles.emojiInput}
              maxLength={4}
            />
            <input
              type="text"
              value={editing.name}
              onChange={e => setEditing(s => s ? { ...s, name: e.target.value } : s)}
              placeholder="템플릿 이름 (예: 주간 시황)"
              className={styles.nameInput}
              maxLength={40}
            />
            <select
              value={editing.kind}
              onChange={e => setEditing(s => s ? { ...s, kind: e.target.value as TemplateKind } : s)}
              className={styles.kindSelect}
            >
              {(Object.keys(KIND_LABELS) as TemplateKind[]).map(k => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={editing.description}
            onChange={e => setEditing(s => s ? { ...s, description: e.target.value } : s)}
            placeholder="짧은 설명 (선택)"
            className={styles.descInput}
            maxLength={100}
          />
          <RichEditor
            value={editing.body_html}
            onChange={html => setEditing(s => s ? { ...s, body_html: html } : s)}
            placeholder="템플릿 본문 골격 — 헤딩, 빈 단락, 가이드 질문 등을 미리 채워두세요."
          />
          {err && <div className={styles.errorBox}>{err}</div>}
          <div className={styles.editorActions}>
            <button type="button" onClick={() => setEditing(null)} className={styles.btnSecondary}>취소</button>
            <button type="button" onClick={save} disabled={saving} className={styles.btnPrimary}>
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>내 템플릿 ({mine.length})</h3>
        {mine.length === 0 ? (
          <div className={styles.empty}>아직 저장한 템플릿이 없어요. 자주 쓰는 형식을 저장하면 다음 글 작성이 빨라져요.</div>
        ) : (
          <div className={styles.list}>
            {mine.map(t => (
              <article key={t.id} className={styles.item}>
                <div className={styles.itemHead}>
                  <span className={styles.itemEmoji}>{t.emoji || '📝'}</span>
                  <div className={styles.itemBody}>
                    <strong>{t.name}</strong>
                    <span>{KIND_LABELS[t.kind]} {t.description ? `· ${t.description}` : ''}</span>
                  </div>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => startEdit(t)} className={styles.btnGhost}>수정</button>
                    <button type="button" onClick={() => remove(t)} className={styles.btnGhostDanger}>삭제</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>기본 템플릿 (재프콘 공통)</h3>
        <div className={styles.list}>
          {system.map(t => (
            <article key={t.id} className={`${styles.item} ${styles.itemReadonly}`}>
              <div className={styles.itemHead}>
                <span className={styles.itemEmoji}>{t.emoji || '📝'}</span>
                <div className={styles.itemBody}>
                  <strong>{t.name}</strong>
                  <span>{KIND_LABELS[t.kind]} {t.description ? `· ${t.description}` : ''}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
