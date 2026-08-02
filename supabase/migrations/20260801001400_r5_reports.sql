-- R5: governed reports — de-identified, versioned, publication-controlled.
-- Builds the report pipeline that MUST exist before any outbound
-- communications (R6 email / R7 SMS / R8 voice). Append-only migration.
--
-- Model:
--   report_dataset_snapshots  — one locked, immutable base dataset snapshot
--                               (the single source for all derived views)
--   report_derived_views      — audience-specific (community_public /
--                               staff_partner / government) materialised
--                               aggregations of the snapshot, WITH small-cell
--                               suppression applied at write time
--   report_documents          — human-authored report artefacts (markdown),
--                               versioned, with an immutable lifecycle
--   report_document_versions  — append-only immutable versions of documents
--   report_exceptions         — items flagged for human review (exception queue)
--   report_feedback           — UNTRUSTED inbound feedback (email replies
--                               etc.); never an approval signal
--
-- Provenance rule: every report_documents row carries
-- dataset_snapshot_id + content_hash + version; the snapshot carries
-- source_commit + source_migration so a report can be traced back to the
-- exact data and code that produced it.

-- ---------------------------------------------------------------------------
-- 1. Dataset snapshots (locked base)
-- ---------------------------------------------------------------------------
create table public.report_dataset_snapshots (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  source_commit text not null,          -- git commit of the producing code
  source_migration text not null,       -- migration/script that built it
  row_count bigint not null check (row_count >= 0),
  content_hash text not null,           -- sha256 of the snapshot payload
  status text not null default 'draft'
    check (status in ('draft', 'dataset_ready', 'approved_locked', 'retired')),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid
);

create index on public.report_dataset_snapshots (status);
create index on public.report_dataset_snapshots (content_hash);

alter table public.report_dataset_snapshots enable row level security;

comment on table public.report_dataset_snapshots is
  'One locked, immutable base dataset snapshot. All derived views read from it. content_hash ties reports to the exact data that produced them.';

-- ---------------------------------------------------------------------------
-- 2. Derived views with small-cell suppression
-- ---------------------------------------------------------------------------
create table public.report_derived_views (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.report_dataset_snapshots(id) on delete cascade,
  audience text not null
    check (audience in ('community_public', 'staff_partner', 'government')),
  view_key text not null,               -- e.g. 'responses_by_region'
  dimension_key text not null,          -- e.g. region value
  metric_name text not null,            -- e.g. 'respondents'
  metric_value numeric not null,
  suppressed boolean not null default false,   -- true when small-cell rule applied
  small_cell_reason text,
  created_at timestamptz not null default now(),
  unique (snapshot_id, audience, view_key, dimension_key, metric_name)
);

create index on public.report_derived_views (snapshot_id, audience, view_key);
create index on public.report_derived_views (suppressed);

alter table public.report_derived_views enable row level security;

comment on table public.report_derived_views is
  'Audience-specific derived aggregations of a locked snapshot. suppressed=true marks cells hidden by small-cell protection (counts below the threshold are never exposed); government views may carry the full counts, community_public views never do.';

-- Small-cell threshold helper: any cell with a count under 5 must be
-- suppressed in non-government views. The insert path (RPC) applies it; the
-- helper exists so tests and future tooling share one definition.
create or replace function public.report_small_cell_threshold()
returns integer
language sql
immutable
set search_path = public
as $$ select 5 $$;

comment on function public.report_small_cell_threshold() is
  'Small-cell suppression threshold: counts below this are never exposed outside government views.';

-- ---------------------------------------------------------------------------
-- 3. Report documents + immutable versions + lifecycle
-- ---------------------------------------------------------------------------
create table public.report_documents (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.report_dataset_snapshots(id) on delete restrict,
  title text not null,
  audience text not null
    check (audience in ('community_public', 'staff_partner', 'government')),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved_locked', 'published', 'retracted')),
  published_at timestamptz,
  retracted_at timestamptz,
  retract_reason text,
  current_version int not null default 0,
  content_hash text not null,           -- sha256 of current content
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);

create index on public.report_documents (audience, status);
create index on public.report_documents (snapshot_id);

alter table public.report_documents enable row level security;

create table public.report_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.report_documents(id) on delete cascade,
  version int not null,
  content text not null,                -- full markdown at this version
  content_hash text not null,           -- sha256 of content
  change_note text,
  created_at timestamptz not null default now(),
  created_by uuid,
  unique (document_id, version)
);

create index on public.report_document_versions (document_id, version);

alter table public.report_document_versions enable row level security;

