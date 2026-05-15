import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * robots.txt
 *
 * - 일반 검색 봇(*) 전체 허용
 * - LLM 봇(GPTBot, ClaudeBot, PerplexityBot, Google-Extended 등) 명시 허용
 *   → GEO(생성형 엔진 최적화)에서 인용 후보로 우대받음
 * - /api, /auth, /admin, /mypage 는 모두 차단 (인덱스 노이즈 방지)
 */
export default function robots(): MetadataRoute.Robots {
  const disallowPrivate = ['/api/', '/auth', '/admin', '/mypage'];

  return {
    rules: [
      // 일반 검색 봇 (Googlebot, Bingbot, Naver Yeti 등 포함)
      { userAgent: '*', allow: '/', disallow: disallowPrivate },

      // 생성형 AI / LLM 봇 — Q&A 콘텐츠를 인용·학습 가능하도록 명시 허용
      { userAgent: 'GPTBot', allow: '/', disallow: disallowPrivate },           // OpenAI
      { userAgent: 'ChatGPT-User', allow: '/', disallow: disallowPrivate },     // ChatGPT 실시간 fetch
      { userAgent: 'OAI-SearchBot', allow: '/', disallow: disallowPrivate },    // OpenAI 검색
      { userAgent: 'ClaudeBot', allow: '/', disallow: disallowPrivate },        // Anthropic
      { userAgent: 'Claude-Web', allow: '/', disallow: disallowPrivate },       // Claude 실시간 fetch
      { userAgent: 'PerplexityBot', allow: '/', disallow: disallowPrivate },    // Perplexity
      { userAgent: 'Google-Extended', allow: '/', disallow: disallowPrivate },  // Gemini 학습
      { userAgent: 'CCBot', allow: '/', disallow: disallowPrivate },            // Common Crawl
      { userAgent: 'cohere-ai', allow: '/', disallow: disallowPrivate },        // Cohere
      { userAgent: 'YouBot', allow: '/', disallow: disallowPrivate },           // You.com
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
