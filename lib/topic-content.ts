/**
 * 카테고리(토픽)별 부가 콘텐츠 — 관련 ETF·핵심 용어 매핑.
 *
 * SEO 강화용. /topics/[slug] 랜딩 페이지에서 사용.
 */
import { getStaticEtfMetadata, type EtfInfo } from '@/lib/etfs';
import { GLOSSARY, type GlossaryEntry } from '@/lib/etfGlossary';

const staticEtfs = getStaticEtfMetadata();

type TopicExtras = {
  /** 관련 ETF 코드 (없으면 keywords로 fallback 매칭) */
  etfCodes?: string[];
  /** 핵심 용어 title (없으면 keywords로 fallback 매칭) */
  glossaryTitles?: string[];
  /** 카테고리 한줄 요약 (SEO에 hero로 노출) */
  intro?: string;
};

const TOPIC_EXTRAS: Record<string, TopicExtras> = {
  '재테크입문': {
    etfCodes: ['360750', '133690', '305080', '379800'],
    glossaryTitles: ['S&P500', '나스닥100', 'TDF'],
    intro: '재테크 처음이라면 — 분산투자·자산배분의 기본부터 차근차근.',
  },
  '국내주식·ETF': {
    etfCodes: ['360750', '133690', '379800', '102110', '305080', '466920'],
    glossaryTitles: ['S&P500', '나스닥100', '커버드콜', '레버리지'],
    intro: 'KOSPI·KOSDAQ 상장 ETF와 국내 시장 흐름. 환헤지·환노출도 함께.',
  },
  '해외주식·ETF': {
    etfCodes: ['360750', '133690', '379800', '466920', '305080'],
    glossaryTitles: ['S&P500', '나스닥100', 'AI', '반도체', '환헤지'],
    intro: 'S&P500·나스닥·테마 ETF로 글로벌 시장에 분산투자하는 법.',
  },
  '절세': {
    etfCodes: [],
    glossaryTitles: ['TDF'],
    intro: 'ISA·연금저축·IRP — 세금 줄이고 노후를 준비하는 계좌의 모든 것.',
  },
  '보험': {
    etfCodes: [],
    glossaryTitles: [],
    intro: '실손·종신·자동차 — 꼭 필요한 보험만 효율적으로 정리하는 법.',
  },
  '대출·부채': {
    etfCodes: [],
    glossaryTitles: [],
    intro: '학자금·신용대출·전세대출 — 갚는 순서와 협상 전략.',
  },
};

export function getTopicExtras(categoryKey: string, keywords: string[]): {
  etfs: EtfInfo[];
  glossary: GlossaryEntry[];
  intro?: string;
} {
  const extras = TOPIC_EXTRAS[categoryKey] || {};

  // 1) ETF: 매핑된 코드 우선, 부족하면 keywords로 fallback
  let etfList: EtfInfo[] = [];
  if (extras.etfCodes?.length) {
    etfList = extras.etfCodes
      .map(code => staticEtfs.find(e => e.code === code))
      .filter((e): e is EtfInfo => !!e);
  }
  if (etfList.length < 4) {
    const kwLower = keywords.map(k => k.toLowerCase());
    const more = staticEtfs
      .filter(e => !etfList.find(x => x.code === e.code))
      .filter(e =>
        kwLower.some(kw =>
          e.name.toLowerCase().includes(kw) ||
          e.theme.toLowerCase().includes(kw) ||
          e.shortName.toLowerCase().includes(kw)
        )
      )
      .slice(0, 6 - etfList.length);
    etfList = [...etfList, ...more];
  }
  etfList = etfList.slice(0, 6);

  // 2) Glossary: title 매핑 우선, 부족하면 keywords와 aliases 매칭
  let glossaryList: GlossaryEntry[] = [];
  if (extras.glossaryTitles?.length) {
    glossaryList = extras.glossaryTitles
      .map(t => GLOSSARY.find(g => g.title === t))
      .filter((g): g is GlossaryEntry => !!g);
  }
  if (glossaryList.length < 4) {
    const kwLower = keywords.map(k => k.toLowerCase());
    const more = GLOSSARY
      .filter(g => !glossaryList.find(x => x.title === g.title))
      .filter(g => {
        const all = [g.title, ...(g.aliases || [])].map(s => s.toLowerCase());
        return all.some(s => kwLower.some(kw => s.includes(kw) || kw.includes(s)));
      })
      .slice(0, 5 - glossaryList.length);
    glossaryList = [...glossaryList, ...more];
  }
  glossaryList = glossaryList.slice(0, 5);

  return { etfs: etfList, glossary: glossaryList, intro: extras.intro };
}
