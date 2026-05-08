import type { Metadata } from 'next';
import SparringClient from './SparringClient';

export const metadata: Metadata = {
  title: '머니 스파링',
  description: '재테크 선택지를 찬반으로 쪼개 보고, 내 판단의 약점을 점검하는 금융 의사결정 훈련장입니다.',
  alternates: {
    canonical: '/sparring',
  },
  openGraph: {
    title: '머니 스파링 | 재테크한입',
    description: '투자, 저축, 보험, 대출 결정을 찬반으로 점검해 보세요.',
    url: '/sparring',
    type: 'website',
  },
};

export default function SparringPage() {
  return <SparringClient />;
}
