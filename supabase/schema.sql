-- ============================================
-- Cohort Comms — Database Schema
-- Run in Supabase SQL Editor
-- ============================================

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_color text default '#6c5ce7',
  is_admin boolean default false,
  status text default 'offline' check (status in ('online', 'away', 'offline')),
  last_seen_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Channels
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  type text not null default 'chat' check (type in ('chat', 'announcement', 'thread-board')),
  emoji text default '💬',
  created_by uuid references public.profiles(id) on delete set null,
  is_default boolean default false,
  archived boolean default false,
  created_at timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  parent_id uuid references public.messages(id) on delete cascade,
  is_thread_starter boolean default false,
  edited_at timestamptz,
  created_at timestamptz default now()
);

-- Reactions
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz default now(),
  unique (message_id, user_id, emoji)
);

-- Direct messages
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Channel members (tracks read state)
create table if not exists public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  notifications_enabled boolean default true,
  primary key (channel_id, user_id)
);

-- Typing indicators (ephemeral)
create table if not exists public.typing_indicators (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz default now(),
  primary key (channel_id, user_id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.direct_messages enable row level security;
alter table public.channel_members enable row level security;
alter table public.typing_indicators enable row level security;

-- Profiles: authenticated users only
create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Channels: authenticated reads, creator can update/delete
create policy "channels_read" on public.channels for select to authenticated using (true);
create policy "channels_insert" on public.channels for insert with check (auth.uid() is not null);
create policy "channels_update" on public.channels for update using (auth.uid() = created_by);
create policy "channels_delete" on public.channels for delete using (auth.uid() = created_by);

-- Messages: authenticated reads; announcement channels require is_admin
create policy "messages_read" on public.messages for select to authenticated using (true);
create policy "messages_insert" on public.messages for insert with check (
  auth.uid() = author_id
  and (
    -- Non-announcement channels: any authenticated user
    not exists (
      select 1 from public.channels where id = channel_id and type = 'announcement'
    )
    or
    -- Announcement channels: admin only
    exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    )
  )
);
create policy "messages_update" on public.messages for update using (auth.uid() = author_id);
create policy "messages_delete" on public.messages for delete using (auth.uid() = author_id);

-- Reactions: authenticated only
create policy "reactions_read" on public.reactions for select to authenticated using (true);
create policy "reactions_insert" on public.reactions for insert with check (auth.uid() = user_id);
create policy "reactions_delete" on public.reactions for delete using (auth.uid() = user_id);

-- Direct messages: sender and recipient only
create policy "dm_read" on public.direct_messages for select to authenticated using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "dm_insert" on public.direct_messages for insert with check (auth.uid() = sender_id);
create policy "dm_update" on public.direct_messages for update using (auth.uid() = recipient_id);
create policy "dm_delete" on public.direct_messages for delete using (auth.uid() = sender_id);

-- Channel members: authenticated only
create policy "channel_members_read" on public.channel_members for select to authenticated using (true);
create policy "channel_members_insert" on public.channel_members for insert with check (auth.uid() = user_id);
create policy "channel_members_update" on public.channel_members for update using (auth.uid() = user_id);

-- Typing indicators: authenticated only
create policy "typing_read" on public.typing_indicators for select to authenticated using (true);
create policy "typing_insert" on public.typing_indicators for insert with check (auth.uid() = user_id);
create policy "typing_delete" on public.typing_indicators for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  colors text[] := array['#6c5ce7','#00b894','#fd79a8','#00cec9','#f39c12','#e17055','#a29bfe','#55efc4'];
begin
  insert into public.profiles (id, email, display_name, avatar_color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    colors[1 + floor(random() * array_length(colors, 1))::int]
  );
  -- Auto-join all default channels
  insert into public.channel_members (channel_id, user_id)
  select id, new.id from public.channels where is_default = true;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed default channels
insert into public.channels (name, description, type, emoji, is_default) values
  ('general', 'Main cohort discussion', 'chat', '🏠', true),
  ('announcements', 'Important updates from staff', 'announcement', '📢', true),
  ('random', 'Off-topic and fun', 'chat', '🎲', true),
  ('help', 'Ask questions, get answers', 'chat', '🙋', true),
  ('show-and-tell', 'Share what you shipped', 'thread-board', '🚀', true),
  ('ideas', 'Brainstorm and discuss', 'thread-board', '💡', true)
on conflict do nothing;

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.typing_indicators;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.direct_messages;
