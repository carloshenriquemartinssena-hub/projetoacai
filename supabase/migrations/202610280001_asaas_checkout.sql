-- Aplicar sobre as quatro tabelas existentes. Não recria nem apaga pedidos.
begin;

alter table public.orders
  add column if not exists checkout_request_id uuid,
  add column if not exists checkout_token_hash text,
  add column if not exists checkout_request_hash text,
  add column if not exists checkout_state text,
  add column if not exists checkout_billing_type text;
create unique index if not exists orders_checkout_request_id_key on public.orders(checkout_request_id);

-- Acesso de visitantes passa pelas Edge Functions; nenhum dado de cliente é público.
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.products enable row level security;
revoke all on public.orders, public.payment_events from public, anon, authenticated;
grant select, insert, update on public.orders, public.payment_events to service_role;
grant select on public.products to service_role;

-- Deduplicação e atualização do pagamento na MESMA transação.
create or replace function public.process_asaas_event(event_payload jsonb)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  event_id text := event_payload->>'id';
  kind text := event_payload->>'event';
  payment jsonb := event_payload->'payment';
  ev public.payment_events%rowtype;
  ord public.orders%rowtype;
  reference_id uuid;
  next_payment text;
begin
  if event_id is null or length(event_id) > 200 or kind is null then
    raise exception 'Invalid event';
  end if;
  insert into public.payment_events(asaas_event_id,event_type,asaas_payment_id,payload)
    values(event_id,kind,payment->>'id',event_payload)
    on conflict (asaas_event_id) do nothing;
  select * into ev from public.payment_events where asaas_event_id=event_id for update;
  if ev.processed_at is not null then return jsonb_build_object('duplicate',true); end if;
  if ev.payload <> event_payload then raise exception 'Event payload conflict'; end if;

  begin
  if kind not in ('PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED',
     'PAYMENT_OVERDUE','PAYMENT_DELETED','PAYMENT_REFUNDED','PAYMENT_REFUND_IN_PROGRESS',
     'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED','PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE',
     'PAYMENT_AWAITING_CHARGEBACK_REVERSAL') then
    update public.payment_events set processed_at=now() where id=ev.id;
    return jsonb_build_object('ignored',true);
  end if;
  begin reference_id := (payment->>'externalReference')::uuid;
  exception when invalid_text_representation then reference_id := null;
  end;
  -- Outros sistemas podem compartilhar a conta Asaas; não os vincule a pedidos desta loja.
  if reference_id is null then
    update public.payment_events set processed_at=now(),processing_error='No store order reference' where id=ev.id;
    return jsonb_build_object('ignored',true);
  end if;
  select * into ord from public.orders where id=reference_id for update;
  if not found then
    update public.payment_events set processed_at=now(),processing_error='Reference does not belong to store' where id=ev.id;
    return jsonb_build_object('ignored',true);
  end if;
  if payment->>'id' is null or (ord.asaas_payment_id is not null and ord.asaas_payment_id <> payment->>'id') then
    raise exception 'Payment identifier mismatch';
  end if;
  if payment->>'value' is null or (payment->>'value')::numeric * 100 <> ord.total_cents then
    raise exception 'Payment amount mismatch';
  end if;
  next_payment := case
    when kind in ('PAYMENT_CONFIRMED','PAYMENT_RECEIVED') then 'confirmed'
    when kind='PAYMENT_REFUNDED' then 'refunded'
    when kind='PAYMENT_DELETED' then 'cancelled'
    when kind in ('PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
      'PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL') then 'failed'
    else null end;
  -- Não reabre reembolso/cancelamento nem regride um pagamento confirmado por atraso.
  if ord.payment_status in ('refunded','cancelled') and next_payment <> 'refunded' then next_payment := null; end if;
  if ord.payment_status='confirmed' and kind in ('PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED') then next_payment := null; end if;
  if next_payment='confirmed' and exists (
    select 1 from public.payment_events where order_id=ord.id and processed_at is not null
    and event_type in ('PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE','PAYMENT_AWAITING_CHARGEBACK_REVERSAL')
  ) then next_payment := null; end if;
  update public.orders set
    asaas_payment_id=coalesce(asaas_payment_id,payment->>'id'),
    payment_status=coalesce(next_payment,payment_status),
    status=case
      when next_payment='confirmed' and status='pending_payment' then 'paid'
      when next_payment in ('refunded','cancelled') and status <> 'completed' then 'cancelled'
      else status end,
    paid_at=case when next_payment='confirmed' then coalesce(paid_at,now()) else paid_at end,
    updated_at=now()
  where id=ord.id;
  update public.payment_events set order_id=ord.id,processed_at=now(),processing_error=null where id=ev.id;
  return jsonb_build_object('processed',true);
  exception when others then
    -- O sub-bloco reverte qualquer alteração parcial no pedido e preserva o diagnóstico.
    update public.payment_events set processing_error=left(sqlerrm,500) where id=ev.id;
    return jsonb_build_object('retry',true);
  end;
end;
$$;
revoke all on function public.process_asaas_event(jsonb) from public, anon, authenticated;
grant execute on function public.process_asaas_event(jsonb) to service_role;
commit;
