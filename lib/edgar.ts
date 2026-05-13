/**
 * SEC EDGAR 13F-HR 파서.
 *
 * 흐름:
 * 1. GET /submissions/CIK{10자리}.json → 최근 filings 목록
 * 2. 13F-HR (또는 13F-HR/A) 가장 최근 1건 찾기 → accession + 보고기간
 * 3. accession 폴더에서 InformationTable XML 찾기
 *    URL: https://www.sec.gov/Archives/edgar/data/{cik(no leading zeros)}/{accession-no-dashes}/{primary-document}
 *    primary-document 이름은 filing index에서 찾음
 * 4. XML 파싱 (infoTable 노드)
 * 5. value (천 달러) 합산 + 비중 계산
 * 6. Top N 반환
 *
 * 주의:
 * - SEC API는 User-Agent 헤더 필수 (이메일 포함)
 * - rate limit: 10 req/sec
 */

const SEC_HEADERS = {
  'User-Agent': 'ETF한입 contact@hannipmoney.com',
  'Accept-Encoding': 'gzip, deflate',
};

type SubmissionFiling = {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
};

export type EdgarHolding = {
  cusip: string;
  name: string;
  /** value in $ million */
  valueMln: number;
  shares: number;
  weight: number;
  putCall?: 'PUT' | 'CALL' | null;
};

export type Edgar13FSnapshot = {
  cik: string;
  filedAt: string;          // YYYY-MM-DD
  reportDate: string;       // 분기 종료일 YYYY-MM-DD
  quarter: string;          // "2024 Q4"
  totalValueMln: number;
  positionCount: number;
  topHoldings: EdgarHolding[];
};

