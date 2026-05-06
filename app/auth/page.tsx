import AuthClient from '@/components/AuthClient';

export const metadata = {
  title: '로그인',
  description: '카카오, 네이버, Google로 간편하게 시작하세요.',
};

export default function AuthPage() {
  return <AuthClient />;
}
