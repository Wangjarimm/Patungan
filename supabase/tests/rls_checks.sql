-- RLS behaviour checks. Run against the linked project with:
--   npx supabase db query --linked -f supabase/tests/rls_checks.sql
-- Creates three throwaway accounts (A owner, B participant, C outsider) and tries each rule as
-- them. Everything runs in one transaction that ends in ROLLBACK, so no test account or row is
-- left behind, even when a check fails halfway. Every row should say passed = true.

begin;

create temp table rls_results (
  n serial primary key,
  check_name text not null,
  passed boolean not null,
  detail text
);
grant all on rls_results to authenticated, anon;
grant usage on sequence rls_results_n_seq to authenticated, anon;

do $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000a001';
  b constant uuid := '00000000-0000-4000-8000-00000000b002';
  c constant uuid := '00000000-0000-4000-8000-00000000c003';
  bill constant uuid := '00000000-0000-4000-8000-0000000b1110';
  pa constant uuid := '00000000-0000-4000-8000-0000000a0001';
  pb constant uuid := '00000000-0000-4000-8000-0000000a0002';
  item constant uuid := '00000000-0000-4000-8000-0000000a1001';
  code text;
  n int;
  j jsonb;
  t text;
begin
  -- Tables without RLS would be readable by any signed-in user.
  for t in
    select tablename from pg_tables where schemaname = 'public' and not rowsecurity
  loop
    insert into rls_results (check_name, passed, detail) values ('RLS enabled on ' || t, false, 'disabled');
  end loop;
  insert into rls_results (check_name, passed, detail)
  select 'RLS enabled on every public table', not exists (
    select 1 from pg_tables where schemaname = 'public' and not rowsecurity
  ), (select count(*) || ' tables' from pg_tables where schemaname = 'public');

  insert into auth.users (id, aud, role, email)
  values
    (a, 'authenticated', 'authenticated', 'rls-a@patungan.test'),
    (b, 'authenticated', 'authenticated', 'rls-b@patungan.test'),
    (c, 'authenticated', 'authenticated', 'rls-c@patungan.test');

  -- ---- As A (owner) -------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.profiles (id, display_name) values (a, 'Raka');
  insert into public.bills (id, title) values (bill, 'Kedai Uji RLS') returning join_code into code;
  insert into public.participants (id, bill_id, display_name, color, profile_id)
  values (pa, bill, 'Raka', '#B4471B', a), (pb, bill, 'Dinda', '#2367A0', null);
  update public.bills set payer_participant_id = pa where id = bill;
  insert into public.items (id, bill_id, name, unit_price, qty) values (item, bill, 'Mie', 30000, 1);
  insert into public.item_shares (bill_id, item_id, participant_id) values (bill, item, pa);
  insert into rls_results (check_name, passed, detail)
  values ('A creates a bill with a 6-character join code', code ~ '^[A-HJ-NP-Z2-9]{6}$', code);

  begin
    update public.bills set join_code = 'ABCDEF' where id = bill;
    insert into rls_results (check_name, passed, detail) values ('Join code cannot be changed', false, 'update allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('Join code cannot be changed', sqlerrm = 'JOIN_CODE_IMMUTABLE', sqlerrm);
  end;

  begin
    update public.participants set profile_id = c where id = pb;
    insert into rls_results (check_name, passed, detail) values ('Owner cannot link another account to a name', false, 'update allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('Owner cannot link another account to a name', sqlerrm = 'CANNOT_LINK_OTHER_ACCOUNT', sqlerrm);
  end;

  -- ---- As B (before joining) ----------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.profiles (id, display_name) values (b, 'Dinda');

  select count(*) into n from public.bills where id = bill;
  insert into rls_results (check_name, passed, detail) values ('B cannot see the bill before joining', n = 0, n || ' rows');
  select count(*) into n from public.items where bill_id = bill;
  insert into rls_results (check_name, passed, detail) values ('B cannot see its menu before joining', n = 0, n || ' rows');

  j := public.join_bill(lower(code));
  insert into rls_results (check_name, passed, detail)
  values ('join_bill previews the bill and unclaimed names',
    j ->> 'title' = 'Kedai Uji RLS' and j ->> 'payer_name' = 'Raka'
      and jsonb_array_length(j -> 'unclaimed') = 1 and j -> 'unclaimed' -> 0 ->> 'display_name' = 'Dinda',
    j::text);

  begin
    perform public.claim_participant(pa);
    insert into rls_results (check_name, passed, detail) values ('B cannot claim a name already claimed', false, 'claim allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('B cannot claim a name already claimed', sqlerrm = 'NAME_ALREADY_CLAIMED', sqlerrm);
  end;

  perform public.claim_participant(pb);
  select count(*) into n from public.bills where id = bill;
  insert into rls_results (check_name, passed, detail) values ('B sees the bill after claiming Dinda', n = 1, n || ' rows');

  begin
    perform public.join_as_new_participant(code, 'Dinda Lagi', '#6A4AB8');
    insert into rls_results (check_name, passed, detail) values ('B cannot join twice under another name', false, 'joined twice');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('B cannot join twice under another name', sqlerrm = 'ALREADY_JOINED', sqlerrm);
  end;

  -- Menu is owner-only.
  begin
    insert into public.items (bill_id, name, unit_price, qty) values (bill, 'Es teh', 6000, 1);
    insert into rls_results (check_name, passed, detail) values ('B cannot add a menu item', false, 'insert allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('B cannot add a menu item', true, sqlerrm);
  end;
  update public.items set unit_price = 1 where id = item;
  get diagnostics n = row_count;
  insert into rls_results (check_name, passed, detail) values ('B cannot change a menu price', n = 0, n || ' rows updated');
  delete from public.items where id = item;
  get diagnostics n = row_count;
  insert into rls_results (check_name, passed, detail) values ('B cannot delete a menu item', n = 0, n || ' rows deleted');
  update public.bills set title = 'Diretas' where id = bill;
  get diagnostics n = row_count;
  insert into rls_results (check_name, passed, detail) values ('B cannot change bill settings', n = 0, n || ' rows updated');

  -- Own eater choices only.
  insert into public.item_shares (bill_id, item_id, participant_id) values (bill, item, pb);
  insert into rls_results (check_name, passed, detail) values ('B can mark themselves as an eater', true, null);
  begin
    delete from public.item_shares where item_id = item and participant_id = pa;
    get diagnostics n = row_count;
    insert into rls_results (check_name, passed, detail) values ('B cannot remove someone else as eater', n = 0, n || ' rows deleted');
  end;
  begin
    insert into public.item_shares (bill_id, item_id, participant_id) values (bill, item, pa);
    insert into rls_results (check_name, passed, detail) values ('B cannot add someone else as eater', false, 'insert allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('B cannot add someone else as eater', true, sqlerrm);
  end;

  -- Own payment status only.
  begin
    update public.participants set display_name = 'Bos' where id = pb;
    insert into rls_results (check_name, passed, detail) values ('B cannot rename themselves', false, 'update allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('B cannot rename themselves', sqlerrm = 'PARTICIPANT_CAN_ONLY_CHANGE_PAYMENT_STATUS', sqlerrm);
  end;
  update public.participants set paid_at = now(), paid_marked_by = b where id = pb;
  get diagnostics n = row_count;
  insert into rls_results (check_name, passed, detail) values ('B can mark their own payment', n = 1, n || ' rows updated');
  update public.participants set paid_at = now() where id = pa;
  get diagnostics n = row_count;
  insert into rls_results (check_name, passed, detail) values ('B cannot mark someone else paid', n = 0, n || ' rows updated');

  -- ---- As C (outsider) ----------------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.profiles (id, display_name) values (c, 'Orang Luar');

  select count(*) into n from public.bills where id = bill;
  insert into rls_results (check_name, passed, detail) values ('C cannot see a bill they did not join', n = 0, n || ' rows');
  select count(*) into n from public.participants where bill_id = bill;
  insert into rls_results (check_name, passed, detail) values ('C cannot see its participants', n = 0, n || ' rows');
  select count(*) into n from public.profiles where id in (a, b);
  insert into rls_results (check_name, passed, detail) values ('C cannot see profiles of strangers', n = 0, n || ' rows');
  begin
    perform public.join_bill('ZZZZZ9');
    insert into rls_results (check_name, passed, detail) values ('Wrong join code gives a clear error', false, 'no error');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('Wrong join code gives a clear error', sqlerrm in ('JOIN_CODE_NOT_FOUND', 'JOIN_CODE_INVALID'), sqlerrm);
  end;
  begin
    perform public.join_bill('O0I1AB');
    insert into rls_results (check_name, passed, detail) values ('Codes with O, 0, I, 1 are rejected', false, 'accepted');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('Codes with O, 0, I, 1 are rejected', sqlerrm = 'JOIN_CODE_INVALID', sqlerrm);
  end;

  -- ---- As A again: sees B's profile once they share a bill ----------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles where id = b;
  insert into rls_results (check_name, passed, detail) values ('A sees the profile of someone in their bill', n = 1, n || ' rows');
  select count(*) into n from public.profiles where id = c;
  insert into rls_results (check_name, passed, detail) values ('A cannot see the outsider profile', n = 0, n || ' rows');

  -- ---- Not signed in (anon) -----------------------------------------------
  reset role;
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  set local role anon;
  select count(*) into n from public.bills;
  insert into rls_results (check_name, passed, detail) values ('Signed-out users see no bills', n = 0, n || ' rows');
  begin
    perform public.join_bill(code);
    insert into rls_results (check_name, passed, detail) values ('Signed-out users cannot call join_bill', false, 'allowed');
  exception when others then
    insert into rls_results (check_name, passed, detail) values ('Signed-out users cannot call join_bill', true, sqlerrm);
  end;

  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

select n, check_name, passed, detail from rls_results order by n;

-- Undo everything above: test accounts, profiles, bills, and the results table.
rollback;
