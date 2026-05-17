/**
 * 가벼운 Markdown 렌더러 — h1-3, bold, italic, 링크, 리스트, 인용, 코드블록.
 * 외부 라이브러리 없이 안전한 변환.
 */

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
  // **bold**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // *italic*
  out = out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // [text](url)
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // `code`
  out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  return out;
}

function toHtml(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // 코드 블록 ```
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

    // 헤딩
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // 인용
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(renderInline(lines[i].slice(2)));
        i++;
      }
      out.push(`<blockquote>${buf.join('<br/>')}</blockquote>`);
      continue;
    }

    // 리스트
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

    // 빈 줄
    if (!line.trim()) { i++; continue; }

    // 일반 단락 (연속 줄 묶기)
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

/**
 * TipTap 에디터에서 저장한 HTML 인지, legacy markdown 인지 자동 감지.
 * HTML 이면 그대로, markdown 이면 toHtml() 로 변환.
 */
function isLikelyHtml(s: string): boolean {
  const trimmed = s.trim();
  return /^<(p|h[1-6]|ul|ol|blockquote|pre|div|img|figure|a)\s|^<(p|h[1-6]|ul|ol|blockquote|pre|div|img|figure)>/i.test(trimmed);
}

export function PostBody({ body, className }: { body: string; className?: string }) {
  const html = isLikelyHtml(body) ? body : toHtml(body);
  return (
    <article
      className={`${styles.body} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
