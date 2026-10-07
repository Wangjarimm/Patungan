-- Patungan initial schema (phase 3): tables from the PRD data model, RLS, join and claim functions.
-- Money is whole Rupiah (bigint); percentages are numeric(5,2). Totals are never stored:
-- every device recalculates from the raw rows (src/lib/calc.ts).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bank', 'ewallet')),
  provider text not null check (char_length(btrim(provider)) between 1 and 40),
  account_number text not null check (char_length(btrim(account_number)) between 3 and 40),
  account_name text not null check (char_length(btrim(account_name)) between 1 and 60),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index payment_methods_profile_idx on public.payment_methods (profile_id);
-- At most one primary account per person.
create unique index payment_methods_one_primary on public.payment_methods (profile_id) where is_primary;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now()
);
create index groups_owner_idx on public.groups (owner_id);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  profile_id uuid references public.profiles (id) on delete set null,
  position integer not null default 0
);
create index group_members_group_idx on public.group_members (group_id);

-- Join codes: 6 characters without the look-alikes O, 0, I, and 1 (F-13).
create function public.generate_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * 32)::int, 1);
    end loop;
    -- Codes stay valid as long as the bill exists, so they are unique across all bills.
    exit when not exists (select 1 from public.bills b where b.join_code = code);
  end loop;
  return code;
end;
$$;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 60),
  bill_date date not null default current_date,
  join_code text not null unique default public.generate_join_code()
    check (join_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  payer_participant_id uuid,
  service_pct numeric(5, 2) not null default 0 check (service_pct between 0 and 100),
  tax_pct numeric(5, 2) not null default 0 check (tax_pct between 0 and 100),
  tax_after_service boolean not null default true,
  discount_type text not null default 'amount' check (discount_type in ('amount', 'percent')),
  discount_value numeric(12, 2) not null default 0 check (
    discount_value >= 0
    and (
      (discount_type = 'amount' and discount_value <= 100000000)
      or (discount_type = 'percent' and discount_value <= 100)
    )
  ),
  extra_fee bigint not null default 0 check (extra_fee between 0 and 100000000),
  rounding_step integer not null default 100 check (rounding_step in (1, 100, 500, 1000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bills_owner_idx on public.bills (owner_id);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 30),
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Filled once someone claims this name (F-14).
  profile_id uuid references public.profiles (id) on delete set null,
  paid_at timestamptz,
  paid_marked_by uuid references public.profiles (id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  -- Lets items, shares, and the payer reference a participant of the same bill.
  unique (id, bill_id)
);
-- No duplicate names in a bill (F-02), case-insensitive.
create unique index participants_name_per_bill on public.participants (bill_id, lower(btrim(display_name)));
-- One account claims at most one name per bill (F-14).
create unique index participants_claim_per_bill on public.participants (bill_id, profile_id)
  where profile_id is not null;
create index participants_profile_idx on public.participants (profile_id);

-- The payer must be a participant of the same bill; removing them clears the payer only.
alter table public.bills
  add constraint bills_payer_fk foreign key (payer_participant_id, id)
  references public.participants (id, bill_id) on delete set null (payer_participant_id);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  unit_price bigint not null check (unit_price between 0 and 100000000),
  qty integer not null check (qty between 1 and 999),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, bill_id)
);
create index items_bill_idx on public.items (bill_id);

-- Who ate what. bill_id is stored here (a deviation from the original PRD table) so realtime
-- can filter by bill and so both foreign keys guarantee item and eater share one bill.
create table public.item_shares (
  bill_id uuid not null,
  item_id uuid not null,
  participant_id uuid not null,
  primary key (item_id, participant_id),
  foreign key (item_id, bill_id) references public.items (id, bill_id) on delete cascade,
  foreign key (participant_id, bill_id) references public.participants (id, bill_id) on delete cascade
);
create index item_shares_bill_idx on public.item_shares (bill_id);
create index item_shares_participant_idx on public.item_shares (participant_id);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  participant_id uuid not null,
  sent_at timestamptz not null default now(),
  foreign key (participant_id, bill_id) references public.participants (id, bill_id) on delete cascade
);
create index reminders_bill_idx on public.reminders (bill_id);

-- ---------------------------------------------------------------------------
-- Membership helpers. security definer so policies can check membership without
-- recursing into each other's RLS. They only answer true or false.
-- ---------------------------------------------------------------------------

create function public.is_bill_owner(p_bill_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bills b
    where b.id = p_bill_id and b.owner_id = (select auth.uid())
  );
$$;

create function public.is_bill_member(p_bill_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bills b
    where b.id = p_bill_id and b.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.participants p
    where p.bill_id = p_bill_id and p.profile_id = (select auth.uid())
  );
$$;

create function public.is_my_participant(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants p
    where p.id = p_participant_id and p.profile_id = (select auth.uid())
  );
$$;

