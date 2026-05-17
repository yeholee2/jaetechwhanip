import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { LegalLayout } from '../LegalLayout';

export const metadata: Metadata = {
  title: '환불 정책',
  description: '재프콘 멤버십 환불 정책',
  alternates: { canonical: '/legal/refund' },
};

export default function RefundPage() {
  return (
    <AppShell active="my" hideSlogan>
      <LegalLayout title="환불 정책" updatedAt="2026-05-17">
        <h2>1. 베타 기간 안내</h2>
        <p>현재 멤버십 결제는 베타 기간 동안 <strong>무료 등록</strong> 으로 처리되며, 실제 금액이 청구되지 않습니다. 정식 결제 시스템 연결 이전에 등록된 멤버십은 별도의 환불 절차가 필요하지 않습니다.</p>

        <h2>2. 정식 결제 시 환불 원칙</h2>
        <p>결제일로부터 7일 이내, 결제한 콘텐츠를 1건 이상 열람하지 않은 경우 전액 환불됩니다.</p>

        <h2>3. 환불 불가 사유</h2>
        <ul>
          <li>결제 후 7일이 경과한 경우</li>
          <li>멤버 전용 콘텐츠를 1건 이상 열람한 경우</li>
          <li>이미 다음 결제 주기가 시작된 경우 (당월/당년 분)</li>
        </ul>

        <h2>4. 부분 환불</h2>
        <p>연간 구독권의 경우, 환불 가능 기간 내 사용한 일수에 비례한 금액을 차감한 후 환불됩니다.</p>
        <p className="ex">예시: 연간 169,830원 결제 → 3일 후 환불 신청 → 169,830 − (169,830 × 3/365) ≈ 168,434원 환불</p>

        <h2>5. 자동 갱신 해지</h2>
        <p>멤버십은 자동 갱신됩니다. 마이페이지 → 구독 관리에서 언제든 자동 갱신을 해지할 수 있으며, 해지 즉시 다음 갱신부터 청구가 중지됩니다. 이미 결제된 기간은 만료일까지 정상 이용 가능합니다.</p>

        <h2>6. 크리에이터 정산 환수</h2>
        <p>회원의 환불이 발생한 경우, 해당 크리에이터의 정산 금액에서 환불 금액을 차감합니다.</p>

        <h2>7. 환불 신청 방법</h2>
        <p>마이페이지 → 구독 관리 → 환불 신청 또는 support@hannipmoney.com 으로 다음 정보와 함께 요청해 주세요:</p>
        <ul>
          <li>구독 채널명</li>
          <li>결제일</li>
          <li>환불 사유</li>
        </ul>
        <p>영업일 기준 3-5일 이내 처리됩니다.</p>

        <h2>8. 환불 불가 분쟁</h2>
        <p>환불 정책에 대한 분쟁은 한국 소비자분쟁해결기준에 따라 해결됩니다.</p>

        <p className="legalContact">문의: support@hannipmoney.com</p>
      </LegalLayout>
    </AppShell>
  );
}
