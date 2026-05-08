export const sampleQuestions = [
  {
    id: 1, cat: '재테크 입문', topic: '저축·목돈', author: '신중한토끼', time: '1일 전',
    em: '🐰', lv: 2, title: '월급 300만원인데 저축은 얼마나 해야 하나요?',
    body: '사회초년생인데 고정지출 빼고 나면 항상 150만원 정도 남는데, 이걸 어떻게 쪼개야 할지 모르겠어요.',
    ans: 12, adopted: true, slug: 'monthly-300',
  },
  {
    id: 2, cat: '주식·ETF', topic: 'ETF', author: '궁금한직장인', time: '15분 전',
    em: '🦊', lv: 1, title: 'S&P500 ETF 지금 들어가도 늦지 않나요? 고점 아닌가요?',
    body: '주변에서 다들 S&P500 ETF 사라고 하는데 이미 많이 오른 것 같아서 지금 들어가면 손해볼 것 같아요.',
    ans: 28, adopted: false, slug: 'sp500-etf',
  },
  {
    id: 3, cat: '절세', topic: 'ISA·연금저축', author: '절세고민중', time: '1시간 전',
    em: '🐻', lv: 0, title: 'ISA 계좌랑 연금저축 중에 뭐 먼저 채워야 하나요?',
    body: '세금 아껴야 한다는 건 알겠는데 ISA랑 연금저축을 동시에 채우기엔 돈이 부족해요.',
    ans: 7, adopted: false, slug: 'isa-vs-pension',
  },
  {
    id: 4, cat: '보험', topic: '실손보험', author: '건강이걱정', time: '2시간 전',
    em: '🦋', lv: 1, title: '실손보험 꼭 있어야 하나요? 건강한 20대인데 없어도 될까요?',
    body: '20대 초반인데 부모님이 실손보험 들라고 하시는데 건강하니까 필요 없을 것 같기도 하고.',
    ans: 15, adopted: true, slug: 'silson-insurance',
  },
];

export type Question = {
  id: number;
  cat: string;
  topic: string;
  author: string;
  time: string;
  em: string;
  lv: number;
  title: string;
  body: string;
  ans: number;
  adopted: boolean;
  slug: string;
  dbId?: string; // Supabase UUID
  createdAt?: string;
  likeCount?: number;
};

export const LEVELS = [
  { l: 'Lv.0', color: '#8B95A1' },
  { l: 'Lv.1', color: '#00C73C' },
  { l: 'Lv.2', color: '#3182F6' },
  { l: 'Lv.3', color: '#F59E0B' },
];

export const EMOJI = ['🐯','🐰','🦊','🐻','🦋','🐸','🐼','🦁','🐨','🐮','🐷','🐙'];
