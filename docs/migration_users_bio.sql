-- public.users.bio 컬럼 추가 — /mypage 프로필 수정 시 'Could not find bio column' 에러 해결.
alter table public.users add column if not exists bio text;
