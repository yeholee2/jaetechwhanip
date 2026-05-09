import { SITE_NAME, truncateDescription, type SeoQuestion } from '@/lib/seo';
import { getCategoryByKey } from '@/lib/categories';
import type { AnswerDetail, QuestionDetail } from '@/lib/question-detail';

type SeoInput = SeoQuestion | QuestionDetail;

const CATEGORY_TERMS: Record<string, string[]> = {
  '재테크 입문': ['사회초년생 재테크', '월급 관리', '저축 비율', '목돈 만들기'],
  '주식·ETF': ['ETF 투자', 'S&P500', '장기 투자', '분산 투자'],
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
  return normalizeSeoText(question.category) || '재테크';
}

export function getQuestionTopicPath(question: SeoInput) {
  const category = getCategoryByKey(getQuestionCategory(question));
  return `/topics/${encodeURIComponent(category?.slug || '재테크-입문')}`;
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
