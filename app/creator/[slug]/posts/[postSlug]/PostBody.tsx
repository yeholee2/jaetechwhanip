'use client';

/**
 * 본문 렌더러.
 * - HTML 본문은 dangerouslySetInnerHTML
 * - `<div data-chart>` 임베드는 ChartBlock 으로 치환 (읽기 전용)
 * - legacy Markdown 도 자동 감지해 변환
 */

import { useMemo } from 'react';
import { ChartBlock, type ChartBlockData, type Drawing } from '@/components/creator/ChartBlock';
import styles from './CreatorPost.module.css';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return out;
}

function toHtml(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(escapeHtml(lines[i]));
        i++;
      }
      i++;
      out.push(`<pre><code>${buf.join('\n')}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      out.push(`<h${h[1].length}>${renderInline(h[2])}</h${h[1].length}>`);
      i++;
      continue;
    }
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(renderInline(lines[i].slice(2)));
        i++;
      }
      out.push(`<blockquote>${buf.join('<br/>')}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${renderInline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${renderInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>\s|[-*]\s|\d+\.\s|```)/.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${renderInline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function isLikelyHtml(s: string): boolean {
  const trimmed = s.trim();
  return /^<(p|h[1-6]|ul|ol|blockquote|pre|div|img|figure|a)\s|^<(p|h[1-6]|ul|ol|blockquote|pre|div|img|figure)>/i.test(trimmed);
}

/**
 * HTML 을 차트 임베드 기준으로 분할.
 * 반환: [{ kind: 'html', html }, { kind: 'chart', data }, ...]
 */
type Segment =
  | { kind: 'html'; html: string }
  | { kind: 'chart'; data: ChartBlockData };

function splitByCharts(html: string): Segment[] {
  // <div data-chart="..." data-range="..." data-type="..." data-drawings="..."></div>
  // (TipTap 가 self-close 가 아니라 빈 컨테이너로 직렬화)
  const re = /<div\b[^>]*\bdata-chart="([^"]*)"[^>]*><\/div>/gi;
  const segments: Segment[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > lastIndex) {
      segments.push({ kind: 'html', html: html.slice(lastIndex, m.index) });
    }
    const tag = m[0];
    const code = m[1];
    const rangeMatch = /\bdata-range="([^"]*)"/.exec(tag);
    const typeMatch = /\bdata-type="([^"]*)"/.exec(tag);
    const drawingsMatch = /\bdata-drawings='([^']*)'|\bdata-drawings="([^"]*)"/.exec(tag);
    let drawings: Drawing[] = [];
    const drRaw = drawingsMatch?.[1] || drawingsMatch?.[2];
    if (drRaw) {
      try {
        const decoded = drRaw
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, '&');
        drawings = JSON.parse(decoded);
      } catch { drawings = []; }
    }
    segments.push({
      kind: 'chart',
      data: {
        code,
        range: (rangeMatch?.[1] as any) || '1y',
        type: (typeMatch?.[1] as any) || 'candle',
        drawings,
      },
    });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < html.length) {
    segments.push({ kind: 'html', html: html.slice(lastIndex) });
  }
  return segments;
}

export function PostBody({ body, className }: { body: string; className?: string }) {
  const segments = useMemo(() => {
    const html = isLikelyHtml(body) ? body : toHtml(body);
    return splitByCharts(html);
  }, [body]);

  return (
    <article className={`${styles.body} ${className || ''}`}>
      {segments.map((seg, i) => {
        if (seg.kind === 'chart') {
          return <ChartBlock key={`c${i}`} data={seg.data} editable={false} />;
        }
        return <div key={`h${i}`} dangerouslySetInnerHTML={{ __html: seg.html }} />;
      })}
    </article>
  );
}
