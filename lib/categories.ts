export type CategoryDefinition = {
  key: string;
  label: string;
  slug: string;
  emoji: string;
  title: string;
  description: string;
  keywords: string[];
  aliases?: string[];
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: '재테크입문',
    label: '재테크입문',
    slug: '재테크-입문',
    emoji: '💡',
    title: '재테크입문 질문',
    description: '사회초년생 저축, 목돈 만들기, 월급 관리처럼 처음 시작하는 재테크 고민을 모았어요.',
    keywords: ['재테크입문', '사회초년생 재테크', '월급 관리', '저축'],
    aliases: ['finance-basics', '재테크 입문'],
  },
  {
    key: '국내주식·ETF',
    label: '국내주식·ETF',
    slug: '국내주식-etf',
    emoji: '📈',
    title: '국내주식·ETF 질문',
    description: '국내주식, ETF, 장기투자, 고점 고민처럼 투자자가 자주 묻는 질문을 모았어요.',
    keywords: ['국내주식', '국내 ETF', '코스피', '장기투자'],
    aliases: ['stocks-etf', '주식-etf', '주식·ETF', '국내주식ETF'],
  },
  {
    key: '해외주식·ETF',
    label: '해외주식·ETF',
    slug: '해외주식-etf',
    emoji: '🌎',
    title: '해외주식·ETF 질문',
    description: '미국주식, S&P500, 나스닥 ETF처럼 해외 자산에 대한 질문을 모았어요.',
    keywords: ['해외주식', '미국주식', 'S&P500', '나스닥 ETF'],
    aliases: ['global-stocks-etf', '미국주식', '해외주식ETF'],
  },
  {
    key: '절세',
    label: '절세',
    slug: '절세',
    emoji: '🏦',
    title: '절세 질문',
    description: 'ISA, 연금저축, 세액공제처럼 세금을 아끼는 계좌와 제도 질문을 모았어요.',
    keywords: ['절세', 'ISA', '연금저축', '세액공제'],
    aliases: ['tax-saving'],
  },
  {
    key: '보험',
    label: '보험',
    slug: '보험',
    emoji: '🛡️',
    title: '보험 질문',
    description: '실손보험, 보험 리모델링, 20대 보험처럼 꼭 필요한 보장에 대한 질문을 모았어요.',
    keywords: ['보험', '실손보험', '보험 리모델링'],
    aliases: ['insurance'],
  },
  {
    key: '대출·부채',
    label: '대출·부채',
    slug: '대출-부채',
    emoji: '💳',
    title: '대출·부채 질문',
    description: '학자금대출, 신용대출, 부채 상환 순서처럼 돈을 빌리고 갚는 고민을 모았어요.',
    keywords: ['대출', '부채', '학자금대출', '신용관리'],
    aliases: ['debt-loans'],
  },
];

export const CATEGORY_LABELS = ['전체', ...CATEGORY_DEFINITIONS.map(category => category.key)];

export const CATEGORY_EMOJI = Object.fromEntries(
  CATEGORY_DEFINITIONS.flatMap(category => [
    [category.key, category.emoji],
    [category.label, category.emoji],
    ...(category.aliases || []).map(alias => [alias, category.emoji]),
  ]),
) as Record<string, string>;

export function normalizeCategory(input?: string | null) {
  if (!input) return '재테크입문';
  const found = CATEGORY_DEFINITIONS.find(category => (
    category.key === input ||
    category.label === input ||
    category.aliases?.includes(input)
  ));
  return found?.key || input;
}

export function getCategoryBySlug(slug: string) {
  const decoded = decodeURIComponent(slug);
  return CATEGORY_DEFINITIONS.find(category => (
    category.slug === decoded ||
    category.key === decoded ||
    category.label === decoded ||
    category.aliases?.includes(decoded)
  )) || null;
}

export function getCategoryByKey(key: string) {
  const normalized = normalizeCategory(key);
  return CATEGORY_DEFINITIONS.find(category => category.key === normalized) || null;
}
