import { etfs, stripEtfMarketSnapshot, type EtfInfo } from '@/lib/etfs';

type PublicEtfPriceRow = Record<string, string | number | null | undefined>;

export type EtfDataSource = 'public-api' | 'database' | 'static' | 'missing' | 'us-market';

export type EtfInfoWithMarketData = EtfInfo & {
  dataSource: EtfDataSource;
  baseDate?: string;
  nav?: string;
  tradeValue?: string;
  premium?: number;    // 괴리율 % (price vs NAV)
  dataNotice: string;
};

const FSC_ETF_PRICE_ENDPOINT =
  'https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo';

// 시장 마감 시간 (KST) — 마감 후엔 캐시 길게
function isMarketHours(): boolean {
  const now = new Date();
  // KST = UTC+9
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kstNow.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false;
  const hour = kstNow.getUTCHours();
  const minute = kstNow.getUTCMinutes();
  const mins = hour * 60 + minute;
  return mins >= 9 * 60 && mins <= 15 * 60 + 30; // 9:00–15:30 KST
}

export async function getEtfsWithMarketData(baseEtfs: EtfInfo[] = etfs): Promise<EtfInfoWithMarketData[]> {
  const publicRows = await fetchAllPublicEtfPriceRows();

  // 공공 API 결과 매핑용 인덱스 (O(n²) 회피)
  const rowByCode = new Map<string, PublicEtfPriceRow>();
  for (const row of publicRows) {
    const code = normalizeCode(readField(row, 'srtnCd'));
    if (code) rowByCode.set(code, row);
  }

  const inputEtfs = baseEtfs === etfs ? baseEtfs.map(stripEtfMarketSnapshot) : baseEtfs;

  return inputEtfs.map(etf => {
    // 1) 미국 상장 ETF — 한국 공공 API 대상 아님. 별도 미국 시세 API가 붙기 전까지 캐시/공백만 표시.
    if (etf.country === 'US') {
      return withCachedOrMissing(etf, '미국 상장 ETF 시세 API 미연동');
    }

    // 2) 키 미등록 → 시드값으로 위장하지 않고 DB 캐시 또는 공백만 반환
    if (publicRows.length === 0) {
      return withCachedOrMissing(etf, '공공데이터 ETF 시세 API 미연동');
    }

    // 3) 한국 ETF — 공공 API 매칭
    const row = rowByCode.get(etf.code);
    if (!row) {
      return withCachedOrMissing(etf, '공공데이터 ETF 시세 API에서 종목 미수신');
    }

    const changeRate = parseNumber(readField(row, 'fltRt'));
    const priceNum = parseNumber(readField(row, 'clpr'));
    const navNum = parseNumber(readField(row, 'nav'));
    const premium = navNum > 0 ? ((priceNum - navNum) / navNum) * 100 : undefined;

    return {
      ...etf,
      price: formatWon(readField(row, 'clpr')),
      change: formatRate(changeRate),
      changeTone: changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat',
      volume: formatShares(readField(row, 'trqu')),
      aum: formatLargeWon(readField(row, 'mrktTotAmt')),
      nav: formatWon(readField(row, 'nav')),
      tradeValue: formatLargeWon(readField(row, 'trPrc')),
      baseDate: formatBaseDate(readField(row, 'basDt')),
      premium,
      dataSource: 'public-api',
      dataNotice: '금융위원회 증권상품시세정보 기준',
    };
  });
}

function hasCachedMarketSnapshot(etf: EtfInfo) {
  return Boolean(etf.price || etf.change || etf.volume || etf.aum || etf.nav || etf.baseDate);
}

function withCachedOrMissing(etf: EtfInfo, reason: string): EtfInfoWithMarketData {
  if (etf.dataSource === 'static') {
    return {
      ...stripEtfMarketSnapshot(etf),
      dataSource: 'static',
      dataNotice: `${reason} - 시드 시세는 표시하지 않음`,
    };
  }

  if (hasCachedMarketSnapshot(etf)) {
    return {
      ...etf,
      dataSource: 'database',
      dataNotice: etf.baseDate
        ? `DB 저장 시세 · ${etf.baseDate} 기준`
        : `DB 저장 시세 · ${reason}`,
    };
  }

  return {
    ...etf,
    price: '',
    change: '',
    changeTone: 'flat',
    volume: '',
    aum: '',
    nav: '',
    tradeValue: '',
    baseDate: '',
    dataSource: 'missing',
    dataNotice: reason,
  };
}

