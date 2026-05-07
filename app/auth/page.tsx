import { Suspense } from 'react';
import AuthClient from '@/components/AuthClient';

export const metadata = {
  title: '로그인',
  description: 'Google 또는 카카오로 간편하게 재테크한입을 시작하세요.',
};

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1a2e'}}>
        <div style={{width:40,height:40,border:'3px solid rgba(255,255,255,.2)',borderTopColor:'white',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
      </div>
    }>
      <AuthClient />
    </Suspense>
  );
}
