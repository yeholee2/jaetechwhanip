'use client';

/**
 * TipTap 커스텀 노드 — 인라인 페이월 (Substack 스타일).
 *
 * 본문 중간에 이 마커를 넣으면 그 아래는 멤버만 볼 수 있어요.
 *
 * HTML 직렬화:
 *   <hr data-paywall="member" />
 *
 * 서버 렌더링: 마커 첫 등장 위치 기준으로 body splice.
 * - 멤버: 마커 제거 후 전체 렌더
 * - 비멤버: 마커 위 + PaywallGate CTA, 아래 숨김
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import styles from './PaywallNode.module.css';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paywallDivider: {
      insertPaywallDivider: () => ReturnType;
    };
  }
}

export const PaywallNode = Node.create({
  name: 'paywallDivider',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  parseHTML() {
    return [
      { tag: 'hr[data-paywall]' },
      { tag: 'div[data-paywall]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-paywall': 'member' })];
  },

  addCommands() {
    return {
      insertPaywallDivider:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: 'paywallDivider' }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PaywallNodeView);
  },
});

function PaywallNodeView({ deleteNode }: any) {
  return (
    <NodeViewWrapper as="div" data-paywall-wrapper="" className={styles.wrap}>
      <div className={styles.divider} contentEditable={false}>
        <span className={styles.line} aria-hidden />
        <span className={styles.label}>
          <span className={styles.icon}>🔒</span>
          여기부터 멤버 전용
        </span>
        <span className={styles.line} aria-hidden />
        <button
          type="button"
          className={styles.remove}
          onClick={() => deleteNode()}
          aria-label="페이월 제거"
          title="페이월 제거"
        >
          ×
        </button>
      </div>
      <p className={styles.hint} contentEditable={false}>
        이 줄 아래의 모든 내용은 <strong>멤버십 구독자</strong>만 볼 수 있어요. 위쪽은 무료 미리보기로 노출됩니다.
      </p>
    </NodeViewWrapper>
  );
}