comment on table public.report_document_versions is
  'Append-only immutable versions of a report document. Versions are never rewritten; a published document must point at a version row that cannot change.';

comment on table public.report_documents is
  'Human-authored report artefacts. Lifecycle: draft -> in_review -> approved_locked -> published (or retracted). A named human approves each publication; no automated path publishes.';

-- ---------------------------------------------------------------------------
-- 4. Exception queue + untrusted feedback
-- ---------------------------------------------------------------------------
create table public.report_exceptions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.report_documents(id) on delete cascade,
  kind text not null check (kind in ('small_cell_override', 'data_anomaly', 'source_mismatch', 'other')),
  description text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  raised_at timestamptz not null default now(),
  raised_by uuid,
  resolved_at timestamptz,
  resolution text
);

alter table public.report_exceptions enable row level security;

create table public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.report_documents(id) on delete cascade,
  channel text not null check (channel in ('email_reply', 'portal', 'other')),
  raw_body text not null,               -- UNTRUSTED text, never executed
  received_at timestamptz not null default now(),
  is_approval boolean not null default false,  -- feedback NEVER equals approval
  handled_at timestamptz,
  handling_note text
);

alter table public.report_feedback enable row level security;

comment on table public.report_feedback is
  'UNTRUSTED inbound feedback (e.g. email replies to report recipients). Stored for the human review queue. is_approval is always false on ingest — an email reply can never approve a publication; only a named human action in the dashboard can.';