function pad10(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

function quarterFromDate(yyyymmdd: string): string {
  const [y, m] = yyyymmdd.split('-').map(Number);
  const q = Math.ceil(m / 3);
  return `${y} Q${q}`;
}

/** SEC submissions JSON에서 최근 13F-HR 찾기 */
async function fetchLatest13F(cik: string): Promise<SubmissionFiling | null> {
  const cik10 = pad10(cik);
  const url = `https://data.sec.gov/submissions/CIK${cik10}.json`;
  const r = await fetch(url, { headers: SEC_HEADERS, next: { revalidate: 86400 } });
  if (!r.ok) return null;
  const j = await r.json();
  const recent = j?.filings?.recent;
  if (!recent) return null;
  const forms: string[] = recent.form || [];
  const accs: string[]  = recent.accessionNumber || [];
  const fdates: string[] = recent.filingDate || [];
  const rdates: string[] = recent.reportDate || [];
  const docs: string[]   = recent.primaryDocument || [];

  for (let i = 0; i < forms.length; i++) {
    if (forms[i] === '13F-HR' || forms[i] === '13F-HR/A') {
      return {
        accessionNumber: accs[i],
        filingDate: fdates[i],
        reportDate: rdates[i],
        form: forms[i],
        primaryDocument: docs[i],
      };
    }
  }
  return null;
}

/** Filing index XML에서 InformationTable 파일 찾기 */
async function findInfoTableUrl(cik: string, accession: string): Promise<string | null> {
  const cikNum = String(parseInt(cik, 10));
  const accNoDash = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=13F&dateb=&owner=include&count=40&action=getcompany`;
  // 간단하게 — InformationTable.xml은 보통 표준 이름
  // 더 안정적: filing-index.json 사용
  const indexJsonUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/index.json`;
  try {
    const r = await fetch(indexJsonUrl, { headers: SEC_HEADERS, next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const j = await r.json();
    const items: { name: string }[] = j?.directory?.item || [];
    // InformationTable 후보 — 보통 'infotable.xml' / 'form13fInfoTable.xml' 등
    const info = items.find(it => /informationtable|infotable|form13f/i.test(it.name) && /\.xml$/i.test(it.name));
    if (!info) return null;
    return `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accNoDash}/${info.name}`;
  } catch {
    return null;
  }
}

/** 13F infoTable XML 파싱 — 정규식 기반 */
function parseInfoTableXml(xml: string): Omit<EdgarHolding, 'weight'>[] {
  const out: Omit<EdgarHolding, 'weight'>[] = [];
  // 각 <infoTable> 블록 추출
  const blockRe = /<(?:[\w-]+:)?infoTable>([\s\S]*?)<\/(?:[\w-]+:)?infoTable>/gi;
  let m: RegExpExecArray | null;
  const pick = (block: string, tag: string): string => {
    const re = new RegExp(`<(?:[\\w-]+:)?${tag}>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${tag}>`, 'i');
    const x = re.exec(block);
    return x ? x[1].trim() : '';
  };
  while ((m = blockRe.exec(xml)) !== null) {
    const b = m[1];
    const name = pick(b, 'nameOfIssuer');
    const cusip = pick(b, 'cusip').toUpperCase();
    const valueRaw = pick(b, 'value');
    const shares = parseFloat(pick(b, 'sshPrnamt')) || 0;
    const putCall = pick(b, 'putCall').toUpperCase() as 'PUT' | 'CALL' | '';
    // SEC 'value' 단위: '천 달러'. 2023 이후엔 'thousands' 명시.
    // 2023년 7월부터 thousand로 통일됨.
    const value = parseFloat(valueRaw.replace(/,/g, '')) || 0;
    const valueMln = value / 1000; // 천 달러 → 백만 달러
    if (!name || !cusip) continue;
    out.push({
      cusip,
      name,
      valueMln,
      shares,
      putCall: putCall === 'PUT' || putCall === 'CALL' ? putCall : null,
    });
  }
  return out;
}

/** CIK 입력 받아 최신 13F snapshot 반환 */
export async function fetch13FSnapshot(cik: string, topN = 20): Promise<Edgar13FSnapshot | null> {
  const cik10 = pad10(cik);
  const latest = await fetchLatest13F(cik);
  if (!latest) return null;
  const xmlUrl = await findInfoTableUrl(cik10, latest.accessionNumber);
  if (!xmlUrl) return null;
  const xmlR = await fetch(xmlUrl, { headers: SEC_HEADERS, next: { revalidate: 86400 } });
  if (!xmlR.ok) return null;
  const xml = await xmlR.text();
  const rows = parseInfoTableXml(xml);
  if (rows.length === 0) return null;

  // 같은 발행사·CUSIP 합치기 (옵션·여러 클래스 합산)
  const dedupe = new Map<string, { name: string; valueMln: number; shares: number; putCall: 'PUT' | 'CALL' | null }>();
  for (const r of rows) {
    if (r.putCall) continue; // 옵션 포지션은 일단 제외 (롱 only)
    const key = r.cusip;
    const prev = dedupe.get(key);
    if (prev) {
      prev.valueMln += r.valueMln;
      prev.shares += r.shares;
    } else {
      dedupe.set(key, { name: r.name, valueMln: r.valueMln, shares: r.shares, putCall: r.putCall ?? null });
    }
  }

  const merged = Array.from(dedupe.entries()).map(([cusip, v]) => ({ cusip, ...v }));
  const totalValueMln = merged.reduce((s, m) => s + m.valueMln, 0);

  merged.sort((a, b) => b.valueMln - a.valueMln);
  const top = merged.slice(0, topN).map(r => ({
    cusip: r.cusip,
    name: r.name,
    valueMln: +r.valueMln.toFixed(2),
    shares: r.shares,
    weight: totalValueMln > 0 ? r.valueMln / totalValueMln : 0,
    putCall: r.putCall,
  }));

  return {
    cik: cik10,
    filedAt: latest.filingDate,
    reportDate: latest.reportDate,
    quarter: quarterFromDate(latest.reportDate),
    totalValueMln: +totalValueMln.toFixed(2),
    positionCount: merged.length,
    topHoldings: top,
  };
}
