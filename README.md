# IRAAC Platform

Private listening platform for IRAAC: survey intake, consent, campaign,
reporting and audit.

**This repository is private and contains governed code, not real community
data.** Development uses synthetic fixtures only.

Read `AGENTS.md` and `PRODUCTION_LAUNCH_PLAN.md` before contributing.

## Repository layout (target)

```
apps/
  admin/                 # Next.js staff/admin/operator UI
  api/                   # server-only API/control plane
workers/
  campaigns/             # durable journey and report workers
packages/
  contracts/             # schemas, OpenAPI, typed tool contracts
  consent/               # eligibility and consent evaluator
  surveys/               # canonical survey definitions/validation
  reporting/             # deterministic aggregates and templates
  provider-adapters/     # email, SMS and voice interfaces
  ui/                    # shared accessible components
supabase/
  migrations/
  seed/                  # synthetic data only
docs/
  adr/
  compliance/
  privacy/
  runbooks/
BOT_TASKS.md
AGENTS.md
```

## Status

Foundation (PLAT-001). See `PRODUCTION_LAUNCH_PLAN.md` for the work
programme and release gates.
