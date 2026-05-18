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
    label: '재테크',
    slug: '재테크',
    emoji: '💡',
    title: '재테크 질문',
    description: '저축, 투자, 월급 관리, 목돈 만들기처럼 돈을 굴리기 전에 자주 부딪히는 고민을 모았어요.',
    keywords: ['재테크', '사회초년생 재테크', '월급 관리', '저축'],
    aliases: ['finance-basics', '재테크 입문', '재테크입문', '재테크-입문'],
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
    key: '배당주·ETF',
    label: '배당주·ETF',
    slug: '배당주-etf',
    emoji: '💸',
    title: '배당주·ETF 질문',
    description: '월배당 ETF, 고배당주, 배당성장처럼 현금흐름 만드는 투자 질문을 모았어요.',
    keywords: ['배당주', '월배당 ETF', '고배당', 'SCHD', 'JEPI', '배당성장'],
    aliases: ['dividend', '배당', '배당투자'],
  },
  {
    key: '적립식·연금',
    label: '적립식·연금',
    slug: '적립식-연금',
    emoji: '🐢',
    title: '적립식·연금 질문',
    description: '자동매수, DCA, 연금저축·IRP처럼 장기·꾸준한 투자에 대한 질문을 모았어요.',
    keywords: ['적립식', 'DCA', '자동매수', '연금저축', 'IRP', '퇴직연금'],
    aliases: ['dca', '연금', '적립식투자', '퇴직연금'],
  },
  {
    key: '테마·트렌드',
    label: '테마·트렌드',
    slug: '테마-트렌드',
    emoji: '🔥',
    title: '테마·트렌드 질문',
    description: 'AI·반도체·2차전지·로봇·우주처럼 떠오르는 테마 투자에 대한 질문을 모았어요.',
    keywords: ['AI', '반도체', '2차전지', '로봇', '우주', '테마주', 'TIGER AI'],
    aliases: ['theme', '테마투자', '트렌드'],
  },
  {
    key: '자산관리',
    label: '자산관리',
    slug: '자산관리',
    emoji: '💼',
    title: '자산관리 질문',
    description: '포트폴리오 리밸런싱, 자산배분, 위험관리처럼 큰 그림 자산관리 질문을 모았어요.',
    keywords: ['자산관리', '리밸런싱', '자산배분', '60/40', '포트폴리오'],
    aliases: ['wealth', '포트폴리오'],
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

export const CATEGORY_DISPLAY_LABEL = Object.fromEntries(
  CATEGORY_DEFINITIONS.flatMap(category => [
    [category.key, category.label],
    [category.label, category.label],
    ...(category.aliases || []).map(alias => [alias, category.label]),
  ]),
) as Record<string, string>;

export const CREATOR_LEGACY_TOPIC_MAP: Record<string, string[]> = {
  재테크입문: ['재테크', '월급쟁이 재테크'],
  '국내주식·ETF': ['ETF', '주식', '국내주식·ETF', '국내 ETF'],
  '해외주식·ETF': ['해외주식·ETF', '미국주식', '미국 ETF', '시장 인사이트'],
  '배당주·ETF': ['배당주·ETF', '배당', '월배당', 'ETF'],
  '적립식·연금': ['적립식·연금', '연금', '은퇴 설계', '퇴직연금'],
  '테마·트렌드': ['테마·트렌드', '시장 인사이트', '대가 분석', '코인'],
  자산관리: ['자산관리', '월급쟁이 재테크', '은퇴 설계'],
  절세: ['절세'],
  보험: ['보험'],
  '대출·부채': ['대출·부채', '대출', '부채'],
};

export function getCategoryLabel(input?: string | null) {
  if (!input) return '재테크';
  return CATEGORY_DISPLAY_LABEL[input] || input;
}

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
  return CATEGORY_DEFINITIONS.find(category => (
    category.slug === slug || category.aliases?.includes(slug)
  )) || null;
}

export function getCategoryByKey(key: string) {
  const normalized = normalizeCategory(key);
  return CATEGORY_DEFINITIONS.find(category => category.key === normalized) || null;
}

export function categoryTerms(input: string): string[] {
  const category = CATEGORY_DEFINITIONS.find(c => c.key === input || c.label === input) || getCategoryByKey(input);
  const terms = [
    input,
    category?.key,
    category?.label,
    ...(category?.aliases || []),
    ...(category?.keywords || []),
    ...(CREATOR_LEGACY_TOPIC_MAP[category?.key || input] || []),
  ].filter(Boolean) as string[];
  return Array.from(new Set(terms));
}

export function topicMatchesCategory(topic: string, categoryKey: string): boolean {
  return categoryTerms(categoryKey).some(term => (
    topic === term ||
    topic.includes(term) ||
    term.includes(topic)
  ));
}

export function getCategoryLabelFromTopic(topic: string) {
  const match = CATEGORY_DEFINITIONS.find(category => topicMatchesCategory(topic, category.key));
  return match?.label || getCategoryLabel(topic);
}

export function normalizeCreatorTopic(topic: string) {
  const match = CATEGORY_DEFINITIONS.find(category => topicMatchesCategory(topic, category.key));
  return match?.key || normalizeCategory(topic);
}

export function normalizeCreatorTopics(topics: string[]) {
  const seen = new Set<string>();
  return topics
    .map(normalizeCreatorTopic)
    .filter(topic => {
      if (!topic || seen.has(topic)) return false;
      seen.add(topic);
      return true;
    });
}
