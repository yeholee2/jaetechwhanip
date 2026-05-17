'use client';

/**
 * TipTap 커스텀 노드 — 차트 임베드.
 *
 * HTML 직렬화:
 *   <div data-chart="AAPL" data-range="1y" data-type="candle" data-drawings='[...]'></div>
 *
 * 에디터 안에선 <ChartBlock editable /> 으로 NodeView 렌더.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ChartBlock, type ChartBlockData, type Drawing } from './ChartBlock';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (data: ChartBlockData) => ReturnType;
    };
  }
}

export const ChartNode = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  draggable: false,
  selectable: true,

  addAttributes() {
    return {
      code: { default: '' },
      range: { default: '1y' },
      type: { default: 'candle' },
      drawings: {
        default: [],
        parseHTML: el => {
          const raw = (el as HTMLElement).getAttribute('data-drawings');
          if (!raw) return [];
          try { return JSON.parse(raw); } catch { return []; }
        },
        renderHTML: attrs => ({ 'data-drawings': JSON.stringify(attrs.drawings || []) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-chart]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-chart': node.attrs.code,
      'data-range': node.attrs.range,
      'data-type': node.attrs.type,
    })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChartNodeView);
  },
});

function ChartNodeView({ node, updateAttributes, deleteNode }: any) {
  const data: ChartBlockData = {
    code: node.attrs.code,
    range: node.attrs.range,
    type: node.attrs.type,
    drawings: (node.attrs.drawings || []) as Drawing[],
  };
  return (
    <NodeViewWrapper as="div" data-chart-wrapper="">
      <ChartBlock
        data={data}
        editable
        onChange={next => updateAttributes({
          code: next.code,
          range: next.range,
          type: next.type,
          drawings: next.drawings,
        })}
        onRemove={() => deleteNode()}
      />
    </NodeViewWrapper>
  );
}
