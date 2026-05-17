/**
 * 이메일 전송 — Resend REST API 직접 호출 (SDK 없음).
 *
 * 환경변수:
 *  - RESEND_API_KEY        : Resend API 키. 없으면 NOP (조용히 무시)
 *  - EMAIL_FROM            : 발신 주소 (기본 'noreply@jaetechwhanip.com')
 *  - EMAIL_REPLY_TO        : 회신 주소 (옵션)
 *  - NEXT_PUBLIC_SITE_URL  : 링크용 베이스 URL
 *
 * 모든 전송은 best-effort. 실패해도 콘솔에만 남기고 예외는 던지지 않음.
 */
import { SITE_URL, SITE_NAME } from '@/lib/seo';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tag?: string;
};

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email NOP]', args.subject, '→', args.to);
    }
    return { ok: false, error: 'RESEND_API_KEY not set' };
  }
  const from = process.env.EMAIL_FROM || `${SITE_NAME} <noreply@jaetechwhanip.com>`;
  const replyTo = args.replyTo || process.env.EMAIL_REPLY_TO;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
        reply_to: replyTo,
        tags: args.tag ? [{ name: 'kind', value: args.tag }] : undefined,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[email] resend error', res.status, body);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const json = await res.json().catch(() => ({}));
    return { ok: true, id: json?.id };
  } catch (e: any) {
    console.warn('[email] fetch failed', e?.message);
    return { ok: false, error: e?.message || 'network' };
  }
}

/* ----- 템플릿 ----- */

function shell(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#F2F4F6;font-family:'Pretendard',-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Segoe UI',sans-serif;color:#191F28;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#fff;border-radius:16px;padding:32px 28px;box-shadow:0 1px 3px rgba(0,27,55,0.06);">
      <div style="font-size:13px;font-weight:800;color:#3182F6;letter-spacing:-0.2px;margin-bottom:12px;">${SITE_NAME}</div>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;letter-spacing:-0.5px;line-height:1.35;color:#191F28;">${title}</h1>
      <div style="font-size:15px;line-height:1.7;color:#333D4B;">${body}</div>
      ${cta ? `<div style="margin-top:24px;"><a href="${cta.href}" style="display:inline-block;padding:12px 22px;background:#3182F6;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;font-size:14px;">${cta.label}</a></div>` : ''}
    </div>
    <div style="margin-top:20px;text-align:center;font-size:12px;color:#8B95A1;">
      © ${SITE_NAME} · <a href="${SITE_URL}" style="color:#8B95A1;text-decoration:underline;">${SITE_URL.replace(/^https?:\/\//, '')}</a>
    </div>
  </div>
</body>
</html>`;
}

export async function sendNewPostNotification(opts: {
  to: string[];
  creatorName: string;
  postTitle: string;
  postUrl: string;
  preview?: string;
}) {
  if (opts.to.length === 0) return;
  const body = `
    <p><strong>${escapeHtml(opts.creatorName)}</strong> 채널에 새 글이 올라왔어요.</p>
    <p style="font-size:17px;font-weight:800;color:#191F28;margin-top:18px;">${escapeHtml(opts.postTitle)}</p>
    ${opts.preview ? `<p style="margin-top:8px;color:#4E5968;">${escapeHtml(opts.preview.slice(0, 200))}…</p>` : ''}
  `;
  // Resend 한 번에 여러 수신자 OK — 단 BCC 가 아닌 to 배열은 서로 보임. 안전하게 한 명씩.
  await Promise.all(opts.to.map(addr =>
    sendEmail({
      to: addr,
      subject: `[${opts.creatorName}] ${opts.postTitle}`,
      html: shell('새 글이 올라왔어요', body, { label: '바로 읽기', href: opts.postUrl }),
      tag: 'new-post',
    }),
  ));
}

export async function sendWelcomeEmail(opts: { to: string; name?: string }) {
  const greeting = opts.name ? `${opts.name}님, 환영해요 👋` : '환영해요 👋';
  const body = `
    <p>${SITE_NAME} 가입해주셔서 감사해요.</p>
    <p style="margin-top:12px;">관심 있는 크리에이터를 팔로우하고, 멤버 전용 콘텐츠를 만나보세요.</p>
  `;
  await sendEmail({
    to: opts.to,
    subject: `${SITE_NAME} 가입을 환영해요`,
    html: shell(greeting, body, { label: '둘러보기', href: `${SITE_URL}/creators` }),
    tag: 'welcome',
  });
}

export async function sendPayoutApprovedEmail(opts: {
  to: string;
  creatorName: string;
  amountWon: number;
  periodLabel: string;
}) {
  const body = `
    <p><strong>${escapeHtml(opts.creatorName)}</strong> 채널의 ${opts.periodLabel} 정산이 승인됐어요.</p>
    <p style="margin-top:16px;font-size:24px;font-weight:900;color:#3182F6;">${opts.amountWon.toLocaleString()}원</p>
    <p style="margin-top:8px;color:#4E5968;font-size:13px;">등록하신 계좌로 영업일 기준 3일 내 입금될 예정이에요.</p>
  `;
  await sendEmail({
    to: opts.to,
    subject: `정산 승인 — ${opts.periodLabel}`,
    html: shell('정산이 승인됐어요', body, { label: '정산 내역 보기', href: `${SITE_URL}/creator/dashboard` }),
    tag: 'payout-approved',
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