-- True when the current user and p_profile_id are members of at least one common bill.
create function public.shares_bill_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with my_bills as (
    select b.id from public.bills b where b.owner_id = (select auth.uid())
    union
    select p.bill_id from public.participants p where p.profile_id = (select auth.uid())
  )
  select exists (
    select 1 from my_bills m
    join public.bills b on b.id = m.id
    where b.owner_id = p_profile_id
  ) or exists (
    select 1 from my_bills m
    join public.participants p on p.bill_id = m.id
    where p.profile_id = p_profile_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger bills_touch before update on public.bills
  for each row execute function public.touch_updated_at();

-- Owner and join code never change after creation.
create function public.bills_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'BILL_OWNER_IMMUTABLE';
  end if;
  if new.join_code is distinct from old.join_code then
    raise exception 'JOIN_CODE_IMMUTABLE';
  end if;
  return new;
end;
$$;

create trigger bills_guard before update on public.bills
  for each row execute function public.bills_guard();

-- Column rules RLS cannot express:
-- * a participant who is not the owner may only change their own payment status, apart from
--   claiming an unclaimed name for themselves (reachable only via claim_participant);
-- * the owner may link a row only to their own account (or unlink it);
-- * a row never moves to another bill.
create function public.participants_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if new.profile_id is not null and new.profile_id is distinct from uid then
      raise exception 'CANNOT_LINK_OTHER_ACCOUNT';
    end if;
    return new;
  end if;

  if new.bill_id is distinct from old.bill_id then
    raise exception 'PARTICIPANT_BILL_IMMUTABLE';
  end if;

  if public.is_bill_owner(old.bill_id) then
    if new.profile_id is distinct from old.profile_id
       and new.profile_id is not null and new.profile_id is distinct from uid then
      raise exception 'CANNOT_LINK_OTHER_ACCOUNT';
    end if;
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id
     and not (old.profile_id is null and new.profile_id = uid) then
    raise exception 'CANNOT_LINK_OTHER_ACCOUNT';
  end if;
  if new.display_name is distinct from old.display_name
     or new.color is distinct from old.color
     or new.position is distinct from old.position then
    raise exception 'PARTICIPANT_CAN_ONLY_CHANGE_PAYMENT_STATUS';
  end if;
  if new.paid_marked_by is not null and new.paid_marked_by is distinct from uid then
    raise exception 'PAID_MARKED_BY_MUST_BE_YOU';
  end if;
  return new;
end;
$$;

create trigger participants_guard before insert or update on public.participants
  for each row execute function public.participants_guard();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.payment_methods enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.bills enable row level security;
alter table public.participants enable row level security;
alter table public.items enable row level security;
alter table public.item_shares enable row level security;
alter table public.reminders enable row level security;

-- profiles
create policy "profiles: see yourself and people in your bills" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_bill_with(id));
create policy "profiles: create your own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: update your own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- bills
create policy "bills: members can read" on public.bills
  for select to authenticated
  using (public.is_bill_member(id));
create policy "bills: create as yourself" on public.bills
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "bills: owner can update" on public.bills
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "bills: owner can delete" on public.bills
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- participants
create policy "participants: members can read" on public.participants
  for select to authenticated
  using (public.is_bill_member(bill_id));
create policy "participants: owner can add" on public.participants
  for insert to authenticated
  with check (public.is_bill_owner(bill_id));
create policy "participants: owner or the person themselves can update" on public.participants
  for update to authenticated
  using (public.is_bill_owner(bill_id) or profile_id = (select auth.uid()))
  with check (public.is_bill_owner(bill_id) or profile_id = (select auth.uid()));
create policy "participants: owner can delete" on public.participants
  for delete to authenticated
  using (public.is_bill_owner(bill_id));

-- items
create policy "items: members can read" on public.items
  for select to authenticated
  using (public.is_bill_member(bill_id));
create policy "items: owner can add" on public.items
  for insert to authenticated
  with check (public.is_bill_owner(bill_id));
create policy "items: owner can update" on public.items
  for update to authenticated
  using (public.is_bill_owner(bill_id))
  with check (public.is_bill_owner(bill_id));
create policy "items: owner can delete" on public.items
  for delete to authenticated
  using (public.is_bill_owner(bill_id));

-- item_shares
create policy "item_shares: members can read" on public.item_shares
  for select to authenticated
  using (public.is_bill_member(bill_id));
create policy "item_shares: owner, or a participant for their own name, can add" on public.item_shares
  for insert to authenticated
  with check (public.is_bill_owner(bill_id) or public.is_my_participant(participant_id));
create policy "item_shares: owner, or a participant for their own name, can remove" on public.item_shares
  for delete to authenticated
  using (public.is_bill_owner(bill_id) or public.is_my_participant(participant_id));

-- groups (local only until phase 6)
create policy "groups: owner only" on public.groups
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "group_members: group owner only" on public.group_members
  for all to authenticated
  using (exists (
    select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.groups g where g.id = group_id and g.owner_id = (select auth.uid())
  ));

-- payment_methods (phase 4)
create policy "payment_methods: owner and people in the same bill can read" on public.payment_methods
  for select to authenticated
  using (profile_id = (select auth.uid()) or public.shares_bill_with(profile_id));
