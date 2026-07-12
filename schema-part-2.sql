-- ============================================================
-- Client Tracker — Schema Part 2
-- Run this AFTER schema.sql (the one from earlier), in the same
-- SQL Editor. This adds assigned workouts (what you prescribe to
-- a client) and the invite-code function that links a client's
-- own signup to the profile you already created for them.
-- ============================================================

-- ------------------------------------------------------------
-- ASSIGNED WORKOUTS
-- What you've prescribed to a client — separate from exercise_logs,
-- which is what actually happened.
-- ------------------------------------------------------------
create table assigned_workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  exercise text not null,
  target_sets int,
  target_reps int,
  notes text,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table assigned_workouts enable row level security;

create policy "coach manages assigned workouts" on assigned_workouts for all
  using (exists (
    select 1 from clients c
    where c.id = assigned_workouts.client_id and c.coach_id = auth.uid()
  ));
create policy "client views own assigned workouts" on assigned_workouts for select
  using (exists (
    select 1 from clients c
    where c.id = assigned_workouts.client_id and c.client_auth_id = auth.uid()
  ));

create index idx_assigned_client on assigned_workouts(client_id);

-- ------------------------------------------------------------
-- INVITE CODE LINKING
-- When a client signs up with the invite code you gave them (their
-- client record's ID), this safely links their new login to that
-- existing record — and only that record, and only once.
-- ------------------------------------------------------------
create or replace function public.claim_client_invite(invite_code uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update clients
  set client_auth_id = auth.uid()
  where id = invite_code and client_auth_id is null;

  if not found then
    raise exception 'Invalid or already-used invite code';
  end if;
end;
$$;

grant execute on function public.claim_client_invite(uuid) to authenticated;
