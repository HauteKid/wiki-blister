-- Выполните в Supabase: SQL Editor → New query → вставьте и Run.
-- Затем в Authentication → Providers → Email: при разработке можно отключить
-- «Confirm email», чтобы вход работал сразу после регистрации.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  collection jsonb not null default '[]'::jsonb,
  todays_pack jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

create policy "user_state_select_own"
  on public.user_state for select
  using (auth.uid() = user_id);

create policy "user_state_insert_own"
  on public.user_state for insert
  with check (auth.uid() = user_id);

create policy "user_state_update_own"
  on public.user_state for update
  using (auth.uid() = user_id);

create or replace function public.handle_new_user_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_state (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_user_state on auth.users;

create trigger on_auth_user_created_user_state
  after insert on auth.users
  for each row execute procedure public.handle_new_user_state();
