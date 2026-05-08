-- 신규 회원 기본 이름을 경제형 랜덤닉네임으로 저장합니다.
-- Supabase SQL Editor에서 실행하세요.

create or replace function public.finance_nickname(seed text)
returns text
language plpgsql
immutable
as $$
declare
  areas text[] := array[
    '신림동', '여의도', '봉천동', '판교', '성수동', '을지로',
    '마포', '합정동', '역삼동', '서초동', '문래동', '잠실'
  ];
  titles text[] := array[
    '현인', '복리주의자', '배당수집가', 'ETF탐험가', '절세러', '월급관리자',
    '적금장인', '분산투자러', '대출정리러', '예산설계자', '현금흐름러', '가계부고수'
  ];
  specials text[] := array[
    '신림동의현인', '소현버핏', '여의도복리주의자', '판교배당수집가', '봉천동절세러'
  ];
  h integer;
begin
  h := abs(hashtext(coalesce(seed, gen_random_uuid()::text)));

  if h % 5 = 0 then
    return specials[(h % array_length(specials, 1)) + 1];
  end if;

  return areas[(h % array_length(areas, 1)) + 1]
    || '의'
    || titles[((h / array_length(areas, 1)) % array_length(titles, 1)) + 1];
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    public.finance_nickname(new.id::text),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      new.raw_user_meta_data->>'profile_image'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
    name = case
      when public.users.name is null
        or public.users.name = ''
        or public.users.name = new.raw_user_meta_data->>'full_name'
        or public.users.name = new.raw_user_meta_data->>'name'
        or public.users.name = split_part(coalesce(new.email, ''), '@', 1)
      then excluded.name
      else public.users.name
    end;

  return new;
end;
$$;
