'use client';

/**
 * TipTap 콜아웃 노드 — 한입 톤 4종.
 *
 * variant:
 *   info        💡  파란계열   — 일반 인사이트/정보
 *   key         📌  진한 블루  — 핵심 수치 강조
 *   warn        ⚠️  주황       — 주의·리스크
 *   disclaimer  🚫  회색       — 면책고지·기준일
 *
 * HTML 직렬화:
 *   <aside data-callout="info" data-emoji="💡">내용</aside>
 */

import { Node, mergeAttributes } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from '@tiptap/react';
import styles from './CalloutNode.module.css';

export type CalloutVariant = 'info' | 'key' | 'warn' | 'disclaimer';

const VARIANT_META: Record<CalloutVariant, { emoji: string; label: string }> = {
  info: { emoji: '💡', label: '인사이트' },
  key: { emoji: '📌', label: '핵심 수치' },
  warn: { emoji: '⚠️', label: '주의' },
  disclaimer: { emoji: '🚫', label: '면책' },
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      variant: { default: 'info' as CalloutVariant },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-callout]',
        getAttrs: (el) => ({
          variant: ((el as HTMLElement).getAttribute('data-callout') as CalloutVariant) || 'info',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const variant = (node.attrs.variant as CalloutVariant) || 'info';
    const meta = VARIANT_META[variant] || VARIANT_META.info;
    return [
      'aside',
      mergeAttributes(HTMLAttributes, {
        'data-callout': variant,
        'data-emoji': meta.emoji,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (variant: CalloutVariant) =>
        ({ commands }) =>
          commands.insertContent({
            type: 'callout',
            attrs: { variant },
            content: [{ type: 'paragraph' }],
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

function CalloutView({ node }: any) {
  const variant = (node.attrs.variant as CalloutVariant) || 'info';
  const meta = VARIANT_META[variant];
  return (
    <NodeViewWrapper
      as="aside"
      data-callout={variant}
      className={`${styles.callout} ${styles[`v_${variant}`]}`}
    >
      <span className={styles.emoji} contentEditable={false} aria-hidden>
        {meta.emoji}
      </span>
      <div className={styles.body}>
        <NodeViewContent className={styles.content} />
      </div>
    </NodeViewWrapper>
  );
}