-- ---------------------------------------------------------------------------
-- 5. Lifecycle transition RPC (audited, no automated publication)
-- ---------------------------------------------------------------------------
create or replace function public.transition_report(
  p_report_id uuid,
  p_next_status text,
  p_actor uuid,
  p_reason text default null,
  p_content text default null,
  p_change_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.report_documents%rowtype;
  v_new_version int;
  v_hash text;
begin
  select * into v_row from public.report_documents where id = p_report_id for update;
  if not found then
    raise exception 'Report not found';
  end if;

  -- Allowed transitions only.
  if not (
    (v_row.status = 'draft'      and p_next_status in ('in_review')) or
    (v_row.status = 'in_review'  and p_next_status in ('approved_locked', 'draft')) or
    (v_row.status = 'approved_locked' and p_next_status in ('published', 'retracted')) or
    (v_row.status = 'published'  and p_next_status in ('retracted')) or
    (v_row.status = 'retracted'  and p_next_status in ('approved_locked'))
  ) then
    raise exception 'Invalid report transition: % -> %', v_row.status, p_next_status;
  end if;

  -- Content is only ever added via a new immutable version.
  if p_content is not null then
    v_hash := encode(extensions.digest(p_content, 'sha256'), 'hex');
    if v_hash = v_row.content_hash and v_row.current_version > 0 then
      raise exception 'Content is unchanged; nothing to version';
    end if;
    v_new_version := v_row.current_version + 1;
    insert into public.report_document_versions
      (document_id, version, content, content_hash, change_note, created_by)
    values
      (p_report_id, v_new_version, p_content, v_hash, p_change_note, p_actor);
    v_row.current_version := v_new_version;
    v_row.content_hash := v_hash;
  end if;

  v_row.status := p_next_status;
  if p_next_status = 'published' then
    v_row.published_at := now();
    v_row.retracted_at := null;
    v_row.retract_reason := null;
  elsif p_next_status = 'retracted' then
    v_row.retracted_at := now();
    v_row.retract_reason := p_reason;
  end if;
  v_row.updated_at := now();
  update public.report_documents set
    status = v_row.status,
    published_at = v_row.published_at,
    retracted_at = v_row.retracted_at,
    retract_reason = v_row.retract_reason,
    current_version = v_row.current_version,
    content_hash = v_row.content_hash,
    updated_at = v_row.updated_at
  where id = p_report_id;

  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('human', p_actor::text, 'report_transition',
     'report_documents', p_report_id::text,
     coalesce(p_reason, v_row.status || ' -> ' || p_next_status));

  return jsonb_build_object(
    'report_id', p_report_id,
    'status', p_next_status,
    'current_version', v_row.current_version
  );
end;
$$;

revoke all on function public.transition_report(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_report(uuid, text, uuid, text, text, text) to service_role;

comment on function public.transition_report(uuid, text, uuid, text, text, text) is
  'Audited, audited-only report lifecycle transition. No automated path can publish: only a named human actor id is accepted and every transition writes an audit event. Content changes append an immutable version.';

-- ---------------------------------------------------------------------------
-- 6. Derived view insert with mandatory small-cell suppression
-- ---------------------------------------------------------------------------
create or replace function public.insert_derived_view(
  p_snapshot_id uuid,
  p_audience text,
  p_view_key text,
  p_dimension_key text,
  p_metric_name text,
  p_metric_value numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_suppressed boolean;
  v_threshold integer := public.report_small_cell_threshold();
begin
  if p_audience = 'community_public' or p_audience = 'staff_partner' then
    v_suppressed := p_metric_value < v_threshold;
  else
    v_suppressed := false; -- government views may carry full counts
  end if;

  insert into public.report_derived_views
    (snapshot_id, audience, view_key, dimension_key, metric_name, metric_value, suppressed,
     small_cell_reason)
  values
    (p_snapshot_id, p_audience, p_view_key, p_dimension_key, p_metric_name,
     case when v_suppressed then 0 else p_metric_value end,
     v_suppressed,
     case when v_suppressed then 'count below small-cell threshold' else null end)
  on conflict (snapshot_id, audience, view_key, dimension_key, metric_name)
  do update set
    metric_value = excluded.metric_value,
    suppressed = excluded.suppressed,
    small_cell_reason = excluded.small_cell_reason;
end;
$$;

revoke all on function public.insert_derived_view(uuid, text, text, text, text, numeric) from public, anon, authenticated;
grant execute on function public.insert_derived_view(uuid, text, text, text, text, numeric) to service_role;

comment on function public.insert_derived_view(uuid, text, text, text, text, numeric) is
  'Inserts/updates an audience-specific derived cell. community_public and staff_partner cells below the small-cell threshold are suppressed (stored as 0 with suppressed=true); government views keep full counts.';

-- ---------------------------------------------------------------------------
-- 7. Feedback ingest (untrusted; never an approval)
-- ---------------------------------------------------------------------------
create or replace function public.ingest_report_feedback(
  p_report_id uuid,
  p_channel text,
  p_raw_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.report_feedback (report_id, channel, raw_body, is_approval)
  values (p_report_id, p_channel, p_raw_body, false)
  returning id into v_id;

  insert into public.audit_events
    (actor_type, actor_id, action, entity_type, entity_id, reason)
  values
    ('system', null, 'report_feedback_ingested', 'report_feedback', v_id::text,
     'Untrusted feedback received; is_approval=false; human review required');

  return v_id;
end;
$$;

revoke all on function public.ingest_report_feedback(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ingest_report_feedback(uuid, text, text) to service_role;

comment on function public.ingest_report_feedback(uuid, text, text) is
  'Ingests untrusted feedback with is_approval=false always. An email reply can never approve a publication.';

-- ---------------------------------------------------------------------------
-- 8. RLS
-- ---------------------------------------------------------------------------
-- Community-safe pages read only published, non-retracted community_public
-- documents and their snapshot-derived views. Everything else is staff-only;
-- the dashboard reads through the service-role RPC path.
create policy "community read published community documents"
  on public.report_documents for select
  to iraac_anon
  using (audience = 'community_public' and status = 'published' and retracted_at is null);

create policy "staff read documents"
  on public.report_documents for select
  to iraac_staff
  using (true);

create policy "auditor read documents"
  on public.report_documents for select
  to iraac_auditor
  using (true);

create policy "staff read document versions"
  on public.report_document_versions for select
  to iraac_staff
  using (true);

create policy "auditor read document versions"
  on public.report_document_versions for select
  to iraac_auditor
  using (true);

create policy "staff read exceptions"
  on public.report_exceptions for select
  to iraac_staff
  using (true);

create policy "staff read feedback"
  on public.report_feedback for select
  to iraac_staff
  using (true);

create policy "staff read snapshots"
  on public.report_dataset_snapshots for select
  to iraac_staff
  using (true);

create policy "staff read derived views"
  on public.report_derived_views for select
  to iraac_staff
  using (true);

-- Table-level SELECT for anon on the community-safe tables follows the
-- CONS-001 pattern (query runs; RLS hides everything except published
-- community documents and their views).
grant select on public.report_documents to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.report_document_versions to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.report_exceptions to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.report_feedback to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.report_dataset_snapshots to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;
grant select on public.report_derived_views to iraac_staff, iraac_auditor, iraac_anon, iraac_authenticated;

comment on table public.report_feedback is
  'UNTRUSTED inbound feedback (e.g. email replies to report recipients). Stored for the human review queue. is_approval is always false on ingest — an email reply can never approve a publication; only a named human action in the dashboard can.';