create policy "payment_methods: owner can add" on public.payment_methods
  for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "payment_methods: owner can update" on public.payment_methods
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy "payment_methods: owner can delete" on public.payment_methods
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- reminders (phase 4)
create policy "reminders: bill owner and the reminded person can read" on public.reminders
  for select to authenticated
  using (public.is_bill_owner(bill_id) or public.is_my_participant(participant_id));
create policy "reminders: bill owner can send" on public.reminders
  for insert to authenticated
  with check (public.is_bill_owner(bill_id));

-- ---------------------------------------------------------------------------
-- Join and claim (F-13, F-14). Errors are raised as stable codes the app maps to messages.
-- ---------------------------------------------------------------------------

create function public.normalize_join_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
$$;

-- Preview of a bill by join code, without opening the bills table to everyone.
create function public.join_bill(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := public.normalize_join_code(p_code);
  v_bill public.bills%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_code !~ '^[A-HJ-NP-Z2-9]{6}$' then
    raise exception 'JOIN_CODE_INVALID';
  end if;

  select * into v_bill from public.bills b where b.join_code = v_code;
  if not found then
    raise exception 'JOIN_CODE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'bill_id', v_bill.id,
    'title', v_bill.title,
    'bill_date', v_bill.bill_date,
    'is_owner', v_bill.owner_id = v_uid,
    'payer_name', (
      select p.display_name from public.participants p where p.id = v_bill.payer_participant_id
    ),
    'participant_count', (select count(*) from public.participants p where p.bill_id = v_bill.id),
    'my_participant_id', (
      select p.id from public.participants p where p.bill_id = v_bill.id and p.profile_id = v_uid
    ),
    'unclaimed', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', p.id, 'display_name', p.display_name, 'color', p.color)
        order by p.position, p.created_at
      )
      from public.participants p
      where p.bill_id = v_bill.id and p.profile_id is null
    ), '[]'::jsonb),
    'colors_in_use', coalesce((
      select jsonb_agg(p.color) from public.participants p where p.bill_id = v_bill.id
    ), '[]'::jsonb)
  );
end;
$$;

-- Claim an unclaimed name. Also used by the owner to answer "Kamu yang mana?".
create function public.claim_participant(p_participant_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_target public.participants%rowtype;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_target from public.participants p where p.id = p_participant_id for update;
  if not found then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;
  if v_target.profile_id = v_uid then
    return v_target.bill_id;
  end if;
  if v_target.profile_id is not null then
    raise exception 'NAME_ALREADY_CLAIMED';
  end if;
  if exists (
    select 1 from public.participants p
    where p.bill_id = v_target.bill_id and p.profile_id = v_uid
  ) then
    raise exception 'ALREADY_JOINED';
  end if;

  update public.participants p set profile_id = v_uid where p.id = v_target.id;
  return v_target.bill_id;
end;
$$;

-- Join a bill under a new name (F-14 "menambah nama baru").
create function public.join_as_new_participant(p_code text, p_display_name text, p_color text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_code text := public.normalize_join_code(p_code);
  v_name text := regexp_replace(btrim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
  v_bill_id uuid;
  v_new_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select b.id into v_bill_id from public.bills b where b.join_code = v_code;
  if not found then
    raise exception 'JOIN_CODE_NOT_FOUND';
  end if;
  if char_length(v_name) not between 1 and 30 then
    raise exception 'NAME_INVALID';
  end if;
  if p_color is null or p_color !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'COLOR_INVALID';
  end if;
  if exists (
    select 1 from public.participants p where p.bill_id = v_bill_id and p.profile_id = v_uid
  ) then
    raise exception 'ALREADY_JOINED';
  end if;
  if exists (
    select 1 from public.participants p
    where p.bill_id = v_bill_id and lower(btrim(p.display_name)) = lower(v_name)
  ) then
    raise exception 'NAME_TAKEN';
  end if;

  insert into public.participants (bill_id, display_name, color, profile_id, position)
  values (
    v_bill_id,
    v_name,
    p_color,
    v_uid,
    coalesce((select max(p.position) + 1 from public.participants p where p.bill_id = v_bill_id), 0)
  )
  returning id into v_new_id;

  return jsonb_build_object('bill_id', v_bill_id, 'participant_id', v_new_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges: signed-in users only (anonymous accounts are "authenticated").
-- ---------------------------------------------------------------------------

revoke execute on function
  public.generate_join_code(),
  public.is_bill_owner(uuid),
  public.is_bill_member(uuid),
  public.is_my_participant(uuid),
  public.shares_bill_with(uuid),
  public.normalize_join_code(text),
  public.join_bill(text),
  public.claim_participant(uuid),
  public.join_as_new_participant(text, text, text)
from public, anon;

grant execute on function
  public.generate_join_code(),
  public.is_bill_owner(uuid),
  public.is_bill_member(uuid),
  public.is_my_participant(uuid),
  public.shares_bill_with(uuid),
  public.normalize_join_code(text),
  public.join_bill(text),
  public.claim_participant(uuid),
  public.join_as_new_participant(text, text, text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (F-15): changes to a bill's rows are pushed to members, filtered by RLS.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime
  add table public.bills, public.participants, public.items, public.item_shares;
