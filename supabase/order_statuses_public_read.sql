alter table public.order_statuses enable row level security;

drop policy if exists order_statuses_public_read on public.order_statuses;

create policy order_statuses_public_read
  on public.order_statuses
  for select
  to anon, authenticated
  using (true);