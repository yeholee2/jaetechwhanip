'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Bookmark, ChevronLeft, MessageCircle, PenLine, ThumbsUp, UserPlus } from 'lucide-react';
import { currentUserBookmarks, localBookmarks, type BookmarkItem } from '@/lib/bookmarks';
import { currentUserFollows, localFollows } from '@/lib/follows';
import { createClient, hasSupabase } from '@/lib/supabase/client';
import { sampleQuestions } from '@/lib/sampleData';
import styles from './ProfilePage.module.css';

type ProfileTab = 'questions' | 'answers' | 'bookmarks' | 'follows' | 'activity';

const TABS: Array<{ key: ProfileTab; label: string }> = [
  { key: 'questions', label: '내 질문' },
  { key: 'answers', label: '내 답변' },
  { key: 'bookmarks', label: '저장한 글' },
  { key: 'follows', label: '팔로우' },
  { key: 'activity', label: '활동' },
];

function ft(d: string) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function ProfileClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [follows, setFollows] = useState<any[]>([]);
  const [tab, setTab] = useState<ProfileTab>('questions');
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOut] = useState(false);
  const [isMe, setIsMe] = useState(false);

  useEffect(() => {
    async function load() {
      if (!hasSupabase()) {
        const demoQuestions = sampleQuestions.slice(0, 4).map(item => ({
          id: item.slug,
          title: item.title,
          slug: item.slug,
          category: item.cat,
          answer_count: item.ans,
          is_answered: item.adopted,
          created_at: item.createdAt,
        }));
        setProfile({ name: '한입회원', avatar_url: null, created_at: new Date(Date.now() - 30 * 86400000).toISOString() });
        setQuestions(demoQuestions);
        setAnswers([]);
        setBookmarks(localBookmarks());
        setFollows(localFollows());
        setIsMe(true);
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const currentUser = auth.user;

      if (!currentUser) {
        setLoggedOut(true);
        setLoading(false);
        return;
      }

      const targetId = userId === 'me' ? currentUser.id : userId;
      const ownsProfile = currentUser.id === targetId;
      setIsMe(ownsProfile);

      const [profileRes, questionsRes, answersRes, saved, following] = await Promise.all([
        supabase.from('users').select('*').eq('id', targetId).maybeSingle(),
        supabase.from('questions')
          .select('id, title, slug, category, answer_count, is_answered, created_at')
          .eq('author_id', targetId)
          .order('created_at', { ascending: false })
          .limit(40),
        supabase.from('answers')
          .select('id, body, is_adopted, like_count, created_at, question_id, questions:question_id(id, title, slug)')
          .eq('author_id', targetId)
          .order('created_at', { ascending: false })
          .limit(40),
        currentUserBookmarks(),
        currentUserFollows(),
      ]);

      setProfile(profileRes.data || { name: currentUser.email?.split('@')[0] || '한입회원', avatar_url: null, created_at: currentUser.created_at });
      setQuestions(questionsRes.data || []);
      setAnswers(answersRes.data || []);
      setBookmarks(ownsProfile ? saved : []);
      setFollows(ownsProfile ? following : []);
      setLoading(false);
    }

    load();
  }, [userId]);

  const activity = useMemo(() => [
    ...questions.slice(0, 8).map(item => ({ type: '질문', title: item.title, href: `/q/${item.slug || item.id}`, created_at: item.created_at })),
    ...answers.slice(0, 8).map(item => ({ type: '답변', title: item.questions?.title || '질문에 답변', href: `/q/${item.questions?.slug || item.questions?.id || item.question_id}`, created_at: item.created_at })),
    ...bookmarks.slice(0, 8).map(item => ({ type: '저장', title: item.title, href: item.href, created_at: item.created_at })),
    ...follows.slice(0, 8).map(item => ({ type: '팔로우', title: item.title || item.target_id, href: item.target_type === 'topic' ? `/topics/${encodeURIComponent(item.target_id)}` : `/u/${item.target_id}`, created_at: item.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20), [answers, bookmarks, follows, questions]);

  if (loading) {
    return <div className={styles.page}><Empty title="불러오는 중" body="활동을 모으고 있어요." /></div>;
  }

  if (loggedOut) {
    return (
      <div className={styles.page}>
        <button className={styles.back} type="button" onClick={() => router.back()}><ChevronLeft size={17} /> 뒤로</button>
        <Empty
          title="로그인이 필요해요"
          body="내 질문, 저장한 글, 팔로우한 토픽을 보려면 로그인해 주세요."
          cta={<Link className={styles.loginCta} href={`/auth?next=/u/${encodeURIComponent(userId)}`}>로그인하고 보기</Link>}
        />
      </div>
    );
  }

  const name = profile?.name || '한입회원';
  const initial = name[0]?.toUpperCase() || 'U';
  const joinedDays = profile?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000))
    : 30;

  return (
    <div className={styles.page}>
      <button className={styles.back} type="button" onClick={() => router.back()}><ChevronLeft size={17} /> 뒤로</button>

      <header className={styles.profile}>
        <div className={styles.avatar}>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} /> : initial}
        </div>
        <div>
          <h1>{name} <span style={{ color: 'var(--t3)', fontSize: 14 }}>[Lv.2]</span></h1>
          <div className={styles.meta}>
            <span>가입 {joinedDays}일</span>
            <span><b>{questions.length}</b> 질문</span>
            <span><b>{answers.length}</b> 답변</span>
            <span><b>{answers.filter(answer => answer.is_adopted).length}</b> 채택</span>
          </div>
          {isMe && <p className={styles.notice}>내 활동을 한 곳에 모았어요. 저장한 글과 팔로우는 나에게만 보여요.</p>}
        </div>
      </header>

      <nav className={styles.tabs} aria-label="마이페이지 탭">
        {TABS.map(item => (
          <button key={item.key} type="button" className={tab === item.key ? styles.on : ''} onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </nav>

      <section className={styles.list}>
        {tab === 'questions' && (
          questions.length ? questions.map(q => (
            <Row key={q.id} href={`/q/${q.slug || q.id}`} type="질문" icon={<PenLine size={14} />} title={q.title} body={`${q.category} · 답변 ${q.answer_count || 0}개`} meta={ft(q.created_at)} />
          )) : <Empty title="아직 질문이 없어요" body="궁금한 돈 고민을 질문으로 남겨보세요." />
        )}
        {tab === 'answers' && (
          answers.length ? answers.map(a => (
            <Row key={a.id} href={`/q/${a.questions?.slug || a.questions?.id || a.question_id}`} type={a.is_adopted ? '채택 답변' : '답변'} icon={<ThumbsUp size={14} />} title={a.questions?.title || '질문'} body={a.body} meta={`${a.like_count || 0}명이 도움됐어요 · ${ft(a.created_at)}`} />
          )) : <Empty title="아직 답변이 없어요" body="답할 수 있는 질문을 발견하면 활동이 쌓여요." />
        )}
        {tab === 'bookmarks' && (
          bookmarks.length ? bookmarks.map(item => (
            <Row key={`${item.target_type}:${item.target_id}`} href={item.href} type={itemLabel(item.target_type)} icon={<Bookmark size={14} />} title={item.title} body={item.category || '저장한 글'} meta={ft(item.created_at)} />
          )) : <Empty title="저장한 글이 없어요" body="질문, 피드, 스파링 카드의 저장 아이콘을 눌러 모아보세요." />
        )}
        {tab === 'follows' && (
          follows.length ? follows.map(item => (
            <Row key={`${item.target_type}:${item.target_id}`} href={item.target_type === 'topic' ? `/topics/${encodeURIComponent(item.target_id)}` : `/u/${item.target_id}`} type={item.target_type === 'topic' ? '토픽' : '작성자'} icon={<UserPlus size={14} />} title={item.title || item.target_id} body="팔로우 중" meta={ft(item.created_at)} />
          )) : <Empty title="팔로우가 없어요" body="관심 토픽을 팔로우하면 여기에서 다시 볼 수 있어요." />
        )}
        {tab === 'activity' && (
          activity.length ? activity.map((item, index) => (
            <Row key={`${item.type}:${item.href}:${index}`} href={item.href} type={item.type} icon={<Activity size={14} />} title={item.title} body="최근 활동" meta={ft(item.created_at)} />
          )) : <Empty title="최근 활동이 없어요" body="질문, 답변, 저장, 팔로우 활동이 쌓이면 표시돼요." />
        )}
      </section>
    </div>
  );
}

function Row({ href, type, icon, title, body, meta }: { href: string; type: string; icon: ReactNode; title: string; body: string; meta: string }) {
  return (
    <Link href={href} className={styles.row}>
      <span className={styles.type}>{icon}{type}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      <em><MessageCircle size={13} /> {meta}</em>
    </Link>
  );
}

function Empty({ title, body, cta }: { title: string; body: string; cta?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      <p>{body}</p>
      {cta}
    </div>
  );
}

function itemLabel(type: BookmarkItem['target_type']) {
  if (type === 'question') return '질문';
  if (type === 'sparring') return '스파링';
  return '피드';
}
