# AGENTS.md — IRAAC Platform

This repository is the **private** IRAAC listening platform: survey intake,
consent, campaign, reporting and audit. Read this file and
`PRODUCTION_LAUNCH_PLAN.md` before touching anything. The public website lives
in `rhy-collab/iraac-website` — do not mix them.

## Operating model

IRAAC's product loop: **You share → We listen → We recommend to government →
We report back.** Every feature must strengthen one of those four steps.

## Hard rules for every agent

- **No real outreach.** No production email, SMS or call. Ever, from a dev
  environment.
- **Synthetic data only** in this repo until a release gate is approved.
  No contact list, real response, credential or recovery material in prompts,
  commits, logs or screenshots.
- **No secrets** in code, prompts or commits. Use environment-scoped secrets.
- **No force-push, no direct `main` work.** One work order per branch; open a
  draft PR early.
- **No self-approval.** Agents propose; named humans approve merges, campaigns,
  consent wording and reports.
- **Migrations are append-only** and never rewritten after merge.
- **Stop lines from the roadmap apply** (see §11 and the build superprompt):
  never infer consent, never treat survey completion as consent, never treat a
  public listing as blanket permission.

## Reading order when you join

1. `AGENTS.md` (this file)
2. `PRODUCTION_LAUNCH_PLAN.md`
3. `ROADMAP.md` sections relevant to your work order
4. Current ADRs in `docs/adr/`
5. Current branch, PR, CI and deployment state

## Work orders

Every piece of work is a work order following the template in
`docs/templates/work-order.md`. Claim a task in `BOT_TASKS.md` before
starting. One task, one branch, one file set per agent.

## Verification

Do not mark work complete without: unit/integration tests, contract tests,
RLS/role tests, accessibility/mobile tests, secret scan, and a manual review
of the diff. Evidence links go in the work order before completion.
