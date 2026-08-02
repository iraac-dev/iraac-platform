# Work order — R3 protected control plane: server-managed membership

- id: IRAAC-R3
- title: Server-managed staff membership, expiry, revocation, invitations,
  MFA recovery, offboarding and narrow authorization
- owner: named human (Rhys Coombes)
- implementer: hermes (delegated agents) + codex integrated branch
- independent_reviewer: codex (PR #8 review) / named human merge
- risk: high (admin access boundary)
- data_classification: synthetic
- depends_on: R2, SEC-001, ADMIN-001, P1-CORR-001
- goal: stop treating the JWT `app_metadata.iraac_role` claim as sufficient.
  Add private application membership rows that bind a named Supabase Auth
  user to an organisation/role with active/expired/revoked state, and make
  every dashboard query server-authorize against those rows. Complete the
  invitation register, MFA recovery, offboarding (revoke sessions + mark
  inactive), and audited administrative actions. Service-role queries must
  never let a role claim become unrestricted data access.
- non_goals: no public auth changes, no real staff invitations (human gate),
  no SMS MFA
- files: supabase/migrations/20260801001200_r3_control_plane.sql (NEW),
  apps/admin/src/lib/{admin-guard,supabase-server,admin-queries}.ts,
  staff-sign-in flow, apps/admin/src/app/admin/* pages (only where the guard
  API changes), supabase/tests/control-plane.test.sql (NEW)
- acceptance_tests:
  - pgTAP: membership rows enforce active/expiry/revocation; an AAL2 user
    whose membership is expired/revoked/inactive is denied by the guard;
    invitations are single-use and expire; offboarding revokes sessions and
    marks membership inactive; every admin action writes an audit event
  - app: getAdminSession returns the role only from an active, unexpired
    membership row — never from app_metadata alone; a user with a stale role
    claim and no membership row is denied
- human_decisions: real named invitations remain a REL-P1 human gate
- rollback: revert R3 commits; append-only migration never rewritten
- evidence: local gate output + GitHub Actions run recorded on PR #8
