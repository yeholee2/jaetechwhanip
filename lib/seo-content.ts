import { SITE_NAME, truncateDescription, type SeoQuestion } from '@/lib/seo';
import { getCategoryByKey, getCategoryLabel } from '@/lib/categories';
import type { AnswerDetail, QuestionDetail } from '@/lib/question-detail';

type SeoInput = SeoQuestion | QuestionDetail;

const CATEGORY_TERMS: Record<string, string[]> = {
  '재테크': ['사회초년생 재테크', '월급 관리', '저축 비율', '목돈 만들기'],
  '재테크입문': ['사회초년생 재테크', '월급 관리', '저축 비율', '목돈 만들기'],
  '국내주식·ETF': ['국내 ETF 투자', '코스피', '장기 투자', '분산 투자'],
  '해외주식·ETF': ['해외 ETF 투자', 'S&P500', '미국 주식', '나스닥'],
  '절세': ['ISA', '연금저축', '세액공제', '절세계좌'],
  '보험': ['실손보험', '보험 리모델링', '보장 분석', '20대 보험'],
  '대출·부채': ['대출 상환', '부채 관리', '금리', '신용 관리'],
};

const SEARCH_INTENTS = [
  { test: /(월급|급여|연봉|저축|모으|목돈|비상금)/, phrase: '월급에서 저축을 얼마나 해야 하는지' },
  { test: /(S&P|SPY|VOO|ETF|주식|미국장|미국 주식|고점)/i, phrase: 'ETF에 지금 투자해도 되는지' },
  { test: /(ISA|연금|세액공제|절세|퇴직연금)/i, phrase: '절세계좌 우선순위를 어떻게 정할지' },
  { test: /(보험|실손|실비|암보험|보장)/, phrase: '보험을 유지하거나 가입해야 하는지' },
  { test: /(대출|부채|빚|금리|상환|전세)/, phrase: '대출과 부채를 어떻게 관리할지' },
];

function pick<T>(value: T | undefined, fallback: T) {
  return value === undefined ? fallback : value;
}

