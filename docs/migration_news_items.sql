create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  title text not null,
  summary text,
  url text not null unique,
  thumbnail_url text,
  category text,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  click_count integer not null default 0
);

create index if not exists news_items_published_at_idx
  on public.news_items (published_at desc);

create index if not exists news_items_category_idx
  on public.news_items (category);

alter table public.news_items enable row level security;

do $$
begin
  create policy "Anyone can read news items"
    on public.news_items for select
    using (true);
exception when duplicate_object then null;
end $$;