/** 페이지네이션 자동 — totalCount 보고 모든 페이지 호출 */
async function fetchAllPublicEtfPriceRows(): Promise<PublicEtfPriceRow[]> {
  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.PUBLIC_DATA_SERVICE_KEY ||
    process.env.FSC_SECURITIES_API_KEY;

  if (!serviceKey) return [];

  const PAGE_SIZE = 1000;
  const MAX_PAGES = 5; // 안전 상한 (5000개) — KRX ETF 약 900개 (2026 기준)
  const encodedServiceKey = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
  // 영업시간엔 5분, 마감 후엔 1시간 캐시
  const revalidate = isMarketHours() ? 300 : 3600;

  const collected: PublicEtfPriceRow[] = [];
  for (let pageNo = 1; pageNo <= MAX_PAGES; pageNo++) {
    try {
      const params = new URLSearchParams({
        pageNo: String(pageNo),
        numOfRows: String(PAGE_SIZE),
        resultType: 'json',
      });
      const url = `${FSC_ETF_PRICE_ENDPOINT}?serviceKey=${encodedServiceKey}&${params.toString()}`;
      const response = await fetch(url, { next: { revalidate } });
      if (!response.ok) {
        console.error(`[etf-live-data] HTTP ${response.status} on page ${pageNo}`);
        break;
      }
      const payload = await response.json();
      // 일부 응답은 에러 형식이 다름 (resultCode/resultMsg)
      const resultCode = payload?.response?.header?.resultCode;
      if (resultCode && resultCode !== '00') {
        console.error(`[etf-live-data] API error ${resultCode}: ${payload?.response?.header?.resultMsg}`);
        break;
      }
      const items = payload?.response?.body?.items?.item;
      if (!items) break;
      const arr = Array.isArray(items) ? items : [items];
      collected.push(...arr);
      // 다 받았는지 확인 — totalCount 또는 받은 개수
      const totalCount = Number(payload?.response?.body?.totalCount ?? 0);
      if (collected.length >= totalCount || arr.length < PAGE_SIZE) break;
    } catch (err) {
      console.error(`[etf-live-data] fetch failed on page ${pageNo}:`, err);
      break;
    }
  }
  return collected;
}

function readField(row: PublicEtfPriceRow, key: string) {
  const value = row[key];
  if (value == null) return '';
  return String(value);
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, '').padStart(6, '0');
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWon(value: string) {
  const amount = parseNumber(value);
  if (!amount) return '';
  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return '';
  if (value > 0) return `+${value.toFixed(2)}%`;
  if (value < 0) return `${value.toFixed(2)}%`;
  return '0.00%';
}

function formatShares(value: string) {
  const amount = parseNumber(value);
  if (!amount) return '';
  if (amount >= 10000) return `${Math.round(amount / 1000) / 10}만주`;
  return `${amount.toLocaleString('ko-KR')}주`;
}

function formatLargeWon(value: string) {
  const amount = parseNumber(value);
  if (!amount) return '';
  const trillion = 1_000_000_000_000;
  const hundredMillion = 100_000_000;

  if (amount >= trillion) {
    const trillionPart = Math.floor(amount / trillion);
    const hundredMillionPart = Math.round((amount % trillion) / hundredMillion);
    return hundredMillionPart > 0
      ? `${trillionPart}조 ${hundredMillionPart.toLocaleString('ko-KR')}억`
      : `${trillionPart}조`;
  }

  if (amount >= hundredMillion) {
    return `${Math.round(amount / hundredMillion).toLocaleString('ko-KR')}억`;
  }

  return `${amount.toLocaleString('ko-KR')}원`;
}

function formatBaseDate(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
}
