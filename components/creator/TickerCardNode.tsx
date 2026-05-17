'use client';

/**
 * TipTap 종목 카드 노드 — 본문 안에 가격·등락률 미니 카드.
 *
 * HTML 직렬화:
 *   <div data-ticker="NVDA"></div>
 *
 * 클라이언트에서 /api/quote/{code} 폴링해 가격·등락률 표시.
 * 에디터 / 공개 페이지 양쪽 다 같은 컴포넌트 재사용.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { TickerCard } from './TickerCard';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tickerCard: {
      insertTickerCard: (code: string) => ReturnType;
    };
  }
}

export const TickerCardNode = Node.create({
  name: 'tickerCard',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      code: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-ticker]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-ticker': node.attrs.code }),
    ];
  },

  addCommands() {
    return {
      insertTickerCard:
        (code: string) =>
        ({ commands }) =>
          commands.insertContent({
            type: 'tickerCard',
            attrs: { code: code.trim().toUpperCase() },
          }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(TickerCardView);
  },
});

function TickerCardView({ node, deleteNode }: any) {
  return (
    <NodeViewWrapper as="div" data-ticker-wrapper="">
      <TickerCard code={node.attrs.code} editable onRemove={() => deleteNode()} />
    </NodeViewWrapper>
  );
}
