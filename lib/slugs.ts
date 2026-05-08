const FALLBACK_SLUG = 'question';

export function createQuestionSlug(title: string, suffix = Date.now()) {
  const base = title
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
    .replace(/^-|-$/g, '');

  const compactSuffix = Math.abs(Number(suffix)).toString(36);

  return `${base || FALLBACK_SLUG}-${compactSuffix}`;
}