export function normalizeSeoText(text: string | null | undefined) {
  return (text || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[!?]{2,}/g, '?')
    .replace(/[ㅋㅎㅠㅜ]{3,}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getQuestionCategory(question: SeoInput) {
  return getCategoryLabel(normalizeSeoText(question.category) || '재테크');
}

export function getQuestionTopicPath(question: SeoInput) {
  const category = getCategoryByKey(getQuestionCategory(question));
  return `/topics/${encodeURIComponent(category?.slug || '재테크')}`;
}

export function getAnswerCount(question: SeoInput) {
  const normalized = question as SeoQuestion & Partial<QuestionDetail>;
  return pick(normalized.answerCount, normalized.answer_count) ?? 0;
}

export function getLikeCount(question: SeoInput) {
  const normalized = question as SeoQuestion & Partial<QuestionDetail>;
  return pick(normalized.likeCount, normalized.like_count) ?? 0;
}

export function getCreatedAt(question: SeoInput) {
  const normalized = question as SeoQuestion & Partial<QuestionDetail>;
  return normalized.createdAt ?? normalized.created_at;
}

export function inferSearchIntent(question: SeoInput) {
  const haystack = `${question.title} ${question.body} ${question.category || ''}`;
  const found = SEARCH_INTENTS.find(intent => intent.test.test(haystack));
  return found?.phrase || `${getQuestionCategory(question)} 고민을 어떻게 판단할지`;
}

export function buildSeoQuestionTitle(question: SeoInput) {
  const title = normalizeSeoText(question.title);
  const category = getQuestionCategory(question);

  if (!title) return `${category} 질문과 답변`;

  const questionLike = /[?？]$/.test(title) || /(나요|까요|해야|할까|좋을까|맞을까|되나|되나요|필요|얼마)/.test(title);
  const cleanTitle = title.replace(/[?？]+$/, '');

  if (questionLike) {
    return truncateDescription(`${cleanTitle}? ${category} 답변`, 58);
  }

  if (cleanTitle.length <= 12) {
    return truncateDescription(`${cleanTitle} 관련 ${category} 질문과 답변`, 58);
  }

  return truncateDescription(`${cleanTitle} - ${category} Q&A`, 58);
}

export function buildSeoDescription(question: SeoInput, answers: AnswerDetail[] = []) {
  const body = normalizeSeoText(question.body);
  const title = normalizeSeoText(question.title);
  const category = getQuestionCategory(question);
  const answerCount = Math.max(getAnswerCount(question), answers.length);
  const adopted = answers.find(answer => answer.is_adopted && normalizeSeoText(answer.body));
  const bestAnswer = adopted || answers.find(answer => normalizeSeoText(answer.body));
  const intent = inferSearchIntent(question);

  const source = body && body !== title ? body : `${title}에 대한 ${category} 고민입니다.`;
  const answerHint = bestAnswer
    ? ` 채택/주요 답변: ${normalizeSeoText(bestAnswer.body)}`
    : answerCount > 0
      ? ` 현재 ${answerCount}개의 답변이 달렸습니다.`
      : ' 답변을 기다리는 질문입니다.';

  return truncateDescription(`${intent} 고민한 질문입니다. ${source}${answerHint}`, 155);
}

export function buildSeoKeywords(question: SeoInput) {
  const category = getQuestionCategory(question);
  const text = `${question.title} ${question.body}`;
  const detected = new Set<string>([
    category,
    ...(CATEGORY_TERMS[category] || []),
    '재테크 질문',
    '금융 Q&A',
    SITE_NAME,
  ]);

  ['S&P500', 'ETF', 'ISA', '연금저축', '실손보험', '월급', '저축', '대출', '금리', '절세']
    .filter(term => text.toLowerCase().includes(term.toLowerCase()))
    .forEach(term => detected.add(term));

  return Array.from(detected).filter(Boolean).slice(0, 10);
}

export function buildJsonLdQuestionText(question: SeoInput, answers: AnswerDetail[] = []) {
  const body = normalizeSeoText(question.body);
  const title = normalizeSeoText(question.title);
  const intent = inferSearchIntent(question);
  const answerCount = Math.max(getAnswerCount(question), answers.length);
  const answerGuide = answerCount > 0
    ? `관련 답변 ${answerCount}개를 바탕으로 판단 기준을 정리합니다.`
    : '답변을 기다리는 질문입니다.';

  if (body && body !== title) {
    return truncateDescription(`${body} ${intent} 고민에 대한 ${answerGuide}`, 420);
  }

  return truncateDescription(`${buildSeoDescription(question, answers)} ${answerGuide}`, 420);
}

export function buildSeoAnswerText(answer: AnswerDetail) {
  return truncateDescription(normalizeSeoText(answer.body), 650);
}

export function buildAnswerSnippet(answers: AnswerDetail[]) {
  const adopted = answers.find(answer => answer.is_adopted && normalizeSeoText(answer.body));
  const first = adopted || answers.find(answer => normalizeSeoText(answer.body));
  return first ? truncateDescription(normalizeSeoText(first.body), 120) : '';
}

type FeedSeoInput = {
  title: string;
  description?: string;
  summary?: string;
  contentHtml?: string;
  category?: string;
  source?: string;
  sourceName?: string;
  tags?: string[];
};

type SparringSeoInput = {
  title: string;
  body?: string | null;
  category?: string;
  side_a_label?: string;
  side_b_label?: string;
  stats?: {
    votes_total?: number;
    comment_count?: number;
  };
};

function stripMarkup(text: string | null | undefined) {
  return normalizeSeoText(
    (text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"'),
  );
}

function getSeoCategory(category?: string | null) {
  return getCategoryLabel(normalizeSeoText(category) || '재테크');
}

export function buildFeedSeoTitle(article: FeedSeoInput) {
  const title = normalizeSeoText(article.title);
  const category = getSeoCategory(article.category);

  if (!title) return `${category} 재테크 피드`;
  if (title.length <= 16) return truncateDescription(`${title} - ${category} 재테크 해설`, 58);
  return truncateDescription(`${title} - ${category} 한입 정리`, 58);
}

export function buildFeedSeoDescription(article: FeedSeoInput) {
  const title = normalizeSeoText(article.title);
  const category = getSeoCategory(article.category);
  const lead = stripMarkup(article.description || article.summary || article.contentHtml);
  const source = normalizeSeoText(article.sourceName || article.source || '재테크한입');
  const tags = (article.tags || []).map(normalizeSeoText).filter(Boolean).slice(0, 3).join(', ');
  const tagLine = tags ? ` 주요 키워드는 ${tags}입니다.` : '';

  if (lead) {
    return truncateDescription(
      `${lead} ${category} 관점에서 핵심 판단 기준과 질문 전 체크포인트를 ${source} 흐름으로 정리했습니다.${tagLine}`,
      155,
    );
  }

  return truncateDescription(
    `${title} 내용을 ${category} 관점에서 한입 크기로 정리했습니다. 뉴스와 칼럼을 그대로 옮기지 않고 판단 기준 중심으로 읽어보세요.${tagLine}`,
    155,
  );
}

export function buildFeedSeoKeywords(article: FeedSeoInput) {
  const category = getSeoCategory(article.category);
  const tags = (article.tags || []).map(normalizeSeoText).filter(Boolean);
  return Array.from(new Set([
    category,
    ...tags,
    '재테크 피드',
    '금융 뉴스 정리',
    '투자 칼럼',
    SITE_NAME,
  ])).slice(0, 10);
}

export function buildFeedListSeoTitle(sourceLabel = '전체', categoryLabel = '전체') {
  const source = sourceLabel === '전체' ? '피드' : sourceLabel;
  const category = categoryLabel === '전체' ? '재테크' : getSeoCategory(categoryLabel);

  if (sourceLabel === '전체' && categoryLabel === '전체') return '재테크 피드';
  return truncateDescription(`${category} ${source} 모음`, 48);
}

export function buildFeedListSeoDescription(sourceLabel = '전체', categoryLabel = '전체') {
  const category = categoryLabel === '전체' ? '재테크' : getSeoCategory(categoryLabel);
  const sourceText = sourceLabel === '뉴스'
    ? '금융 뉴스를'
    : sourceLabel === '칼럼'
      ? '한입 자체 칼럼을'
      : '한입 칼럼과 금융 뉴스를';

  return truncateDescription(
    `${category} 흐름을 보기 좋게 읽을 수 있도록 ${sourceText} 판단 기준 중심으로 정리한 피드입니다. 질문하기 전에 시장 맥락과 체크포인트를 빠르게 확인하세요.`,
    155,
  );
}

export function buildSparringSeoTitle(sparring: SparringSeoInput) {
  const title = normalizeSeoText(sparring.title);
  const category = getSeoCategory(sparring.category);

  if (!title) return `${category} 머니 스파링`;
  return truncateDescription(`머니 스파링: ${title}`, 58);
}

export function buildSparringSeoDescription(sparring: SparringSeoInput) {
  const title = normalizeSeoText(sparring.title);
  const category = getSeoCategory(sparring.category);
  const body = normalizeSeoText(sparring.body || '');
  const sideA = normalizeSeoText(sparring.side_a_label);
  const sideB = normalizeSeoText(sparring.side_b_label);
  const choices = sideA && sideB ? ` 선택지는 "${sideA}"와 "${sideB}"입니다.` : '';
  const volume = sparring.stats?.votes_total || sparring.stats?.comment_count
    ? ` 현재 투표 ${sparring.stats?.votes_total || 0}표, 토론 ${sparring.stats?.comment_count || 0}개 기준으로 의견을 모읍니다.`
    : '';

  return truncateDescription(
    `${body || `${title}에 대한 ${category} 논쟁입니다.`}${choices}${volume} 결과를 먼저 노출하기보다 내 판단을 먼저 고르고 토론을 확인해 보세요.`,
    155,
  );
}

export function buildSparringSeoKeywords(sparring: SparringSeoInput) {
  const category = getSeoCategory(sparring.category);
  return Array.from(new Set([
    category,
    normalizeSeoText(sparring.side_a_label),
    normalizeSeoText(sparring.side_b_label),
    '재테크 토론',
    '머니 스파링',
    '투자 의사결정',
    SITE_NAME,
  ].filter(Boolean))).slice(0, 10);
}
