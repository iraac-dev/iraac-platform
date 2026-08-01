-- DATA-001 / SEC-001: initial schema — extensions, roles, and helper functions.
-- Append-only: never edit a merged migration; add a new one.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- Roles: least privilege, separated from postgres.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'iraac_anon') then
    create role iraac_anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_authenticated') then
    create role iraac_authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_staff') then
    create role iraac_staff nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'iraac_auditor') then
    create role iraac_auditor nologin;
  end if;
end $$;

grant usage on schema public to iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor;

-- RLS helper: deny by default is the absence of policies; this just documents intent.
comment on schema public is 'IRAAC listening platform. RLS deny-by-default: every table enables RLS and grants only explicit, tested policies.';
