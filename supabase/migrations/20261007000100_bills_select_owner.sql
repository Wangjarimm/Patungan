-- INSERT ... RETURNING also checks the SELECT policy against the new row. is_bill_member()
-- reads bills with the statement's starting snapshot, so it cannot see a bill being created
-- and the insert was rejected. Checking owner_id on the row itself fixes that; who may read
-- a bill is unchanged (the owner is always a member).

drop policy "bills: members can read" on public.bills;

create policy "bills: members can read" on public.bills
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_bill_member(id));
