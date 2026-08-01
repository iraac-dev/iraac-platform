-- SURV-002: insert approved Have Your Say V1 release (append-only).
-- Generated from @iraac/survey-contract (canonical definition + hash).
-- Do not edit by hand; regenerate from the contract if a successor is approved.

-- Idempotency: a client token pins one session; duplicate submit returns the same completion.
alter table public.survey_sessions add column if not exists client_token uuid;

create unique index if not exists survey_sessions_client_token_key
  on public.survey_sessions (client_token) where client_token is not null;

-- Table grants: policies are dead code without privileges. SEC-001 created
-- policies but never granted table privileges to the roles; this makes the
-- anonymous submission path actually usable and the RLS test suite runnable.
-- Pattern: roles get table privileges; RLS policies do the row filtering
-- (anon SELECT on protected tables returns zero rows by default-deny).
grant select on public.people, public.organisations, public.organisation_contacts,
  public.contact_points, public.data_sources, public.source_records,
  public.consent_wording_versions, public.consent_events, public.consent_state,
  public.suppression_events, public.survey_definitions, public.survey_versions,
  public.survey_questions, public.survey_sessions, public.survey_answers,
  public.audit_events, public.campaigns, public.contact_attempts,
  public.provider_events to iraac_anon, iraac_authenticated;

grant insert on public.survey_sessions to iraac_anon, iraac_authenticated;
grant insert on public.survey_answers to iraac_anon, iraac_authenticated;

grant select, insert, update, delete on public.people, public.organisations,
  public.organisation_contacts, public.contact_points, public.data_sources,
  public.source_records, public.consent_wording_versions, public.consent_events,
  public.suppression_events, public.survey_definitions, public.survey_versions,
  public.survey_questions, public.survey_sessions, public.survey_answers,
  public.campaigns, public.contact_attempts, public.provider_events
  to iraac_staff;

grant select on public.consent_state to iraac_staff;
grant select on public.audit_events to iraac_staff;

-- Staff RLS policies for survey definition tables (grants alone are not
-- enough: RLS returns zero rows without a matching policy). The SEC-001
-- migration only added staff read policies for sessions and answers.
create policy "staff read survey definitions" on public.survey_definitions for select to iraac_staff using (true);
create policy "staff read survey versions" on public.survey_versions for select to iraac_staff using (true);
create policy "staff read survey questions" on public.survey_questions for select to iraac_staff using (true);

grant select on public.people, public.organisations, public.organisation_contacts,
  public.contact_points, public.data_sources, public.source_records,
  public.consent_wording_versions, public.consent_events, public.consent_state,
  public.suppression_events, public.survey_definitions, public.survey_versions,
  public.survey_questions, public.survey_sessions, public.survey_answers,
  public.audit_events, public.campaigns, public.contact_attempts,
  public.provider_events to iraac_auditor;

-- Schema usage: the platform roles must resolve extension functions
-- (pgcrypto, pgTAP) which live in the extensions schema. Without this,
-- SET ROLE into a platform role breaks function resolution.
grant usage on schema extensions to iraac_anon, iraac_authenticated, iraac_staff, iraac_auditor;

-- V1 definition row (slug already exists in seed; guard against double-insert).
insert into public.survey_definitions (id, slug, title) values
  ('10000000-0000-0000-0000-000000000001', 'have-your-say', 'Have Your Say — V1')
on conflict (slug) do nothing;

