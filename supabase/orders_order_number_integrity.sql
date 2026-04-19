create sequence if not exists public.orders_order_number_seq as bigint;

alter sequence public.orders_order_number_seq owned by public.orders.order_number;

select setval(
  'public.orders_order_number_seq',
  coalesce((select max(order_number)::bigint from public.orders), 0) + 1,
  false
);

alter table public.orders
  alter column order_number set default nextval('public.orders_order_number_seq');

create unique index if not exists orders_order_number_unique_idx
  on public.orders(order_number)
  where order_number is not null;