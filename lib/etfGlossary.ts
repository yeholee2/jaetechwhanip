/**
 * ETF 테마/용어 사전 — 칩 hover 시 1~2줄 평문 설명을 띄우는 데 사용.
 *
 * 키는 소문자/공백 제거 후 매칭. 같은 뜻 변형은 alias로 묶어 정의.
 */

export type GlossaryEntry = {
  title: string;          // 툴팁 굵은 제목
  body: string;           // 1~2줄 설명
  aliases?: string[];     // 동의어 (#태그 다양한 표기)
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    title: 'UAM',
    body: '도심 항공 모빌리티(Urban Air Mobility). 전기 수직이착륙 비행체(eVTOL) 같은 도심 비행 교통수단을 만드는 회사들에 투자해요.',
    aliases: ['도심항공모빌리티', '도심항공'],
  },
  {
    title: '반도체',
    body: 'CPU·메모리·파운드리 같은 반도체 칩을 설계·제조·검사하는 회사들. 경기 변동에 민감한 사이클 산업이에요.',
  },
  {
    title: '2차전지',
    body: '전기차·ESS에 들어가는 리튬이온 배터리 셀·소재·장비 회사. K-배터리 3사(LG엔솔·삼성SDI·SK온)와 양극재 업체들이 대표적이에요.',
    aliases: ['이차전지', '배터리', '2차 전지'],
  },
  {
    title: '원자력',
    body: '원전 설계·기자재·소형모듈원전(SMR)·우라늄 관련 기업. 탄소중립 정책 기대감으로 주목받지만 정책 변동성이 큰 편이에요.',
    aliases: ['원전', '원자력발전', 'SMR'],
  },
  {
    title: 'AI',
    body: '인공지능 인프라(GPU·클라우드·반도체)와 AI 모델·서비스 기업. 엔비디아·마이크로소프트 같은 글로벌 빅테크 비중이 높아요.',
    aliases: ['인공지능', 'A.I.'],
  },
  {
    title: '바이오',
    body: '신약 개발·제약·진단·헬스케어 기기 회사들. 임상 결과에 따라 변동성이 크고, 개별 종목 위험이 높아 ETF로 분산이 유효해요.',
    aliases: ['바이오테크', '제약', '헬스케어'],
  },
  {
    title: '로봇',
    body: '산업용·서비스·휴머노이드 로봇 제조·부품·핵심 부품(감속기·센서) 회사. 자동화·제조 효율 트렌드의 핵심 키워드.',
    aliases: ['로보틱스'],
  },
  {
    title: '리츠',
    body: '부동산투자신탁(REITs). 빌딩·물류센터·데이터센터 등을 보유하고 임대료를 분배하는 ETF. 보통 월 또는 분기 분배가 많아요.',
    aliases: ['REITs', 'reit', 'REIT'],
  },
  {
    title: 'TDF',
    body: '타겟데이트펀드(Target Date Fund). 은퇴 시점에 맞춰 주식 비중을 자동으로 줄여주는 자산배분 상품이에요.',
    aliases: ['타겟데이트', '타겟데이트펀드'],
  },
  {
    title: '커버드콜',
    body: '주식을 들고 콜옵션을 팔아 옵션 프리미엄을 분배금으로 지급하는 전략. 분배는 높지만 상승 여력이 제한되는 구조예요.',
    aliases: ['Covered Call', '커버드 콜'],
  },
  {
    title: 'S&P500',
    body: '미국 대형주 500개로 구성된 대표 지수. 미국 시장 전체 흐름을 가장 가깝게 따라가요.',
    aliases: ['S&P', 'SnP', '미국 S&P500'],
  },
  {
    title: '나스닥100',
    body: '나스닥 상장 비금융 대형주 100개. 애플·마이크로소프트·엔비디아 등 빅테크 비중이 높아 기술주 성격이 강해요.',
    aliases: ['QQQ', 'Nasdaq100', '나스닥'],
  },
  {
    title: '환헤지',
    body: '달러 변동을 차단해 순수 자산 수익만 가져가는 상품. 보통 ETF 이름 뒤에 (H) 표기가 붙어요.',
    aliases: ['헤지', '환헷지', 'Hedged'],
  },
  {
    title: '레버리지',
    body: '기초지수의 일일 변동을 2배로 추종. 장기 보유 시 변동성 손실(decay)로 단순 2배가 되지 않을 수 있어요.',
    aliases: ['레버', '2X', '2x'],
  },
  {
    title: '인버스',
    body: '기초지수가 떨어지면 오르도록 설계된 ETF. 단기 헤지 용도이며, 장기 보유 시 손실 가능성이 큽니다.',
    aliases: ['Inverse', '곱버스', '2x인버스'],
  },
  {
    title: '채권',
    body: '국채·회사채에 투자해 이자 수익(쿠폰)을 분배하는 ETF. 주식 대비 안정적이지만 금리 상승기에는 가격 하락 위험이 있어요.',
    aliases: ['국채', '회사채', 'Bond'],
  },
  {
    title: '금',
    body: '금 선물·실물에 투자. 인플레이션 헤지·달러 대체 자산으로 쓰이지만 자체 이자/배당은 없어요.',
    aliases: ['Gold', '금현물', '금ETF'],
  },
  {
    title: '배당',
    body: '배당을 꾸준히 지급하는 종목 위주로 담은 ETF. 분배수익률이 높고 변동성이 상대적으로 낮은 편이에요.',
    aliases: ['고배당', '배당주', '배당귀족'],
  },
];

// 인덱스 빌드
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '').replace(/[#.]/g, '');
}

const LOOKUP = new Map<string, GlossaryEntry>();
for (const e of GLOSSARY) {
  LOOKUP.set(norm(e.title), e);
  for (const a of e.aliases || []) {
    LOOKUP.set(norm(a), e);
  }
}

export function lookupGlossary(term: string): GlossaryEntry | null {
  return LOOKUP.get(norm(term)) || null;
}
