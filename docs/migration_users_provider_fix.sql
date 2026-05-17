-- 로그인 깨짐 fix — public.users 의 provider 컬럼 누락 + trigger 의 잘못된 raw_app_meta_data 참조 수정.
--
-- 문제:
--   기존 handle_new_user trigger 가 `public.users(provider)` 에 insert 하려고 했으나
--   `public.users` 테이블에 `provider` 컬럼이 존재하지 않아서 매 신규 가입마다 실패.
--   또한 `new.app_metadata` 참조도 잘못됐음 — auth.users 실제 컬럼명은 `raw_app_meta_data`.
--
-- 영향:
--   trigger 도입 이후 가입한 모든 신규 유저가 사실상 가입 불가 상태였음.
--   (auth.users 행은 만들어졌을 수 있지만 public.users 동기화 실패로 사이트에서 인식 X)
--
-- 실행 후:
--   - public.users.provider 컬럼 생성
--   - 누락된 auth.users 전부 backfill
--   - trigger 함수 raw_app_meta_data 참조로 정정

-- 1) provider 컬럼 추가
alter table public.users
  add column if not exists provider text;

-- 2) 누락된 auth.users → public.users 백필 (멱등)
insert into public.users (id, email, name, avatar_url, provider, role)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'name', au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  coalesce(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture'),
  coalesce(au.raw_user_meta_data->>'provider', au.raw_app_meta_data->>'provider', 'email'),
  'user'
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;

-- 3) trigger 함수 재정의
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url, provider, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    ),
    coalesce(
      new.raw_user_meta_data->>'provider',
      new.raw_app_meta_data->>'provider',
      'email'
    ),
    'user'
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    provider = coalesce(excluded.provider, public.users.provider);
  return new;
end;
$$;