-- V1 release: canonical definition JSON + approved semantic hash. Status stays 'draft'
-- until the full release gate passes; a campaign pinning this release activates it.
insert into public.survey_versions (id, survey_id, version, definition, content_hash, status, released_at) values
  ('10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   1,
   '{"contactPermissions":[{"id":"I01","note":"Optional. Withdraw any time via the link in every email or by contacting IRAAC.","text":"Email me IRAAC newsletters and invitations to future surveys."},{"id":"I02","note":"Optional and separate from email. Reply STOP at any time.","text":"Send me SMS invitations to future surveys."},{"id":"I03","note":"Optional and separate from AI.","text":"An IRAAC worker may call me about future surveys."},{"id":"I04","note":"Optional, specific and separate. Final wording requires legal/privacy approval.","text":"An IRAAC AI assistant may call me about future surveys. The call will identify itself as AI and I can ask for a person or end the call."},{"id":"I05","note":"Preference only; it is not advance recording consent.","text":"If IRAAC later proposes recording or retaining a phone transcript, ask me for separate permission at that time."}],"introduction":"IRAAC listens to Aboriginal communities. What you share helps IRAAC understand what is happening, make practical recommendations to government and report back to community. The survey takes about 8–12 minutes. You can skip any question, stop at any time or complete it without giving your name. Your answers will not affect services you receive.\n\nThis survey is not an emergency or crisis service. If you or someone else is in immediate danger, call 000. If you need culturally safe crisis support, call 13YARN on 13 92 76. You can also speak with an IRAAC worker instead of continuing.","schemaVersion":"1.0.0","sections":[{"id":"A","questions":[{"id":"A01","optional":false,"options":["Yes","No","Prefer not to say"],"preferNotToSay":true,"required":true,"rule":"Required before a response session is created. No or Prefer not to say stores no answer and shows a neutral page linking to IRAAC''s general human contact pathway. It does not invite a minor to disclose sensitive information.","section":"A","text":"Are you 18 years or older?","type":"single_choice"},{"id":"A02","optional":false,"options":["Yes","I would like to skip personal questions","I would rather speak with a person","I need immediate help"],"preferNotToSay":false,"required":true,"rule":"Required. \"Skip personal questions\" skips B04–B07, D04–D09 and F01–F03 while retaining B01–B03, C01–C03, D01–D03, G01–G04 and H01–H06. \"Speak with a person\" stops the questionnaire and shows the general human pathway. \"Immediate help\" stops normal questions and shows approved urgent-help choices. Every adapter uses the same fixture.","section":"A","text":"Are you in a safe and private enough place to answer personal questions?","type":"single_choice"},{"id":"A03","optional":true,"options":["By myself online","With an IRAAC or partner worker","By human phone","By AI-assisted phone","Other approved mode"],"preferNotToSay":false,"required":false,"rule":"Usually system metadata; confirm only when needed.","section":"A","text":"How are you completing this survey today?","type":"single_choice"},{"id":"A04","optional":true,"options":["Community member","Organisation or business","Both","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional. This does not convert business contact details into personal consent.","section":"A","text":"Are you answering mainly as a community member or on behalf of an organisation/business?","type":"single_choice"}],"title":"Eligibility, comfort and participation"},{"id":"B","intro":"These questions help IRAAC understand whose voices are being heard. You can skip anything you do not want to answer. A suburb, town or community is enough; do not give your full address.","questions":[{"id":"B01","maxLength":120,"optional":true,"preferNotToSay":false,"required":false,"rule":"Optional; prevent full-address prompting.","section":"B","text":"What suburb, town or community do you live in?","type":"text"},{"id":"B02","optional":true,"options":["Aboriginal","Torres Strait Islander","Both Aboriginal and Torres Strait Islander","Neither","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional; final wording requires community review and alignment with the ABS standard.","section":"B","text":"Are you of Aboriginal or Torres Strait Islander origin?","type":"single_choice"},{"id":"B03","optional":true,"options":["18–24","25–34","35–44","45–54","55–64","65–74","75+","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"B","text":"What age group are you in?","type":"single_choice"},{"id":"B04","optional":true,"options":["Woman","Man","Non-binary","I use a different term","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional; show a short self-description only after “different term”.","section":"B","text":"How do you describe your gender?","type":"single_choice"},{"id":"B05","optional":true,"options":["Working full-time","Working part-time or casually","Looking for work","Studying or training","Caring for family or community","Unable to work right now","Retired","Other","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional; select all that apply.","section":"B","text":"What is your current work or study situation?","type":"multi_choice"},{"id":"B06","optional":true,"options":["Primary school","Some secondary school","Year 12","Certificate or trade","Diploma","University degree or higher","Other","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"B","text":"What is the highest level of education or training you have completed?","type":"single_choice"},{"id":"B07","optional":true,"options":["Under $25,000","$25,000–$49,999","$50,000–$74,999","$75,000–$99,999","$100,000 or more","Not sure","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional. Review ranges before launch and report only in safe aggregates.","section":"B","text":"What is your current household income range before tax?","type":"single_choice"}],"title":"About you"},{"id":"C","questions":[{"id":"C01","optional":true,"options":["A lot","A little","I had heard the name","Nothing","Not sure"],"preferNotToSay":false,"required":false,"section":"C","text":"Before today, how much had you heard about IRAAC?","type":"single_choice"},{"id":"C02","optional":true,"options":["MCC","YouthScape","The Crew","DARC","Have Your Say","Book a Call","Drop In","Home Visit","None yet","Not sure","Other"],"preferNotToSay":false,"required":false,"rule":"Optional; select all.","section":"C","text":"Which IRAAC programs or ways to connect have you heard of or used?","type":"multi_choice"},{"id":"C03","optional":true,"options":["Online","Email","Text message","Phone","Face to face","Home/community visit","Community event","Not sure","Other"],"preferNotToSay":false,"required":false,"rule":"Optional. This preference is not contact permission.","section":"C","text":"How would you prefer to take part with IRAAC?","type":"multi_choice"}],"title":"IRAAC awareness and connection"},{"id":"D","intro":"Thinking about the last month, tick anything that matters to you. This is not a diagnosis. You can skip the whole section.","questions":[{"id":"D01","optional":true,"options":["Going well","Mostly okay","Some days have been hard","Really struggling","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, how have things been going overall?","type":"single_choice"},{"exclusiveOptions":["None of these","Prefer not to say"],"id":"D02","optional":true,"options":["Housing or homelessness","Food","Money or bills","Work","Education or training","Transport","Physical health","Social and emotional wellbeing","Alcohol, drugs or gambling","Family support","Feeling safe","Domestic or family violence","Police, courts, bail, prison or returning to community","Disability support","Aged care","Young people","Culture and connection","Racism or discrimination","Access to services","Other","None of these","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional; select all. None and Prefer not to say are exclusive.","section":"D","text":"Which areas have mattered to you, your family or community recently?","type":"multi_choice"},{"id":"D03","maxSelections":3,"optional":true,"options":["Housing or homelessness","Food","Money or bills","Work","Education or training","Transport","Physical health","Social and emotional wellbeing","Alcohol, drugs or gambling","Family support","Feeling safe","Domestic or family violence","Police, courts, bail, prison or returning to community","Disability support","Aged care","Young people","Culture and connection","Racism or discrimination","Access to services","Other"],"preferNotToSay":false,"required":false,"rule":"Optional; maximum three. Topic choices from D02 only. Exclude None of these and Prefer not to say; those non-topic responses remain available only in D02.","section":"D","text":"Which three areas should IRAAC raise most strongly with government?","type":"multi_choice"},{"id":"D04","optional":true,"options":["Not at all","A little","Sometimes","Often","Most days","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, have you felt stressed about money or paying for things you need?","type":"single_choice"},{"id":"D05","optional":true,"options":["Yes","Mostly","Not sure","No","I do not currently have stable housing","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, has your housing or accommodation felt stable?","type":"single_choice"},{"id":"D06","optional":true,"options":["Yes, most days","Sometimes","Not often","No","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, have you had enough food and healthy meals?","type":"single_choice"},{"id":"D07","optional":true,"options":["Yes","Sometimes","Not really","No","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, have you had someone you trust to talk to?","type":"single_choice"},{"id":"D08","optional":true,"options":["Strong","Mostly okay","Up and down","Not good","Very difficult","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Treat as an operational check-in, not a validated clinical measure.","section":"D","text":"Over the last month, how has your social and emotional wellbeing been?","type":"single_choice"},{"id":"D09","optional":true,"options":["No","A little","Sometimes","Often","I am worried about this","Prefer not to say"],"preferNotToSay":true,"required":false,"section":"D","text":"Over the last month, have alcohol, drugs, gambling or another addiction been causing problems for you or someone close to you?","type":"single_choice"}],"title":"Community priorities and recent experience"},{"id":"E","intro":"You said these areas matter. For each one, you can tell us a little more — or skip ahead.","questions":[{"id":"E01","optional":true,"options":["Cost","Waiting time","Transport or distance","Not knowing where to go","Not feeling culturally safe","Not being eligible","Paperwork or digital access","Previous bad experience","No suitable service","Family or caring responsibilities","Other","Prefer not to say"],"preferNotToSay":true,"repeatFor":{"max":3,"questionId":"D03"},"required":false,"rule":"Optional; select all. Repeat against stable topic ID, not by copying a new question.","section":"E","text":"What is getting in the way in this area?","type":"multi_choice"},{"id":"E02","maxLength":1000,"optional":true,"preferNotToSay":false,"repeatFor":{"max":3,"questionId":"D03"},"required":false,"rule":"Plain-language paragraph; discourage names, full addresses and unnecessary identifying details.","section":"E","text":"What support or change would help most in this area?","type":"text"},{"id":"E03","optional":true,"options":["Yes and it helped","Yes but it did not help enough","I am still waiting","No","Prefer not to say"],"preferNotToSay":true,"repeatFor":{"max":3,"questionId":"D03"},"required":false,"section":"E","text":"Have you tried to get help with this in the last month?","type":"single_choice"}],"title":"Conditional priority detail"},{"id":"F","intro":"A couple of quick check-ins. You can skip these too. If you would rather not continue here, use the quick exit or speak with an IRAAC worker.","questions":[{"id":"F01","optional":true,"options":["Yes","No","Not sure","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Optional but shown first. If not safe, offer quick exit and approved safe help; do not send a revealing follow-up.","section":"F","text":"Are you safe to continue answering on this device or call?","type":"single_choice"},{"id":"F02","optional":true,"options":["Yes","No","Prefer not to say"],"preferNotToSay":true,"required":false,"rule":"Provide 000 for immediate danger and the approved specialist/human pathways.","section":"F","text":"Would you like to see or hear safe support options now?","type":"single_choice"},{"id":"F03","optional":true,"options":["Yes","Maybe later","No"],"preferNotToSay":false,"required":false,"rule":"Optional. Yes continues to safe-contact details and express permission; it does not itself create permission.","section":"F","text":"Would you like an IRAAC worker to contact you about support?","type":"single_choice"}],"title":"Safety-sensitive branch"},{"id":"G","questions":[{"id":"G01","maxLength":1000,"optional":true,"preferNotToSay":false,"required":false,"section":"G","text":"What is one thing you wish your community had that is not there now?","type":"text"},{"id":"G02","maxLength":1000,"optional":true,"preferNotToSay":false,"required":false,"section":"G","text":"If you could say one thing directly to government, what would it be?","type":"text"},{"id":"G03","maxLength":1000,"optional":true,"preferNotToSay":false,"required":false,"section":"G","text":"What is one change that would make life better over the next year?","type":"text"},{"id":"G04","maxLength":1000,"optional":true,"preferNotToSay":false,"required":false,"section":"G","text":"Is there anything working well that government and services should protect or build on?","type":"text"},{"id":"G05","maxLength":1000,"optional":true,"preferNotToSay":false,"required":false,"rule":"State before the field that this is not an emergency service and only a successfully submitted response is reviewed. Every non-empty G05 response enters trained human triage; an LLM cannot make the safety decision. If trained-review capacity is exceeded, disable G05 for new sessions and show the approved human contact pathway.","section":"G","text":"Is there anything important this survey did not ask about, or an issue IRAAC should explore?","type":"text"}],"title":"Voice, aspirations and government message"},{"id":"H","questions":[{"id":"H01","optional":false,"options":["Yes, please contact me","Maybe, show me the choices","No, I just wanted to share"],"preferNotToSay":false,"required":true,"rule":"Required only to determine follow-up. No skips contact fields.","section":"H","text":"Would you like IRAAC to follow up about anything you shared?","type":"single_choice"},{"id":"H02","optional":true,"options":["Transport","Interpreter or language support","Accessibility support","Help completing the survey","Face-to-face conversation","Home or community visit","Program information","Referral information","Other","No support needed"],"preferNotToSay":false,"required":false,"rule":"Optional; select all.","section":"H","text":"What kind of support would help you take part?","type":"multi_choice"},{"id":"H03","maxLength":120,"optional":true,"preferNotToSay":false,"required":false,"rule":"Optional unless needed for requested follow-up.","section":"H","text":"What name would you like us to use?","type":"text"},{"id":"H04","optional":true,"options":["Email","SMS","Human phone call"],"preferNotToSay":false,"required":false,"rule":"Optional, unticked choices. At least one is required only when H01 is Yes.","section":"H","showWhen":{"kind":"equals","questionId":"H01","value":"Yes, please contact me"},"text":"How may IRAAC contact you about this request?","type":"multi_choice"},{"id":"H05","maxLength":200,"optional":true,"preferNotToSay":false,"required":false,"rule":"Validated contact fields shown only for chosen H04 channels. Required only for the chosen follow-up route. Store separately from answers, ask the person to confirm it and use a neutral verification message before recurring or sensitive contact.","section":"H","showWhen":{"kind":"answered","questionId":"H04"},"text":"What email address or phone number should IRAAC use?","type":"text"},{"id":"H06","maxLength":300,"optional":true,"preferNotToSay":false,"required":false,"rule":"Short answer plus “Do not leave voicemail” and “Do not identify the topic in a message” choices.","section":"H","text":"Is there a safe or preferred time and way to contact you?","type":"text"}],"title":"Support and follow-up"}],"slug":"have-your-say","title":"Have Your Say — IRAAC''s got your back"}',
   '9f98a7b96d15a2837f8aa033cf843b1b635846d53fda90dd53492e7dd6d5152f',
   'draft',
   now())
