export type Question = {
  id: number;
  slug: string;
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
};

export const sampleQuestions: Question[] = [
  {
    id: 1, slug: 'monthly-300-saving',
    cat: '재테크 입문', topic: '저축·목돈',
    author: '신중한토끼', time: '1일 전', em: '🐰', lv: 1,
    title: '월급 300만원인데 저축은 얼마나 해야 하나요?',
    body: '사회초년생인데 고정지출 빼고 나면 항상 150만원 정도 남는데, 이걸 어떻게 쪼개야 할지 모르겠어요. 비상금이 먼저인지 투자가 먼저인지도 모르겠고요.',
    ans: 12, adopted: true,
  },
  {
    id: 2, slug: 'sp500-etf-now',
    cat: '주식·ETF', topic: 'ETF',
    author: '궁금한직장인', time: '15분 전', em: '🦊', lv: 2,
    title: 'S&P500 ETF 지금 들어가도 늦지 않나요? 고점 아닌가요?',
    body: '주변에서 다들 S&P500 ETF 사라고 하는데 이미 많이 오른 것 같아서 지금 들어가면 손해볼 것 같아요.',
    ans: 28, adopted: false,
  },
  {
    id: 3, slug: 'isa-vs-pension',
    cat: '절세', topic: 'ISA·연금저축',
    author: '절세고민중', time: '1시간 전', em: '🐻', lv: 0,
    title: 'ISA 계좌랑 연금저축 중에 뭐 먼저 채워야 하나요?',
    body: '세금 아껴야 한다는 건 알겠는데 ISA랑 연금저축을 동시에 채우기엔 돈이 부족해요. 연봉 4천만원 기준으로 뭘 먼저 가져가는 게 맞나요?',
    ans: 7, adopted: false,
  },
  {
    id: 4, slug: 'silson-insurance-20s',
    cat: '보험', topic: '실손보험',
    author: '건강한이십대', time: '2시간 전', em: '🐼', lv: 3,
    title: '실손보험 꼭 있어야 하나요? 건강한 20대인데 없애도 될까요?',
    body: '20대 초반인데 병원을 거의 안 가서 실손보험 돈이 아깝게 느껴져요. 해지해도 될지 모르겠어서요.',
    ans: 19, adopted: true,
  },
  {
    id: 5, slug: 'student-loan-vs-invest',
    cat: '대출·부채', topic: '학자금대출',
    author: '취준생고민', time: '3시간 전', em: '🦁', lv: 2,
    title: '학자금 대출 빨리 갚는 게 맞나요, 투자하는 게 맞나요?',
    body: '취업하고 학자금 대출 1500만원이 남아있는데 금리가 1.7%예요. 빨리 갚는 게 맞는지, S&P500 적립식으로 가는 게 맞는지 모르겠어요.',
    ans: 34, adopted: false,
  },
  {
    id: 6, slug: 'tiger-vs-kodex-sp500',
    cat: '주식·ETF', topic: '미국주식',
    author: 'ETF마스터', time: '4시간 전', em: '🦋', lv: 3,
    title: 'TIGER S&P500 vs KODEX S&P500 뭐가 더 나은가요?',
    body: '둘 다 S&P500 추종인데 운용보수도 비슷하고 뭐가 다른지 모르겠어요. 장기투자 관점에서 어떤 기준으로 고르면 될까요?',
    ans: 41, adopted: true,
  },
];

export const LEVELS = [
  { l: '브론즈', c: 'lv0' },
  { l: '실버', c: 'lv1' },
  { l: '골드', c: 'lv2' },
  { l: '전문가', c: 'lv3' },
];

export const EMOJI = ['🐰','🦊','🐻','🐼','🦁','🐯','🐸','🐧','🦋','🦔'];
