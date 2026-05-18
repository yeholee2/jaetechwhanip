'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, MessageCircle, ThumbsUp, TrendingUp, BarChart3, Bell, Plus } from 'lucide-react';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/ui';
import { listMyHoldings, buildHoldingDisplays, summarizePortfolio } from '@/lib/etfPortfolio';
import { fetchEtfLivePrices, buildLivePriceMap } from '@/lib/etfLivePrices';
import { listMyNotifications, type UserNotification } from '@/lib/alerts';
import { ImageUploader } from '@/components/creator/ImageUploader';
import styles from './MyPage.module.css';

const EMOJI = ['🐯','🐰','🦊','🐻','🦋','🐸','🐼','🦁','🐨','🐮','🐷','🐙'];
const EMOJI_PALETTE = [
  '🐯','🐰','🦊','🐻','🦋','🐸','🐼','🦁','🐨','🐮','🐷','🐙',
  '🐧','🦉','🐢','🐳','🦄','🐝','🐞','🐳','🐊','🦖','🐬','🦦',
  '🌱','🌸','🌻','🍀','🍎','🍑','🍓','🥑','🍔','🍕','🍩','🍰',
  '⚽','🎾','🎯','🎨','🎮','🎸','🎺','🚀','✨','⭐','🌈','🌙',
];
function hashEmoji(key?: string | null): string {
  if (!key) return EMOJI[0];
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return EMOJI[Math.abs(h) % EMOJI.length];
}

