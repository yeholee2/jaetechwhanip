import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { LegalLayout } from '../LegalLayout';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: '재테크한입 개인정보처리방침',
  alternates: { canonical: '/legal/privacy' },
};

export default function PrivacyPage() {
  return (
    <AppShell active="my" hideSlogan>
      <LegalLayout title="개인정보처리방침" updatedAt="2026-05-17">
        <p>재테크한입(이하 "회사")은 회원의 개인정보를 소중히 다루며, 다음과 같이 처리합니다.</p>

        <h2>1. 수집하는 개인정보</h2>
        <ul>
          <li><strong>필수:</strong> 이메일, 닉네임 (OAuth Provider 제공)</li>
          <li><strong>선택:</strong> 프로필 사진, 자기소개, 토픽 관심사</li>
          <li><strong>자동 수집:</strong> 접속 IP, 쿠키, 서비스 이용 기록</li>
        </ul>

        <h2>2. 수집 목적</h2>
        <ul>
          <li>회원 식별 및 본인 확인</li>
          <li>맞춤 콘텐츠 추천 및 알림 발송</li>
          <li>멤버십 구독·결제·정산 처리</li>
          <li>고객 문의 응답 및 서비스 개선</li>
        </ul>

        <h2>3. 보유 및 이용 기간</h2>
        <p>회원 탈퇴 시까지 보유하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 보관 후 즉시 파기합니다.</p>

        <h2>4. 제3자 제공</h2>
        <p>회사는 회원의 개인정보를 외부에 제공하지 않습니다. 단, 법령에 따라 요구되는 경우는 예외로 합니다.</p>

        <h2>5. 처리 위탁</h2>
        <ul>
          <li><strong>Supabase</strong>: 데이터베이스·인증 (미국)</li>
          <li><strong>Vercel</strong>: 호스팅 (미국)</li>
          <li><strong>Cloudflare</strong>: DNS·CDN (글로벌)</li>
          <li><strong>Anthropic</strong>: AI 콘텐츠 생성 (미국, 입력 데이터만 일시 전달)</li>
        </ul>

        <h2>6. 회원의 권리</h2>
        <p>회원은 언제든지 자신의 개인정보를 조회·수정·삭제할 수 있으며, 마이페이지에서 직접 수정하거나 support@hannipmoney.com 으로 요청할 수 있습니다.</p>

        <h2>7. 쿠키</h2>
        <p>회사는 서비스 제공을 위해 쿠키를 사용합니다. 회원은 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.</p>

        <h2>8. 책임자</h2>
        <p>개인정보보호 책임자: 이예호 (support@hannipmoney.com)</p>
      </LegalLayout>
    </AppShell>
  );
}
