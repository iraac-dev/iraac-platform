// CAMP-001: campaign eligibility engine — server-side library.
// Provides the campaign CRUD and eligibility-check helpers the admin API routes
// consume. Server-only (service role). Never call from a client component.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Campaign types
// ---------------------------------------------------------------------------
export type CampaignType = 'newsletter' | 'survey_chase';
export type CampaignChannel = 'email' | 'sms';
export type CampaignStatus =
  | 'draft' | 'approval_pending' | 'approved'
  | 'scheduled' | 'sending' | 'completed' | 'cancelled';

// ---------------------------------------------------------------------------
// Campaign CRUD
// ---------------------------------------------------------------------------
export interface CreateCampaignInput {
  title: string;
  campaignType: CampaignType;
  channel: CampaignChannel;
  description?: string;
  contentHash: string;
  contentPreview?: string;
  scheduledAt?: string;
}

export async function createCampaign(input: CreateCampaignInput) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      name: input.title,
      campaign_type: input.campaignType,
      channel: input.channel,
      description: input.description ?? null,
      content_hash: input.contentHash,
      content_preview: input.contentPreview ?? null,
      scheduled_at: input.scheduledAt ?? null,
    })
    .select('id, name, campaign_type, channel, status, content_hash, created_at')
    .single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Eligibility check
// ---------------------------------------------------------------------------
export async function checkEligibility(
  personId: string,
  channel: CampaignChannel,
  campaignId?: string
) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('check_person_eligibility', {
    p_person_id: personId,
    p_channel: channel,
    p_campaign_id: campaignId ?? null,
  });
  if (error) throw error;
  return data as {
    eligible: boolean;
    person_id: string;
    channel: string;
    reasons: string[];
    blockers: string[];
    contact_point_id: string | null;
    contact_value: string | null;
  };
}

// ---------------------------------------------------------------------------
// Build audience (snapshot eligible recipients)
// ---------------------------------------------------------------------------
export async function buildCampaignAudience(campaignId: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('build_campaign_audience', {
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  return data as {
    campaign_id: string;
    eligible: number;
    blocked: number;
    error?: string;
  };
}

// ---------------------------------------------------------------------------
// Approve campaign
// ---------------------------------------------------------------------------
export async function approveCampaign(campaignId: string, approvedBy: string) {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('approve_campaign', {
    p_campaign_id: campaignId,
    p_approved_by: approvedBy,
  });
  if (error) throw error;
  return data as {
    campaign_id: string;
    status: string;
    error?: string;
  };
}

// ---------------------------------------------------------------------------
// Campaign pause check
// ---------------------------------------------------------------------------
export async function isCampaignPaused() {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('is_campaign_paused');
  if (error) throw error;
  return data as boolean;
}

// ---------------------------------------------------------------------------
// List campaigns (admin view)
// ---------------------------------------------------------------------------
export async function listCampaigns(limit = 50) {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id, name, campaign_type, channel, status, content_hash, audience_hash, approved_by, approved_at, scheduled_at, created_at, immutable')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Get campaign audience count
// ---------------------------------------------------------------------------
export async function getCampaignAudienceCount(campaignId: string) {
  const supabase = getServiceClient();
  const { count, error } = await supabase
    .from('campaign_audience_records')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return count ?? 0;
}