function ft(d?: string | null) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function fmtJoin(d?: string | null) {
  if (!d) return '';
  const date = new Date(d);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} 가입`;
}

function parsePriceNumber(value?: string | null): number | null {
  const m = value?.match(/[\d,]+/);
  if (!m) return null;
  const price = parseInt(m[0].replace(/,/g, ''), 10);
  return Number.isFinite(price) ? price : null;
}

type Tab = 'questions' | 'answers' | 'bookmarks' | 'notifications';

export default function MyPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState<{ count: number; total_market_value: number; total_pnl: number; total_pnl_pct: number; has_unknown_price: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>('questions');
  const [editOpen, setEditOpen] = useState(false);
  const [editEmoji, setEditEmoji] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editBio, setEditBio] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!hasSupabase()) {
      setLoading(false);
      return;
    }
    const supabase = createClient();

    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) {
        router.replace('/auth?next=/mypage');
        return;
      }
      setUser(u);

      // 프로필
      const { data: p } = await supabase.from('users').select('*').eq('id', u.id).maybeSingle();
      setProfile(p);

      // 병렬 fetch
      const [qRes, aRes, bRes, nList, holdings, priceRes] = await Promise.all([
        supabase.from('questions')
          .select('id, title, slug, category, answer_count, like_count, is_answered, created_at')
          .eq('author_id', u.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('answers')
          .select('id, body, is_adopted, like_count, created_at, question_id, questions:question_id(title, slug)')
          .eq('author_id', u.id)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('bookmarks')
          .select('question_id, created_at, questions:question_id(id, title, slug, category, answer_count, is_answered)')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(30),
        listMyNotifications(20),
        listMyHoldings().catch(() => []),
        fetchEtfLivePrices().catch(() => null),
      ]);

      setQuestions(qRes.data || []);
      setAnswers(aRes.data || []);
      setBookmarks(bRes.data || []);
      setNotifications(nList || []);

      // 포트폴리오 요약
      if (holdings.length > 0) {
        const priceMap: Record<string, number> = {};
        const liveMap = priceRes?.items ? buildLivePriceMap(priceRes.items) : {};
        Object.values(liveMap).forEach(e => {
          const price = parsePriceNumber(e.price);
          if (price != null) priceMap[e.code] = price;
        });
        const displays = buildHoldingDisplays(holdings, priceMap);
        const sum = summarizePortfolio(displays);
        setPortfolioSummary(sum);
      } else {
        setPortfolioSummary({ count: 0, total_market_value: 0, total_pnl: 0, total_pnl_pct: 0, has_unknown_price: false });
      }

      setLoading(false);
    })();
  }, [router]);

  // 통계
  const stats = useMemo(() => {
    const adopted = answers.filter(a => a.is_adopted).length;
    const totalLikes = answers.reduce((s, a) => s + (a.like_count || 0), 0);
    return {
      questions: questions.length,
      answers: answers.length,
      adopted,
      adoptedRate: answers.length > 0 ? Math.round((adopted / answers.length) * 100) : 0,
      totalLikes,
    };
  }, [questions, answers]);

  const name = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || '익명';
  const avatarEmoji = profile?.avatar_url && profile.avatar_url.length <= 4
    ? profile.avatar_url
    : hashEmoji(user?.id || name);
  const joinedAt = profile?.created_at || user?.created_at;

  if (loading) {
    return (
      <AppShell active="my">
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </AppShell>
    );
  }

  if (!user) return null;

  return (
    <AppShell active="my" hideSlogan>
      <main className={styles.page}>
        {/* 헤더 */}
        <header className={styles.header}>
          <button
            type="button"
            onClick={() => {
              setEditEmoji(avatarEmoji);
              setEditName(name);
              setEditBio(profile?.bio || '');
              setEditOpen(true);
            }}
            className={`${styles.avatar} tf`}
            title="프로필 수정"
            aria-label="프로필 수정"
          >
            {avatarEmoji}
            <span className={styles.avatarEditHint}>✏️</span>
          </button>
          <div className={styles.headerBody}>
            <h1 className={styles.name}>{name}</h1>
            <div className={styles.joinedAt}>{fmtJoin(joinedAt)}</div>
            {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
          </div>
          <div className={styles.headerActions}>
            <button type="button" onClick={() => {
              setEditEmoji(avatarEmoji);
              setEditName(name);
              setEditBio(profile?.bio || '');
              setEditOpen(true);
            }} className={styles.editBtn}>프로필 수정</button>
            <Link href={`/u/${user.id}`} className={styles.profileLink}>공개 프로필 →</Link>
          </div>
        </header>

        {/* 프로필 수정 모달 */}
        {editOpen && (
          <div className={styles.modalBackdrop} onClick={() => !savingProfile && setEditOpen(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <header className={styles.modalHead}>
                <h2>프로필 수정</h2>
                <button type="button" onClick={() => setEditOpen(false)} className={styles.modalClose} aria-label="닫기">✕</button>
              </header>

              <div className={styles.editSection}>
                <div className={styles.editLabel}>프로필 사진</div>
                <ImageUploader
                  value={/^https?:\/\//.test(editEmoji) ? editEmoji : ''}
                  onChange={url => setEditEmoji(url)}
                  scope="user-avatar"
                  shape="circle"
                />
              </div>

              <div className={styles.editSection}>
                <div className={styles.editLabel}>또는 이모지로 (사진 없을 때)</div>
                <div className={styles.editEmojiPreview}>
                  <span className={`${styles.editEmojiBig} tf`}>{/^https?:\/\//.test(editEmoji) ? '🖼' : editEmoji}</span>
                </div>
                <div className={styles.emojiGrid}>
                  {EMOJI_PALETTE.map(e => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => setEditEmoji(e)}
                      className={`${styles.emojiBtn} tf ${editEmoji === e ? styles.emojiBtnOn : ''}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.editSection}>
                <label className={styles.editLabel} htmlFor="profile-name">닉네임</label>
                <input
                  id="profile-name"
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  maxLength={20}
                  className={styles.editInput}
                  placeholder="2~20자"
                />
              </div>

              <div className={styles.editSection}>
                <label className={styles.editLabel} htmlFor="profile-bio">한 줄 소개 (선택)</label>
                <input
                  id="profile-bio"
                  type="text"
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  maxLength={80}
                  className={styles.editInput}
                  placeholder="예: 30대 직장인, ETF로 적립식 투자 중"
                />
              </div>

              <div className={styles.modalFoot}>
                <button type="button" onClick={() => setEditOpen(false)} className={styles.modalBack} disabled={savingProfile}>취소</button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!hasSupabase()) return;
                    setSavingProfile(true);
                    const supabase = createClient();
                    const trimmedName = editName.trim() || name;
                    const trimmedBio = editBio.trim();
                    const { error } = await supabase
                      .from('users')
                      .update({ avatar_url: editEmoji, name: trimmedName, bio: trimmedBio || null })
                      .eq('id', user.id);
                    setSavingProfile(false);
                    if (error) {
                      alert('저장 실패: ' + error.message);
                      return;
                    }
                    setProfile((p: any) => ({ ...(p || {}), avatar_url: editEmoji, name: trimmedName, bio: trimmedBio || null }));
                    // AppShell 헤더 아바타·이름 즉시 갱신
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('profile-updated', {
                        detail: { avatar_url: editEmoji, name: trimmedName },
                      }));
                    }
                    setEditOpen(false);
                  }}
                  className={styles.modalSave}
                  disabled={savingProfile || !editEmoji || !editName.trim()}
                >
                  {savingProfile ? '저장 중…' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <section className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>질문</div>
            <div className={styles.statValue}>{stats.questions}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>답변</div>
            <div className={styles.statValue}>{stats.answers}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>채택</div>
            <div className={styles.statValue}>{stats.adopted}</div>
            <div className={styles.statDelta}>채택률 {stats.adoptedRate}%</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>받은 추천</div>
            <div className={styles.statValue}>{stats.totalLikes}</div>
          </div>
        </section>

        {/* 빠른 액션 */}
        <section className={styles.quickActions}>
          <Link href="/questions/create" className={styles.actionBtn}>
            <Plus size={16} /> 질문하기
          </Link>
          <Link href="/portfolio?tab=build" className={styles.actionBtn}>
            <BarChart3 size={16} /> 포트폴리오 진단
          </Link>
          <Link href="/etf/all" className={styles.actionBtn}>
            <TrendingUp size={16} /> 전체 ETF 검색
          </Link>
        </section>

        {/* 포트폴리오 요약 위젯 */}
        <Link href="/portfolio?tab=build" className={styles.portfolioCard}>
          <div className={styles.portfolioHead}>
            <div>
              <span className={styles.portfolioEyebrow}>내 포트폴리오</span>
              <h2 className={styles.portfolioTitle}>
                {portfolioSummary && portfolioSummary.count > 0
                  ? `${portfolioSummary.count}개 ETF 보유 중`
                  : '아직 포트폴리오가 비어있어요'}
              </h2>
            </div>
            <span className={styles.portfolioArrow}>→</span>
          </div>
          {portfolioSummary && portfolioSummary.count > 0 ? (
            <div className={styles.portfolioStats}>
              <div>
                <div className={styles.portfolioLabel}>평가금액</div>
                <div className={styles.portfolioValue}>
                  {portfolioSummary.total_market_value.toLocaleString('ko-KR')}원
                  {portfolioSummary.has_unknown_price && <span className={styles.portfolioHint}> (일부 추정)</span>}
                </div>
              </div>
              <div>
                <div className={styles.portfolioLabel}>평가손익</div>
                <div className={`${styles.portfolioValue} ${portfolioSummary.total_pnl >= 0 ? styles.up : styles.down}`}>
                  {portfolioSummary.total_pnl >= 0 ? '+' : ''}{portfolioSummary.total_pnl.toLocaleString('ko-KR')}원
                  <span className={styles.portfolioPct}>
                    ({portfolioSummary.total_pnl_pct >= 0 ? '+' : ''}{(portfolioSummary.total_pnl_pct * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.portfolioEmpty}>
              보유 ETF를 입력하면 자산 분포·예상 손익을 자동으로 분석해드려요.
            </p>
          )}
        </Link>

        {/* 탭 */}
        <div className={styles.tabs} role="tablist">
          {([
            { key: 'questions', label: `질문 ${stats.questions}` },
            { key: 'answers', label: `답변 ${stats.answers}` },
            { key: 'bookmarks', label: `북마크 ${bookmarks.length}` },
            { key: 'notifications', label: `알림 ${notifications.filter(n => !n.read_at).length}` },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 탭 콘텐츠 */}
        <div className={styles.tabContent}>
          {tab === 'questions' && (
            questions.length === 0 ? <Empty msg="아직 작성한 질문이 없어요" /> :
            questions.map(q => (
              <Link key={q.id} href={`/q/${q.slug || q.id}`} className={styles.item}>
                <div className={styles.itemBadges}>
                  <Badge tone="neutral">{q.category}</Badge>
                  {q.is_answered && <Badge tone="success">✅ 채택됨</Badge>}
                </div>
                <p className={styles.itemTitle}>{q.title}</p>
                <div className={styles.itemMeta}>
                  <span><MessageCircle size={12} />{q.answer_count || 0}개 답변</span>
                  <span>·</span>
                  <span><ThumbsUp size={12} />{q.like_count || 0}</span>
                  <span>·</span>
                  <span>{ft(q.created_at)}</span>
                </div>
              </Link>
            ))
          )}

          {tab === 'answers' && (
            answers.length === 0 ? <Empty msg="아직 작성한 답변이 없어요" /> :
            answers.map(a => {
              const qPath = (a.questions as any)?.slug || a.question_id;
              const qTitle = (a.questions as any)?.title || '질문';
              return (
                <Link key={a.id} href={`/q/${qPath}`} className={styles.item}>
                  {a.is_adopted && <p className={styles.adoptedHint}>✅ 채택된 답변</p>}
                  <p className={styles.itemAnswerCue}>→ {qTitle}</p>
                  <p className={styles.itemAnswerBody}>{a.body}</p>
                  <div className={styles.itemMeta}>
                    <span><ThumbsUp size={12} />{a.like_count || 0}</span>
                    <span>·</span>
                    <span>{ft(a.created_at)}</span>
                  </div>
                </Link>
              );
            })
          )}

          {tab === 'bookmarks' && (
            bookmarks.length === 0 ? <Empty msg="저장한 질문이 없어요" /> :
            bookmarks.map(b => {
              const q = (b.questions as any) || {};
              return (
                <Link key={b.question_id} href={`/q/${q.slug || b.question_id}`} className={styles.item}>
                  <div className={styles.itemBadges}>
                    {q.category && <Badge tone="neutral">{q.category}</Badge>}
                    {q.is_answered && <Badge tone="success">✅ 채택됨</Badge>}
                    <Bookmark size={12} style={{ marginLeft: 'auto', color: 'var(--rw-primary)' }} />
                  </div>
                  <p className={styles.itemTitle}>{q.title || '(삭제됨)'}</p>
                  <div className={styles.itemMeta}>
                    <span><MessageCircle size={12} />{q.answer_count || 0}개 답변</span>
                    <span>·</span>
                    <span>저장 {ft(b.created_at)}</span>
                  </div>
                </Link>
              );
            })
          )}

          {tab === 'notifications' && (
            notifications.length === 0 ? <Empty msg="아직 알림이 없어요" /> :
            notifications.map(n => {
              const Content = (
                <div className={`${styles.item} ${!n.read_at ? styles.itemUnread : ''}`}>
                  <div className={styles.itemBadges}>
                    <Bell size={12} />
                    <strong style={{ fontSize: 13 }}>{n.title}</strong>
                  </div>
                  {n.body && <p className={styles.itemAnswerBody}>{n.body}</p>}
                  <div className={styles.itemMeta}>
                    <span>{ft(n.created_at)}</span>
                  </div>
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {Content}
                </Link>
              ) : (
                <div key={n.id}>{Content}</div>
              );
            })
          )}
        </div>
      </main>
    </AppShell>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyEmoji}>📭</div>
      <p className={styles.emptyMsg}>{msg}</p>
    </div>
  );
}
