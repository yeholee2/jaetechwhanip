const FALLBACK_SLUG = 'question';
const MAX_SLUG_LENGTH = 50;
const MAX_KEYWORD_COUNT = 5;

export function generateSlug(input: string, maxLength = MAX_SLUG_LENGTH) {
  const normalized = input
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9가-힣]+/gi, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');

  const words = normalized
    .split('-')
    .filter(Boolean)
    .slice(0, MAX_KEYWORD_COUNT);

  const slug = (words.length > 0 ? words.join('-') : FALLBACK_SLUG)
    .slice(0, maxLength)
    .replace(/^-|-$/g, '');

  return slug || FALLBACK_SLUG;
}

export async function ensureUniqueSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>,
  maxLength = MAX_SLUG_LENGTH,
) {
  const base = generateSlug(baseSlug, maxLength);
  if (!(await exists(base))) return base;

  for (let index = 2; index < 1000; index += 1) {
    const suffix = `-${index}`;
    const candidate = `${base.slice(0, maxLength - suffix.length).replace(/-$/g, '')}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }

  return `${base.slice(0, maxLength - 8).replace(/-$/g, '')}-${Date.now().toString(36).slice(-7)}`;
}

export function createQuestionSlug(title: string) {
  return generateSlug(title);
}
