---
id: CAMP-001
title: campaign eligibility engine
owner: Rhys Coombes
implementer: hermes
independent_reviewer: named human
risk: medium
data_classification: synthetic
depends_on: [REL-P1]
goal: Build deterministic eligibility service with audience snapshot, approval token, immutable manifest and emergency pause
non_goals:
  - Provider integration (SES/SMS) — separate work package
  - Campaign template/content editing UI
  - Real contact import or outreach
files:
  - supabase/migrations/20260801001500_camp_001_campaign_eligibility.sql
  - supabase/tests/campaign.test.sql
  - docs/work-orders/2026-08-02-camp-001-campaign-eligibility.md
acceptance_tests:
  - pgTAP 37 tests pass: eligibility logic, audience build, approval, pause
  - App tests unaffected (114/114 pass)
  - Lint/typecheck/build clean
  - DB schema lint clean
human_decisions:
  - Campaign content approval
  - Production campaign activation
rollback: pgmigrate down from 20260801001500
evidence:
  - pgTAP: 37/37 pass
  - App tests: 114/114 pass
  - DB lint: clean
  - Build: clean
---

## CAMP-001 — Campaign eligibility engine

### What this builds

The core eligibility engine that answers "who should receive this campaign?"
for every future outreach channel. It does NOT send anything — it's the
deterministic decision layer that providers consume.

### Schema additions (migration 20260801001500)

- **campaign_type enum** — newsletter / survey_chase
- **campaign_channel enum** — email / sms
- **campaigns table extended** — campaign_type, description, content_preview,
  immutable flag, updated_at
- **campaign_audience_records** — immutable per-recipient snapshot with
  eligibility audit trail
- **campaign_pause_controls** — singleton emergency pause

### Key functions

- `check_person_eligibility(person_id, channel, campaign_id?)` — returns
  eligible/blocked with reasons (consent, suppression, active contact,
  duplicate send)
- `build_campaign_audience(campaign_id)` — snapshots all eligible recipients
  into immutable audience records; marks campaign as immutable
- `approve_campaign(campaign_id, approved_by)` — records named human approval;
  no agent can self-approve
- `is_campaign_paused()` — emergency pause check
