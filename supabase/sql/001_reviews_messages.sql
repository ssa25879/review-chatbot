-- 실데이터 모드용 reviews / messages 테이블
-- Supabase Dashboard > SQL Editor에서 한 번 실행한다. (재실행해도 안전하도록 if not exists / drop policy if exists 사용)

create table if not exists public.reviews (
  id text primary key,                      -- CSV id(r001…)를 그대로 사용 (Pinecone _id와 동일)
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  content text not null,
  author text not null,
  date date not null,
  helpful_votes integer not null default 0 check (helpful_votes >= 0),
  verified_purchase boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  chat_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_created_at_idx
  on public.messages (chat_id, created_at);

alter table public.reviews enable row level security;
alter table public.messages enable row level security;

-- 서버가 publishable(anon) 키로 접근하므로 anon에 필요한 최소 권한만 부여한다.
-- reviews: upsert에 select/insert/update가 모두 필요하다.
-- messages: insert만 허용해 공개 키로 대화 내용을 조회할 수 없게 한다.
grant select, insert, update on public.reviews to anon;
grant insert on public.messages to anon;

-- 기존 프로젝트에 있던 전체 허용 정책(ALL to public)은 조회·수정·삭제를 모두 열어 두므로 제거한다.
drop policy if exists "Allow all access to messages" on public.messages;
drop policy if exists "Allow all access to reviews" on public.reviews;

drop policy if exists "anon can read reviews" on public.reviews;
create policy "anon can read reviews" on public.reviews
  for select to anon using (true);

drop policy if exists "anon can insert reviews" on public.reviews;
create policy "anon can insert reviews" on public.reviews
  for insert to anon with check (true);

drop policy if exists "anon can update reviews" on public.reviews;
create policy "anon can update reviews" on public.reviews
  for update to anon using (true) with check (true);

drop policy if exists "anon can insert messages" on public.messages;
create policy "anon can insert messages" on public.messages
  for insert to anon with check (true);
