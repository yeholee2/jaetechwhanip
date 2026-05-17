'use client';

/**
 * 크리에이터 글 작성 에디터 — TipTap WYSIWYG.
 *
 * 지원:
 *  - 헤딩 (H2/H3)
 *  - Bold/Italic/Strike
 *  - 인용 / 코드 블록 / 불릿·번호 리스트
 *  - 이미지 (드래그·드롭 + 파일 선택, /api/creator/upload 사용)
 *  - 링크
 *
 * 저장 형식: HTML (DB 의 body 컬럼)
 * 보기 시: dangerouslySetInnerHTML 로 렌더 (HTML sanitize 는 서버 의무)
 */

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useRef } from 'react';
import { ChartNode } from './ChartNode';
import { PaywallNode } from './PaywallNode';
import styles from './RichEditor.module.css';

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

export function RichEditor({ value, onChange, placeholder = '본문을 작성하세요…' }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        HTMLAttributes: { class: styles.imageInline },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
      ChartNode,
      PaywallNode,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: styles.editor,
      },
    },
    immediatelyRender: false,
  });

  const uploadImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('scope', 'post-thumb');
    const r = await fetch('/api/creator/upload', { method: 'POST', body: fd });
    const j = await r.json();
    if (r.ok && j.url) {
      editor.chain().focus().setImage({ src: j.url }).run();
    } else {
      alert(j.error || '이미지 업로드 실패');
    }
  }, [editor]);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void uploadImage(f);
    e.target.value = '';
  };

  const insertPaywall = useCallback(() => {
    if (!editor) return;
    if (editor.getHTML().includes('data-paywall')) {
      alert('페이월은 글당 1개만 넣을 수 있어요. 기존 페이월을 지운 후 다시 추가하세요.');
      return;
    }
    editor.chain().focus().insertPaywallDivider().run();
  }, [editor]);

  const insertChart = useCallback(() => {
    if (!editor) return;
    const code = window.prompt('티커를 입력하세요 (예: AAPL, SPY, 005930)');
    if (!code) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'chart',
        attrs: {
          code: code.trim().toUpperCase(),
          range: '1y',
          type: 'candle',
          drawings: [],
        },
      })
      .run();
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('링크 URL', editor.getAttributes('link').href || 'https://');
    if (url === null) return;
    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return <div className={styles.loading}>에디터 로딩 중…</div>;
  }

  const btn = (active: boolean, disabled = false) =>
    `${styles.toolBtn} ${active ? styles.toolBtnOn : ''} ${disabled ? styles.toolBtnDisabled : ''}`;

  return (
    <div className={styles.wrap}>
      {/* 툴바 */}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={btn(editor.isActive('heading', { level: 2 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="제목 2"
        >
          H2
        </button>
        <button
          type="button"
          className={btn(editor.isActive('heading', { level: 3 }))}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="제목 3"
        >
          H3
        </button>
        <span className={styles.toolSep} />
        <button
          type="button"
          className={btn(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="굵게"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={btn(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="기울임"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={btn(editor.isActive('strike'))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="취소선"
        >
          <s>S</s>
        </button>
        <span className={styles.toolSep} />
        <button
          type="button"
          className={btn(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="불릿 리스트"
        >
          •
        </button>
        <button
          type="button"
          className={btn(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="번호 리스트"
        >
          1.
        </button>
        <button
          type="button"
          className={btn(editor.isActive('blockquote'))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="인용"
        >
          ❝
        </button>
        <button
          type="button"
          className={btn(editor.isActive('codeBlock'))}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="코드 블록"
        >
          {'</>'}
        </button>
        <span className={styles.toolSep} />
        <button
          type="button"
          className={btn(editor.isActive('link'))}
          onClick={addLink}
          title="링크"
        >
          🔗
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={() => fileInputRef.current?.click()}
          title="이미지 삽입"
        >
          🖼
        </button>
        <button
          type="button"
          className={btn(false)}
          onClick={insertChart}
          title="차트 삽입 — 티커로 가격 차트 + 그림 도구"
        >
          📊
        </button>
        <span className={styles.toolSep} />
        <button
          type="button"
          className={btn(false)}
          onClick={insertPaywall}
          title="페이월 삽입 — 이 줄 아래는 멤버만 보임"
        >
          🔒
        </button>
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onPickImage}
        style={{ display: 'none' }}
      />
    </div>
  );
}
