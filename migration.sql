-- ==========================================
-- SPLITLY DATABASE MIGRATION SQL
-- ==========================================

-- Enable UUID extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  unique_user_id text unique not null constraint username_length check (char_length(unique_user_id) >= 3),
  display_name text not null,
  avatar_url text,
  created_at timestamp with time zone default now() not null
);

-- 2. Create Groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default now() not null
);

-- 3. Create Group Members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  profile_id uuid references public.profiles on delete cascade not null,
  joined_at timestamp with time zone default now() not null,
  unique (group_id, profile_id)
);

-- 4. Create Expenses table
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  paid_by uuid references public.profiles on delete cascade not null,
  description text not null,
  amount numeric(12, 2) not null constraint positive_amount check (amount > 0),
  split_type text not null constraint valid_split_type check (split_type in ('equal', 'exact', 'percentage')),
  receipt_url text,
  expense_date timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

-- 5. Create Expense Splits table
create table if not exists public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references public.expenses on delete cascade not null,
  profile_id uuid references public.profiles on delete cascade not null,
  amount numeric(12, 2) not null constraint non_negative_amount check (amount >= 0),
  percent numeric(5, 2) constraint valid_percent check (percent >= 0 and percent <= 100),
  created_at timestamp with time zone default now() not null,
  unique (expense_id, profile_id)
);

-- 6. Create Settlements table
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups on delete cascade not null,
  payer_id uuid references public.profiles on delete cascade not null,
  payee_id uuid references public.profiles on delete cascade not null,
  amount numeric(12, 2) not null constraint positive_settle_amount check (amount > 0),
  settled_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) & HELPER FUNCTIONS
-- ==========================================

-- Security Definer helper to check group membership without infinite recursion
create or replace function public.is_group_member(group_uuid uuid, user_uuid uuid)
returns boolean security definer set search_path = public as $$
begin
  return exists (
    select 1 from public.group_members
    where group_id = group_uuid and profile_id = user_uuid
  );
end;
$$ language plpgsql;

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements enable row level security;

-- Profiles Policies
drop policy if exists "Allow public reading of profiles" on public.profiles;
create policy "Allow public reading of profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

drop policy if exists "Allow user updating their own profile" on public.profiles;
create policy "Allow user updating their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Groups Policies
drop policy if exists "Allow group members to view group" on public.groups;
create policy "Allow group members to view group"
  on public.groups for select
  using (public.is_group_member(id, auth.uid()) or created_by = auth.uid());

drop policy if exists "Allow authenticated users to create group" on public.groups;
create policy "Allow authenticated users to create group"
  on public.groups for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Allow group members to update group details" on public.groups;
create policy "Allow group members to update group details"
  on public.groups for update
  using (public.is_group_member(id, auth.uid()));

drop policy if exists "Allow group creator to delete group" on public.groups;
create policy "Allow group creator to delete group"
  on public.groups for delete
  using (created_by = auth.uid());

-- Group Members Policies
drop policy if exists "Allow group members to view membership lists" on public.group_members;
create policy "Allow group members to view membership lists"
  on public.group_members for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Allow joining or adding members to group" on public.group_members;
create policy "Allow joining or adding members to group"
  on public.group_members for insert
  with check (
    -- User is joining themselves
    auth.uid() = profile_id 
    -- Or user is already a member adding someone else
    or public.is_group_member(group_id, auth.uid())
  );

drop policy if exists "Allow leaving group or removing member" on public.group_members;
create policy "Allow leaving group or removing member"
  on public.group_members for delete
  using (
    -- User leaving themselves
    auth.uid() = profile_id 
    -- Or user is already a member removing someone else
    or public.is_group_member(group_id, auth.uid())
  );

-- Expenses Policies
drop policy if exists "Allow group members to view expenses" on public.expenses;
create policy "Allow group members to view expenses"
  on public.expenses for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Allow group members to create expenses" on public.expenses;
create policy "Allow group members to create expenses"
  on public.expenses for insert
  with check (
    public.is_group_member(group_id, auth.uid()) 
    and auth.uid() = paid_by
  );

drop policy if exists "Allow group members to update expenses" on public.expenses;
create policy "Allow group members to update expenses"
  on public.expenses for update
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Allow group members to delete expenses" on public.expenses;
create policy "Allow group members to delete expenses"
  on public.expenses for delete
  using (public.is_group_member(group_id, auth.uid()));

-- Expense Splits Policies
drop policy if exists "Allow group members to view splits" on public.expense_splits;
create policy "Allow group members to view splits"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_id
      and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

drop policy if exists "Allow group members to create splits" on public.expense_splits;
create policy "Allow group members to create splits"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_id
      and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

drop policy if exists "Allow group members to update splits" on public.expense_splits;
create policy "Allow group members to update splits"
  on public.expense_splits for update
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_id
      and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

drop policy if exists "Allow group members to delete splits" on public.expense_splits;
create policy "Allow group members to delete splits"
  on public.expense_splits for delete
  using (
    exists (
      select 1 from public.expenses
      where expenses.id = expense_id
      and public.is_group_member(expenses.group_id, auth.uid())
    )
  );

-- Settlements Policies
drop policy if exists "Allow group members to view settlements" on public.settlements;
create policy "Allow group members to view settlements"
  on public.settlements for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Allow group members to log settlements" on public.settlements;
create policy "Allow group members to log settlements"
  on public.settlements for insert
  with check (
    public.is_group_member(group_id, auth.uid())
    and (auth.uid() = payer_id or auth.uid() = payee_id)
  );

drop policy if exists "Allow group members to update settlements" on public.settlements;
create policy "Allow group members to update settlements"
  on public.settlements for update
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Allow group members to delete settlements" on public.settlements;
create policy "Allow group members to delete settlements"
  on public.settlements for delete
  using (public.is_group_member(group_id, auth.uid()));

-- ==========================================
-- AUTO-PROFILE CREATION TRIGGER (AUTH SCHEMA)
-- ==========================================

create or replace function public.handle_new_user()
returns trigger security definer set search_path = public as $$
begin
  insert into public.profiles (id, unique_user_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'unique_user_id', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically create a profile record when a new user signs up in auth
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- STORAGE BUCKETS & POLICIES
-- ==========================================

-- Insert bucket configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'application/pdf'];

-- Helper to extract group ID uuid from a storage path format: "group_id/filename.ext"
create or replace function public.path_to_uuid(path text)
returns uuid security definer as $$
declare
  parts text[];
begin
  parts := string_to_array(path, '/');
  if array_length(parts, 1) >= 1 then
    return parts[1]::uuid;
  end if;
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql;

-- Enable storage policies (Storage uses table `storage.objects`)
drop policy if exists "Allow group members to view files in group path" on storage.objects;
create policy "Allow group members to view files in group path"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and public.is_group_member(public.path_to_uuid(name), auth.uid())
  );

drop policy if exists "Allow group members to upload files to group path" on storage.objects;
create policy "Allow group members to upload files to group path"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and public.is_group_member(public.path_to_uuid(name), auth.uid())
  );

drop policy if exists "Allow group members to delete files in group path" on storage.objects;
create policy "Allow group members to delete files in group path"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and public.is_group_member(public.path_to_uuid(name), auth.uid())
  );
