import { PGlite } from "npm:@electric-sql/pglite@0.3.14";

function assert(value: unknown): asserts value { if (!value) throw new Error("Assertion failed"); }

Deno.test("SQL real: migração repetível, webhook atômico, duplicatas, valores e eventos fora de ordem", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table public.products(id uuid primary key, name text, size_label text, price_cents integer, is_active boolean);
      create table public.orders (
        id uuid primary key default gen_random_uuid(), customer_name text not null, customer_phone text not null,
        customer_email text, fulfillment_type text not null, delivery_address jsonb, delivery_notes text,
        items jsonb not null, subtotal_cents integer not null, delivery_fee_cents integer not null default 0,
        total_cents integer generated always as (subtotal_cents + delivery_fee_cents) stored, status text not null default 'pending_payment'
          check(status in ('pending_payment','paid','preparing','ready','out_for_delivery','completed','cancelled')),
        payment_status text not null default 'pending' check(payment_status in ('pending','confirmed','failed','refunded','cancelled')),
        asaas_checkout_id text unique, asaas_payment_id text unique, payment_url text, paid_at timestamptz,
        created_at timestamptz not null default now(), updated_at timestamptz not null default now());
      create table public.payment_events (
        id uuid primary key default gen_random_uuid(), asaas_event_id text not null unique, event_type text not null,
        order_id uuid references public.orders(id), asaas_payment_id text, payload jsonb not null,
        processed_at timestamptz, processing_error text, received_at timestamptz not null default now());
    `);
    const migration = await Deno.readTextFile(new URL("../supabase/migrations/202610280001_asaas_checkout.sql", import.meta.url));
    await db.exec(migration); await db.exec(migration);
    const orderId = "11111111-1111-4111-8111-111111111111";
    let generatedColumnError = "";
    try {
      await db.query(`insert into orders(id,customer_name,customer_phone,fulfillment_type,items,subtotal_cents,total_cents)
        values($1,'Test','11999999999','pickup','[{"product_id":"test"}]',200,200)`, [orderId]);
    } catch (error) { generatedColumnError = (error as any).code; }
    assert(generatedColumnError === "428C9");
    await db.query(`insert into orders(id,customer_name,customer_phone,fulfillment_type,items,subtotal_cents)
      values($1,'Test','11999999999','pickup','[{"product_id":"test"}]',200)`, [orderId]);
    assert((await db.query<any>("select total_cents from orders where id=$1", [orderId])).rows[0].total_cents === 200);
    const event = (id: string, kind: string, value = 2, paymentId = "pay_test") => ({ id, event: kind, payment: { id: paymentId, externalReference: orderId, value } });
    const process = (body: any) => db.query("select public.process_asaas_event($1::jsonb) as result", [JSON.stringify(body)]);
    const order = async () => (await db.query<any>("select * from orders where id=$1", [orderId])).rows[0];
    await process(event("evt_1", "PAYMENT_RECEIVED"));
    assert((await order()).payment_status === "confirmed" && (await order()).status === "paid");
    await process(event("evt_1", "PAYMENT_RECEIVED"));
    assert((await db.query<any>("select count(*)::int as n from payment_events")).rows[0].n === 1);
    await db.query("update orders set status='preparing' where id=$1", [orderId]);
    await process(event("evt_2", "PAYMENT_OVERDUE"));
    await process(event("evt_3", "PAYMENT_CONFIRMED"));
    assert((await order()).payment_status === "confirmed" && (await order()).status === "preparing");
    const bad = await process(event("evt_bad", "PAYMENT_RECEIVED", 0.01));
    assert((bad.rows[0] as any).result.retry); assert((await order()).payment_status === "confirmed");
    const failedEvent = (await db.query<any>("select * from payment_events where asaas_event_id='evt_bad'")).rows[0];
    assert(failedEvent.processing_error === "Payment amount mismatch" && failedEvent.processed_at === null);
    const other = await process(event("evt_other", "PAYMENT_RECEIVED", 2, "pay_other"));
    assert((other.rows[0] as any).result.retry);
    await process(event("evt_4", "PAYMENT_REFUNDED"));
    await process(event("evt_5", "PAYMENT_CONFIRMED"));
    assert((await order()).payment_status === "refunded" && (await order()).status === "cancelled");
    const grants = await db.query<any>("select has_table_privilege('anon','orders','SELECT') as readable, has_function_privilege('anon','process_asaas_event(jsonb)','EXECUTE') as executable");
    assert(!grants.rows[0].readable && !grants.rows[0].executable);
  } finally { await db.close(); }
});
