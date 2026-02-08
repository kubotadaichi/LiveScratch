-- nanoid function for short IDs (7 chars, URL-safe)
-- Must be defined before projects table since the default depends on it.
create or replace function nanoid(size int default 7)
returns text as $$
declare
  id text := '';
  i int := 0;
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
begin
  for i in 1..size loop
    id := id || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return id;
end;
$$ language plpgsql;

-- Projects table
create table public.projects (
  id text primary key default nanoid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled',
  workspace jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table public.projects enable row level security;

-- Anyone can read projects (for sharing)
create policy "projects_select_all" on public.projects
  for select using (true);

-- Only owner can insert
create policy "projects_insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

-- Only owner can update
create policy "projects_update_own" on public.projects
  for update using (auth.uid() = user_id);

-- Only owner can delete
create policy "projects_delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on public.projects
  for each row execute function update_updated_at();
