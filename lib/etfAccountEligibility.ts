import type { EtfInfo } from '@/lib/etfs';
import { isKrEtfCode } from '@/lib/etfCodes';

export type EtfAccountEligibilityStatus = 'available' | 'limited' | 'unavailable' | 'check';

export type EtfAccountEligibilityItem = {
  key: 'personalPension' | 'retirementPension' | 'isa';
  label: string;
  value: string;
  status: EtfAccountEligibilityStatus;
};

function probeText(etf: Partial<EtfInfo>) {
  return [
    etf.name,
    etf.shortName,
    etf.category,
    etf.theme,
    etf.trackingIndex,
    ...(etf.tags || []),
  ].filter(Boolean).join(' ');
}

function isDomesticListedEtf(etf: Partial<EtfInfo>) {
  const market = (etf.market || 'KRX').toUpperCase();
  const country = (etf.country || 'KR').toUpperCase();
  const currency = (etf.currency || 'KRW').toUpperCase();
  return isKrEtfCode(etf.code) && market === 'KRX' && country === 'KR' && currency === 'KRW';
}

export function getEtfAccountEligibility(etf: Partial<EtfInfo>): EtfAccountEligibilityItem[] {
  const text = probeText(etf);
  const domesticListed = isDomesticListedEtf(etf);
  const leverageOrInverse = /레버리지|인버스|곱버스|2X|3X|2배|3배|Inverse/i.test(text);
  const futuresBased = /선물|futures|WTI|원유|천연가스|달러선물|국채선물|금선물|은선물|구리선물|농산물|탄소배출권/i.test(text);
  const retirementSafeAsset = /채권|국채|회사채|단기채|통안채|금리|CD금리|KOFR|SOFR|머니마켓|MMF|TDF|TRF|채권혼합/i.test(text);

  if (!domesticListed) {
    return [
      { key: 'personalPension', label: '개인연금', value: '불가', status: 'unavailable' },
      { key: 'retirementPension', label: '퇴직연금', value: '불가', status: 'unavailable' },
      { key: 'isa', label: 'ISA', value: '불가', status: 'unavailable' },
    ];
  }

  return [
    {
      key: 'personalPension',
      label: '개인연금',
      value: leverageOrInverse ? '불가' : '가능',
      status: leverageOrInverse ? 'unavailable' : 'available',
    },
    {
      key: 'retirementPension',
      label: '퇴직연금',
      value: leverageOrInverse || futuresBased ? '불가' : retirementSafeAsset ? '100%' : '70%',
      status: leverageOrInverse || futuresBased ? 'unavailable' : retirementSafeAsset ? 'available' : 'limited',
    },
    {
      key: 'isa',
      label: 'ISA',
      value: '가능',
      status: 'available',
    },
  ];
}
