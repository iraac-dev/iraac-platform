/**
 * Generate the append-only migration that inserts the approved Have Your Say
 * V1 release into Supabase from the canonical contract.
 *
 * Run: npx tsx scripts/generate-v1-release-migration.ts
 * Output: supabase/migrations/20260801000600_survey_v1_release.sql
 *
 * The migration is generated from the same source of truth as the app
 * (@iraac/survey-contract), so the DB definition, content hash and question
 * rows cannot drift from the frozen contract. It is append-only: rerunning
 * after merge would require a successor migration, never an edit.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalize, contentHash, SURVEY_V1, SURVEY_V1_HASH } from "../src/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "..", "..", "supabase", "migrations", "20260801000600_survey_v1_release.sql");

const canonicalJson = JSON.stringify(canonicalize(SURVEY_V1));
const hash = contentHash(SURVEY_V1);

if (hash !== SURVEY_V1_HASH) {
  throw new Error(`Hash mismatch: computed ${hash}, expected ${SURVEY_V1_HASH} — contract mutated!`);
}

const lines: string[] = [];
lines.push("-- SURV-002: insert approved Have Your Say V1 release (append-only).");
lines.push("-- Generated from @iraac/survey-contract (canonical definition + hash).");
lines.push("-- Do not edit by hand; regenerate from the contract if a successor is approved.");
lines.push("");
lines.push("-- Idempotency: a client token pins one session; duplicate submit returns the same completion.");
lines.push("alter table public.survey_sessions add column if not exists client_token uuid;");
lines.push("");
lines.push("create unique index if not exists survey_sessions_client_token_key");
lines.push("  on public.survey_sessions (client_token) where client_token is not null;");
lines.push("");
lines.push("-- Table grants: policies are dead code without privileges. SEC-001 created");
lines.push("-- policies but never granted table privileges to the roles; this makes the");
lines.push("-- anonymous submission path actually usable and the RLS test suite runnable.");
lines.push("-- Pattern: roles get table privileges; RLS policies do the row filtering");
lines.push("-- (anon SELECT on protected tables returns zero rows by default-deny).");
lines.push("grant select on public.people, public.organisations, public.organisation_contacts,");
lines.push("  public.contact_points, public.data_sources, public.source_records,");
lines.push("  public.consent_wording_versions, public.consent_events, public.consent_state,");
lines.push("  public.suppression_events, public.survey_definitions, public.survey_versions,");
lines.push("  public.survey_questions, public.survey_sessions, public.survey_answers,");
lines.push("  public.audit_events, public.campaigns, public.contact_attempts,");
lines.push("  public.provider_events to iraac_anon, iraac_authenticated;");
lines.push("");
lines.push("grant insert on public.survey_sessions to iraac_anon, iraac_authenticated;");
lines.push("grant insert on public.survey_answers to iraac_anon, iraac_authenticated;");
lines.push("");
lines.push("grant select, insert, update, delete on public.people, public.organisations,");
lines.push("  public.organisation_contacts, public.contact_points, public.data_sources,");
lines.push("  public.source_records, public.consent_wording_versions, public.consent_events,");
lines.push("  public.suppression_events, public.survey_definitions, public.survey_versions,");
lines.push("  public.survey_questions, public.survey_sessions, public.survey_answers,");
lines.push("  public.campaigns, public.contact_attempts, public.provider_events");
lines.push("  to iraac_staff;");
lines.push("");
lines.push("grant select on public.consent_state to iraac_staff;");
lines.push("grant select on public.audit_events to iraac_staff;");
lines.push("");
lines.push("-- Staff RLS policies for survey definition tables (grants alone are not");
lines.push("-- enough: RLS returns zero rows without a matching policy). The SEC-001");
lines.push("-- migration only added staff read policies for sessions and answers.");
lines.push("create policy \"staff read survey definitions\" on public.survey_definitions for select to iraac_staff using (true);");
lines.push("create policy \"staff read survey versions\" on public.survey_versions for select to iraac_staff using (true);");
lines.push("create policy \"staff read survey questions\" on public.survey_questions for select to iraac_staff using (true);");
lines.push("");
lines.push("grant select on public.people, public.organisations, public.organisation_contacts,");
lines.push("  public.contact_points, public.data_sources, public.source_records,");
lines.push("  public.consent_wording_versions, public.consent_events, public.consent_state,");
lines.push("  public.suppression_events, public.survey_definitions, public.survey_versions,");
lines.push("  public.survey_questions, public.survey_sessions, public.survey_answers,");
lines.push("  public.audit_events, public.campaigns, public.contact_attempts,");
lines.push("  public.provider_events to iraac_auditor;");
lines.push("");
lines.push("-- Schema usage: the platform roles must resolve extension functions");
lines.push("-- (pgcrypto, pgTAP) which live in the extensions schema. Without this,");
lines.push("-- SET ROLE into a platform role breaks function resolution.");
lines.push("grant usage on schema extensions to iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor;");
lines.push("");
lines.push("-- V1 definition row (slug already exists in seed; guard against double-insert).");
lines.push("insert into public.survey_definitions (id, slug, title) values");
lines.push("  ('10000000-0000-0000-0000-000000000001', 'have-your-say', 'Have Your Say — V1')");
lines.push("on conflict (slug) do nothing;");
lines.push("");
lines.push("-- V1 release: canonical definition JSON + approved semantic hash. Status stays 'draft'");
lines.push("-- until the full release gate passes; a campaign pinning this release activates it.");
lines.push("insert into public.survey_versions (id, survey_id, version, definition, content_hash, status, released_at) values");
lines.push("  ('10000000-0000-0000-0000-000000000002',");
lines.push("   '10000000-0000-0000-0000-000000000001',");
lines.push("   1,");
lines.push(`   '${canonicalJson.replaceAll("'", "''")}',`);
lines.push(`   '${hash}',`);
lines.push("   'draft',");
lines.push("   now())");
lines.push("on conflict (survey_id, version) do nothing;");
lines.push("");

// Question rows: one per question, stable question_key = stable ID.
// IDs are gen_random_uuid(); idempotency comes from the unique constraint
// on (survey_id, question_key).
const sqlLiteral = (s: string) => `'${s.replaceAll("'", "''")}'`;
for (const section of SURVEY_V1.sections) {
  for (const q of section.questions) {
    const optionsJson = q.options ? JSON.stringify(q.options) : "null";
    lines.push(`insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values`);
    lines.push(`  (gen_random_uuid(),`);
    lines.push(`   '10000000-0000-0000-0000-000000000001',`);
    lines.push(`   ${sqlLiteral(q.id)},`);
    lines.push(`   ${sqlLiteral(q.text)},`);
    lines.push(`   '${q.type}',`);
    lines.push(`   '${optionsJson.replaceAll("'", "''")}',`);
    lines.push(`   ${q.required})`);
    lines.push(`on conflict (survey_id, question_key) do nothing;`);
    lines.push("");
  }
}
// Contact permissions are NOT survey_questions; they are stored in the
// definition JSON and become consent wording versions at CONS-001 time.

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`Wrote ${OUT}`);
console.log(`Release hash: ${hash}`);
console.log(`Questions: ${SURVEY_V1.sections.reduce((n, s) => n + s.questions.length, 0)}`);
