import { etfs, type EtfInfo } from '@/lib/etfs';

type PublicEtfPriceRow = Record<string, string | number | null | undefined>;

export type EtfDataSource = 'public-api' | 'fallback';

export type EtfInfoWithMarketData = EtfInfo & {
  dataSource: EtfDataSource;
  baseDate?: string;
  nav?: string;
  tradeValue?: string;
  dataNotice: string;
};

const FSC_ETF_PRICE_ENDPOINT =
  'https://apis.data.go.kr/1160100/service/GetSecuritiesProductInfoService/getETFPriceInfo';

export async function getEtfsWithMarketData(): Promise<EtfInfoWithMarketData[]> {
  const publicRows = await fetchPublicEtfPriceRows();
  if (publicRows.length === 0) {
    return etfs.map(etf => ({
      ...etf,
      dataSource: 'fallback',
      dataNotice: '공식 API 키 등록 전 예시 데이터',
    }));
  }

  return etfs.map(etf => {
    const row = publicRows.find(item => normalizeCode(readField(item, 'srtnCd')) === etf.code);
    if (!row) {
      return {
        ...etf,
        dataSource: 'fallback',
        dataNotice: '공식 API에 없는 항목은 예시 데이터',
      };
    }

    const changeRate = parseNumber(readField(row, 'fltRt'));

    return {
      ...etf,
      price: formatWon(readField(row, 'clpr')) || etf.price,
      change: formatRate(changeRate) || etf.change,
      changeTone: changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : 'flat',
      volume: formatShares(readField(row, 'trqu')) || etf.volume,
      aum: formatLargeWon(readField(row, 'mrktTotAmt')) || etf.aum,
      nav: formatWon(readField(row, 'nav')),
      tradeValue: formatLargeWon(readField(row, 'trPrc')),
      baseDate: formatBaseDate(readField(row, 'basDt')),
      dataSource: 'public-api',
      dataNotice: '금융위원회 증권상품시세정보 기준',
    };
  });
}

async function fetchPublicEtfPriceRows(): Promise<PublicEtfPriceRow[]> {
  const serviceKey =
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.PUBLIC_DATA_SERVICE_KEY ||
    process.env.FSC_SECURITIES_API_KEY;

  if (!serviceKey) return [];

  try {
    const params = new URLSearchParams({
      pageNo: '1',
      numOfRows: '1000',
      resultType: 'json',
    });
    const encodedServiceKey = serviceKey.includes('%') ? serviceKey : encodeURIComponent(serviceKey);
    const url = `${FSC_ETF_PRICE_ENDPOINT}?serviceKey=${encodedServiceKey}&${params.toString()}`;

    const response = await fetch(url, { next: { revalidate: 300 } });
    if (!response.ok) return [];

    const payload = await response.json();
    const item = payload?.response?.body?.items?.item;
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  } catch {
    return [];
  }
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
