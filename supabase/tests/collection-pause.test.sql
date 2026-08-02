-- R4: pgTAP tests for the real collection pause (public.collection_controls
-- singleton + public.is_collection_paused()).
-- Proves: the singleton row exists and defaults to unpaused, the function
-- tracks the row, the server-only boundary holds (anon can neither execute
-- the function nor read the table), the paused column is NOT NULL default
-- false, and the table is documented.
-- Run via `supabase test db`.

begin;
select plan(10);

create extension if not exists pgtap;
set search_path to public, extensions, "$user", pg_catalog;
grant iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor to current_user;

-- 1. The singleton table exists.
select is(
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name = 'collection_controls'),
  1::bigint,
  'collection_controls table exists'
);

-- 2. Exactly one row, id = 1, seeded unpaused with an updated_at stamp.
select is(
  (select count(*) from public.collection_controls
    where id = 1 and paused = false and updated_at is not null),
  1::bigint,
  'singleton row id=1 exists and starts unpaused'
);

-- 3. The function reports false while collection is open.
select is(
  public.is_collection_paused(),
  false,
  'is_collection_paused() is false initially'
);

-- 4. Flipping the singleton row pauses collection.
update public.collection_controls
   set paused = true, reason = 'pgTAP synthetic pause', paused_at = now()
 where id = 1;

select is(
  public.is_collection_paused(),
  true,
  'is_collection_paused() is true after the singleton row is paused'
);

-- 5. Flipping back resumes collection.
update public.collection_controls
   set paused = false, reason = null, paused_at = null
 where id = 1;

select is(
  public.is_collection_paused(),
  false,
  'is_collection_paused() is false after resuming'
);

-- 6. Anon cannot execute the function (server-only boundary, service role only).
set local role iraac_anon;
select throws_ok(
  $$select public.is_collection_paused()$$,
  null, null,
  'anon cannot execute is_collection_paused'
);
reset role;

-- 7. Anon cannot read the control row (no select grant, RLS deny-by-default).
set local role iraac_anon;
select throws_ok(
  $$select * from public.collection_controls$$,
  null, null,
  'anon cannot read collection_controls'
);
reset role;

-- 8. The paused column is NOT NULL.
select is(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'collection_controls'
      and column_name = 'paused'),
  'NO',
  'paused column is NOT NULL'
);

-- 9. The paused column defaults to false.
select is(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'collection_controls'
      and column_name = 'paused'),
  'false',
  'paused column defaults to false'
);

-- 10. The table carries a documentation comment.
select ok(
  obj_description('public.collection_controls'::regclass) is not null,
  'collection_controls has a comment'
);

select * from finish();
rollback;
