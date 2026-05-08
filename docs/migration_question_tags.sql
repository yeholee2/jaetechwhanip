-- Optional: run this before turning question tags into a first-class DB feature.
-- The app already falls back safely when this column is absent.

alter table public.questions
add column if not exists tags text[] not null default '{}';

create index if not exists questions_tags_gin_idx
on public.questions
using gin (tags);