on conflict (survey_id, version) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'A01',
   'Are you 18 years or older?',
   'single_choice',
   '["Yes","No","Prefer not to say"]',
   true)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'A02',
   'Are you in a safe and private enough place to answer personal questions?',
   'single_choice',
   '["Yes","I would like to skip personal questions","I would rather speak with a person","I need immediate help"]',
   true)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'A03',
   'How are you completing this survey today?',
   'single_choice',
   '["By myself online","With an IRAAC or partner worker","By human phone","By AI-assisted phone","Other approved mode"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'A04',
   'Are you answering mainly as a community member or on behalf of an organisation/business?',
   'single_choice',
   '["Community member","Organisation or business","Both","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B01',
   'What suburb, town or community do you live in?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B02',
   'Are you of Aboriginal or Torres Strait Islander origin?',
   'single_choice',
   '["Aboriginal","Torres Strait Islander","Both Aboriginal and Torres Strait Islander","Neither","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B03',
   'What age group are you in?',
   'single_choice',
   '["18–24","25–34","35–44","45–54","55–64","65–74","75+","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B04',
   'How do you describe your gender?',
   'single_choice',
   '["Woman","Man","Non-binary","I use a different term","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B05',
   'What is your current work or study situation?',
   'multi_choice',
   '["Working full-time","Working part-time or casually","Looking for work","Studying or training","Caring for family or community","Unable to work right now","Retired","Other","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B06',
   'What is the highest level of education or training you have completed?',
   'single_choice',
   '["Primary school","Some secondary school","Year 12","Certificate or trade","Diploma","University degree or higher","Other","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'B07',
   'What is your current household income range before tax?',
   'single_choice',
   '["Under $25,000","$25,000–$49,999","$50,000–$74,999","$75,000–$99,999","$100,000 or more","Not sure","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'C01',
   'Before today, how much had you heard about IRAAC?',
   'single_choice',
   '["A lot","A little","I had heard the name","Nothing","Not sure"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'C02',
   'Which IRAAC programs or ways to connect have you heard of or used?',
   'multi_choice',
   '["MCC","YouthScape","The Crew","DARC","Have Your Say","Book a Call","Drop In","Home Visit","None yet","Not sure","Other"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'C03',
   'How would you prefer to take part with IRAAC?',
   'multi_choice',
   '["Online","Email","Text message","Phone","Face to face","Home/community visit","Community event","Not sure","Other"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D01',
   'Over the last month, how have things been going overall?',
   'single_choice',
   '["Going well","Mostly okay","Some days have been hard","Really struggling","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D02',
   'Which areas have mattered to you, your family or community recently?',
   'multi_choice',
   '["Housing or homelessness","Food","Money or bills","Work","Education or training","Transport","Physical health","Social and emotional wellbeing","Alcohol, drugs or gambling","Family support","Feeling safe","Domestic or family violence","Police, courts, bail, prison or returning to community","Disability support","Aged care","Young people","Culture and connection","Racism or discrimination","Access to services","Other","None of these","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D03',
   'Which three areas should IRAAC raise most strongly with government?',
   'multi_choice',
   '["Housing or homelessness","Food","Money or bills","Work","Education or training","Transport","Physical health","Social and emotional wellbeing","Alcohol, drugs or gambling","Family support","Feeling safe","Domestic or family violence","Police, courts, bail, prison or returning to community","Disability support","Aged care","Young people","Culture and connection","Racism or discrimination","Access to services","Other"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D04',
   'Over the last month, have you felt stressed about money or paying for things you need?',
   'single_choice',
   '["Not at all","A little","Sometimes","Often","Most days","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D05',
   'Over the last month, has your housing or accommodation felt stable?',
   'single_choice',
   '["Yes","Mostly","Not sure","No","I do not currently have stable housing","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D06',
   'Over the last month, have you had enough food and healthy meals?',
   'single_choice',
   '["Yes, most days","Sometimes","Not often","No","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D07',
   'Over the last month, have you had someone you trust to talk to?',
   'single_choice',
   '["Yes","Sometimes","Not really","No","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D08',
   'Over the last month, how has your social and emotional wellbeing been?',
   'single_choice',
   '["Strong","Mostly okay","Up and down","Not good","Very difficult","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'D09',
   'Over the last month, have alcohol, drugs, gambling or another addiction been causing problems for you or someone close to you?',
   'single_choice',
   '["No","A little","Sometimes","Often","I am worried about this","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'E01',
   'What is getting in the way in this area?',
   'multi_choice',
   '["Cost","Waiting time","Transport or distance","Not knowing where to go","Not feeling culturally safe","Not being eligible","Paperwork or digital access","Previous bad experience","No suitable service","Family or caring responsibilities","Other","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'E02',
   'What support or change would help most in this area?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'E03',
   'Have you tried to get help with this in the last month?',
   'single_choice',
   '["Yes and it helped","Yes but it did not help enough","I am still waiting","No","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'F01',
   'Are you safe to continue answering on this device or call?',
   'single_choice',
   '["Yes","No","Not sure","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'F02',
   'Would you like to see or hear safe support options now?',
   'single_choice',
   '["Yes","No","Prefer not to say"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'F03',
   'Would you like an IRAAC worker to contact you about support?',
   'single_choice',
   '["Yes","Maybe later","No"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'G01',
   'What is one thing you wish your community had that is not there now?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'G02',
   'If you could say one thing directly to government, what would it be?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'G03',
   'What is one change that would make life better over the next year?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'G04',
   'Is there anything working well that government and services should protect or build on?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'G05',
   'Is there anything important this survey did not ask about, or an issue IRAAC should explore?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H01',
   'Would you like IRAAC to follow up about anything you shared?',
   'single_choice',
   '["Yes, please contact me","Maybe, show me the choices","No, I just wanted to share"]',
   true)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H02',
   'What kind of support would help you take part?',
   'multi_choice',
   '["Transport","Interpreter or language support","Accessibility support","Help completing the survey","Face-to-face conversation","Home or community visit","Program information","Referral information","Other","No support needed"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H03',
   'What name would you like us to use?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H04',
   'How may IRAAC contact you about this request?',
   'multi_choice',
   '["Email","SMS","Human phone call"]',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H05',
   'What email address or phone number should IRAAC use?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;

insert into public.survey_questions (id, survey_id, question_key, question_text, question_type, options, required) values
  (gen_random_uuid(),
   '10000000-0000-0000-0000-000000000001',
   'H06',
   'Is there a safe or preferred time and way to contact you?',
   'text',
   'null',
   false)
on conflict (survey_id, question_key) do nothing;
