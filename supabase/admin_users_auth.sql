create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null default 'Administrateur',
  role text not null default 'admin' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon;
revoke insert, update, delete on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;

drop policy if exists admin_users_select_own on public.admin_users;

create policy admin_users_select_own
  on public.admin_users
  for select
  to authenticated
  using (auth.uid() = user_id and is_active = true);