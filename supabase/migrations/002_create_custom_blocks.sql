-- Custom blocks table
create table public.custom_blocks (
  id text primary key default nanoid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  category text not null default 'Custom',
  colour int not null default 230,
  definition jsonb not null,    -- Blockly block JSON definition
  generator_code text not null, -- JS code that converts block → IR fragment
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table public.custom_blocks enable row level security;

-- Anyone can read public blocks
create policy "custom_blocks_select_public" on public.custom_blocks
  for select using (is_public = true or auth.uid() = user_id);

-- Only owner can insert
create policy "custom_blocks_insert_own" on public.custom_blocks
  for insert with check (auth.uid() = user_id);

-- Only owner can update
create policy "custom_blocks_update_own" on public.custom_blocks
  for update using (auth.uid() = user_id);

-- Only owner can delete
create policy "custom_blocks_delete_own" on public.custom_blocks
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create trigger custom_blocks_updated_at
  before update on public.custom_blocks
  for each row execute function update_updated_at();
