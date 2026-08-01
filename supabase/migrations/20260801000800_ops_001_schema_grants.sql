-- OPS-001: grant schema usage to the standard Supabase REST roles.
--
-- Local `supabase db reset` bootstraps the public schema, but the repo's
-- migrations only granted usage to the custom iraac_* roles. The REST roles
-- (anon, authenticated, service_role) therefore cannot enter the schema after
-- a fresh reset — every API route (survey submit, consent, health) fails with
-- "permission denied for schema public". Production has these grants from the
-- project bootstrap; this migration makes a fresh local stack behave the
-- same, idempotently. Append-only; do not edit after merge.

grant usage on schema public to anon, authenticated, service_role;

-- Table privileges for the standard REST roles, matching what Supabase's
-- project bootstrap provides at creation (production already has these; a
-- fresh local `db reset` does not). Safe under deny-by-default: there are no
-- RLS policies `to anon`/`to authenticated`, so reads are still filtered to
-- zero rows — grants alone never bypass RLS. The app's server-side writes go
-- through service_role (bypasses RLS), which is the documented pattern.
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Default privileges so future tables remain reachable by the REST roles.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
