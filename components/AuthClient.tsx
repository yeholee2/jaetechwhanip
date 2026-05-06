'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import styles from './AuthClient.module.css';

type Provider = 'kakao' | 'naver' | 'google';

export default function AuthClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/';
  const errorParam = params.get('error');
  const [loading, setLoading] = useState<Provider | null>(null);
  const [err, setErr] = useState(errorParam ? '로그인에 실패했어요. 다시 시도해주세요.' : '');

  const handleLogin = async (provider: Provider) => {
    setLoading(provider);
    setErr('');

    if (!hasSupabase()) {
      setErr('서비스 설정 중입니다. 잠시 후 다시 시도해주세요.');
      setLoading(null);
      return;
    }

    // 카카오는 비즈 인증 필요로 임시 비활성화
    if (provider === 'kakao') {
      setErr('카카오 로그인은 준비 중이에요. Google이나 네이버로 로그인해주세요.');
      setLoading(null);
      return;
    }

    // 네이버는 Custom OAuth 라우트로 이동
    if (provider === 'naver') {
      window.location.href = `/api/auth/naver?next=${encodeURIComponent(next)}`;
      return;
    }

    // Google은 Supabase 기본 OAuth
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
    } catch (e: any) {
      setErr(e.message || '로그인 실패');
      setLoading(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={`${styles.wordmark} logo-font`}>재테크<em>한입</em></div>
        <div className={styles.tagline}>궁금할 땐,<br/><em>재테크한입</em></div>

        <button className={`${styles.sbtn} ${styles.kakao}`} onClick={() => handleLogin('kakao')} disabled={!!loading} style={{opacity: 0.5}}>
          {loading === 'kakao' ? <span className={styles.spin}/> : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2C5.582 2 2 4.805 2 8.25c0 2.21 1.46 4.153 3.666 5.272l-.933 3.477a.25.25 0 0 0 .374.273L9.32 14.8c.224.018.45.027.68.027 4.418 0 8-2.805 8-6.25C18 4.805 14.418 2 10 2Z" fill="#191919"/>
            </svg>
          )}
          카카오 (준비 중)
        </button>

        <button className={`${styles.sbtn} ${styles.naver}`} onClick={() => handleLogin('naver')} disabled={!!loading}>
          {loading === 'naver' ? <span className={styles.spin}/> : (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M10.23 9.18 7.5 5H5v8h2.77V8.82L10.5 13H13V5h-2.77v4.18Z" fill="white"/>
            </svg>
          )}
          네이버로 시작하기
        </button>

        <div className={styles.divider}><span>또는</span></div>

        <button className={`${styles.sbtn} ${styles.google}`} onClick={() => handleLogin('google')} disabled={!!loading}>
          {loading === 'google' ? <span className={styles.spinDark}/> : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
          )}
          Google로 시작하기
        </button>

        {err && <div className={styles.err}>{err}</div>}

        <div className={styles.footer}>
          <a href="/" onClick={(e)=>{e.preventDefault();router.push('/');}}>← 둘러보기</a>
          <a href="#">이용약관</a>
          <a href="#">개인정보처리방침</a>
        </div>
      </div>
    </div>
  );
}
