# IRAAC Have Your Say — stable survey V1 draft

> **Approval state:** Draft for Aboriginal community, cultural, privacy/legal,
> safeguarding and survey-method review. This is not the live survey. The old
> Google Form is cancelled and is not a fallback. Real collection remains
> closed until this new IRAAC-owned survey passes every release gate.

## Purpose and operating rule

Have Your Say is IRAAC's stable source survey. It collects community priorities,
support requests and evidence for de-identified reports to community and
government. IRAAC keeps the core instrument stable so results remain comparable.
Monthly themes change analysis, reports and newsletters; they do not rewrite the
survey. A material change creates a reviewed successor version.

V1 is designed for adults aged 18 and over. A separate youth pathway requires
specific child-safety, assent, guardian-consent and response procedures before
launch. Staff must not use V1 as a crisis service, clinical assessment, legal
advice service or diagnostic tool.

## Opening screen

**Title:** Have Your Say — IRAAC's got your back

**Draft participant copy:**

IRAAC listens to Aboriginal communities. What you share helps IRAAC understand
what is happening, make practical recommendations to government and report back
to community. The survey takes about 8–12 minutes. You can skip any question,
stop at any time or complete it without giving your name. Your answers will not
affect services you receive.

This survey is not an emergency or crisis service. If you or someone else is in
immediate danger, call 000. If you need culturally safe crisis support, call
13YARN on 13 92 76. You can also speak with an IRAAC worker instead of continuing.

The live page must use a neutral title and URL, store no answers in analytics or
session-replay tools, prevent caching, avoid revealing third-party trackers and
clear volatile survey state when Quick exit is used. Quick exit must never
promise to erase browser or network history that the system cannot control.

Before starting, show links to the current Privacy Notice, how answers are used,
how to make a complaint, and the human-contact option. Do not bundle future
email, SMS, human-call or AI-call permission into the start action.

## Canonical questionnaire

Every question has a stable ID. `Optional` means the respondent can continue
without answering. Every sensitive multiple-choice question also offers
`Prefer not to say`.

### A. Eligibility, comfort and participation

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| A01 | Are you 18 years or older? | Yes; No; Prefer not to say | Required before a response session is created. `No` or `Prefer not to say` stores no answer and shows a neutral page linking to IRAAC's general human contact pathway. It does not invite a minor to disclose sensitive information. |
| A02 | Are you in a safe and private enough place to answer personal questions? | Yes; I would like to skip personal questions; I would rather speak with a person; I need immediate help | Required. “Skip personal questions” skips B04–B07, D04–D09 and F01–F03 while retaining B01–B03, C01–C03, D01–D03, G01–G04 and H01–H06. “Speak with a person” stops the questionnaire and shows the general human pathway. “Immediate help” stops normal questions and shows approved urgent-help choices. Every adapter uses the same fixture. |
| A03 | How are you completing this survey today? | By myself online; With an IRAAC or partner worker; By human phone; By AI-assisted phone; Other approved mode | Usually system metadata; confirm only when needed. |
| A04 | Are you answering mainly as a community member or on behalf of an organisation/business? | Community member; Organisation or business; Both; Prefer not to say | Optional. This does not convert business contact details into personal consent. |

### B. About you

Show: “These questions help IRAAC understand whose voices are being heard. You
can skip anything you do not want to answer. A suburb, town or community is
enough; do not give your full address.”

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| B01 | What suburb, town or community do you live in? | Short answer | Optional; prevent full-address prompting. |
| B02 | Are you of Aboriginal or Torres Strait Islander origin? | Aboriginal; Torres Strait Islander; Both Aboriginal and Torres Strait Islander; Neither; Prefer not to say | Optional; final wording requires community review and alignment with the ABS standard. |
| B03 | What age group are you in? | 18–24; 25–34; 35–44; 45–54; 55–64; 65–74; 75+; Prefer not to say | Optional. |
| B04 | How do you describe your gender? | Woman; Man; Non-binary; I use a different term; Prefer not to say | Optional; show a short self-description only after “different term”. |
| B05 | What is your current work or study situation? | Working full-time; Working part-time or casually; Looking for work; Studying or training; Caring for family or community; Unable to work right now; Retired; Other; Prefer not to say | Optional; select all that apply. |
| B06 | What is the highest level of education or training you have completed? | Primary school; Some secondary school; Year 12; Certificate or trade; Diploma; University degree or higher; Other; Prefer not to say | Optional. |
| B07 | What is your current household income range before tax? | Under $25,000; $25,000–$49,999; $50,000–$74,999; $75,000–$99,999; $100,000 or more; Not sure; Prefer not to say | Optional. Review ranges before launch and report only in safe aggregates. |

### C. IRAAC awareness and connection

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| C01 | Before today, how much had you heard about IRAAC? | A lot; A little; I had heard the name; Nothing; Not sure | Optional. |
| C02 | Which IRAAC programs or ways to connect have you heard of or used? | MCC; YouthScape; The Crew; DARC; Have Your Say; Book a Call; Drop In; Home Visit; None yet; Not sure; Other | Optional; select all. |
| C03 | How would you prefer to take part with IRAAC? | Online; Email; Text message; Phone; Face to face; Home/community visit; Community event; Not sure; Other | Optional. This preference is not contact permission. |

### D. Community priorities and recent experience

Show: “Thinking about the last month, tick anything that matters to you. This
is not a diagnosis. You can skip the whole section.”

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| D01 | Over the last month, how have things been going overall? | Going well; Mostly okay; Some days have been hard; Really struggling; Prefer not to say | Optional. |
| D02 | Which areas have mattered to you, your family or community recently? | Housing or homelessness; Food; Money or bills; Work; Education or training; Transport; Physical health; Social and emotional wellbeing; Alcohol, drugs or gambling; Family support; Feeling safe; Domestic or family violence; Police, courts, bail, prison or returning to community; Disability support; Aged care; Young people; Culture and connection; Racism or discrimination; Access to services; Other; None of these; Prefer not to say | Optional; select all. `None` and `Prefer not to say` are exclusive. |
| D03 | Which three areas should IRAAC raise most strongly with government? | Topic choices from D02 only | Optional; maximum three. Exclude `None of these` and `Prefer not to say`; those non-topic responses remain available only in D02. |
| D04 | Over the last month, have you felt stressed about money or paying for things you need? | Not at all; A little; Sometimes; Often; Most days; Prefer not to say | Optional. |
| D05 | Over the last month, has your housing or accommodation felt stable? | Yes; Mostly; Not sure; No; I do not currently have stable housing; Prefer not to say | Optional. |
| D06 | Over the last month, have you had enough food and healthy meals? | Yes, most days; Sometimes; Not often; No; Prefer not to say | Optional. |
| D07 | Over the last month, have you had someone you trust to talk to? | Yes; Sometimes; Not really; No; Prefer not to say | Optional. |
| D08 | Over the last month, how has your social and emotional wellbeing been? | Strong; Mostly okay; Up and down; Not good; Very difficult; Prefer not to say | Optional. Treat as an operational check-in, not a validated clinical measure. |
| D09 | Over the last month, have alcohol, drugs, gambling or another addiction been causing problems for you or someone close to you? | No; A little; Sometimes; Often; I am worried about this; Prefer not to say | Optional. |

### E. Conditional priority detail

Show E01–E03 only for the areas the respondent selects in D03, up to three. If
D03 is blank, skip this section. Web, staff and phone adapters use the same
target set and order.

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| E01 | What is getting in the way in this area? | Cost; Waiting time; Transport or distance; Not knowing where to go; Not feeling culturally safe; Not being eligible; Paperwork or digital access; Previous bad experience; No suitable service; Family or caring responsibilities; Other; Prefer not to say | Optional; select all. Repeat against stable topic ID, not by copying a new question. |
| E02 | What support or change would help most in this area? | Plain-language paragraph | Optional; discourage names, full addresses and unnecessary identifying details. |
| E03 | Have you tried to get help with this in the last month? | Yes and it helped; Yes but it did not help enough; I am still waiting; No; Prefer not to say | Optional. |

### F. Safety-sensitive branch

Show only when the respondent selects feeling unsafe or domestic/family
violence, or asks for immediate help. Do not ask for an incident narrative,
offender name or evidence.

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| F01 | Are you safe to continue answering on this device or call? | Yes; No; Not sure; Prefer not to say | Optional but shown first. If not safe, offer quick exit and approved safe help; do not send a revealing follow-up. |
| F02 | Would you like to see or hear safe support options now? | Yes; No; Prefer not to say | Optional. Provide 000 for immediate danger and the approved specialist/human pathways. |
| F03 | Would you like an IRAAC worker to contact you about support? | Yes; Maybe later; No | Optional. `Yes` continues to safe-contact details and express permission; it does not itself create permission. |

### G. Voice, aspirations and government message

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| G01 | What is one thing you wish your community had that is not there now? | Paragraph | Optional. |
| G02 | If you could say one thing directly to government, what would it be? | Paragraph | Optional. |
| G03 | What is one change that would make life better over the next year? | Paragraph | Optional. |
| G04 | Is there anything working well that government and services should protect or build on? | Paragraph | Optional. |
| G05 | Is there anything important this survey did not ask about, or an issue IRAAC should explore? | Paragraph | Optional. State before the field that this is not an emergency service and only a successfully submitted response is reviewed. Keep approved immediate-help choices visible. Suggestions are reviewed by trained staff and may inform a future report, investigation or governed survey revision; they do not change the active survey automatically or guarantee a reply. A submitted response remains an inert canonical survey answer and creates one linked suggestion-review record. |

Open text is highly sensitive and untrusted. Enforce approved length limits,
store and render it as inert text, and prohibit raw HTML or Markdown. Redact and
classify it in a restricted pipeline before any AI analysis or report drafting.
AI extraction has no tools, cannot treat respondent text as instructions and
must return a validated structured result. Failed or suspicious content is
quarantined for trained human review. Raw text is not copied into public reports.

### H. Support and follow-up

| ID | Question | Type and answers | Rule |
|---|---|---|---|
| H01 | Would you like IRAAC to follow up about anything you shared? | Yes, please contact me; Maybe, show me the choices; No, I just wanted to share | Required only to determine follow-up. `No` skips contact fields. |
| H02 | What kind of support would help you take part? | Transport; Interpreter or language support; Accessibility support; Help completing the survey; Face-to-face conversation; Home or community visit; Program information; Referral information; Other; No support needed | Optional; select all. |
| H03 | What name would you like us to use? | Short answer | Optional unless needed for requested follow-up. |
| H04 | How may IRAAC contact you about this request? | Email; SMS; Human phone call | Optional, unticked choices. At least one is required only when H01 is “Yes”. |
| H05 | What email address or phone number should IRAAC use? | Validated contact fields shown only for chosen H04 channels | Required only for the chosen follow-up route. Store separately from answers, ask the person to confirm it and use a neutral verification message before recurring or sensitive contact. |
| H06 | Is there a safe or preferred time and way to contact you? | Short answer plus “Do not leave voicemail” and “Do not identify the topic in a message” choices | Optional. |

### I. Future contact permissions

Show a separate screen after survey answers. All choices start unticked. Each
choice has its own plain-language purpose, likely frequency, withdrawal method
and versioned consent receipt.

| ID | Permission | Rule |
|---|---|---|
| I01 | Email me IRAAC newsletters and invitations to future surveys. | Optional. |
| I02 | Send me SMS invitations to future surveys. | Optional and separate from email. |
| I03 | An IRAAC worker may call me about future surveys. | Optional and separate from AI. |
| I04 | An IRAAC AI assistant may call me about future surveys. The call will identify itself as AI and I can ask for a person or end the call. | Optional, specific and separate. Final wording requires legal/privacy approval. |
| I05 | If IRAAC later proposes recording or retaining a phone transcript, ask me for separate permission at that time. | Preference only; it is not advance recording consent. |

Contact permissions are valid only after successful submission and creation of
the matching immutable receipt. A partial or abandoned survey creates no future
contact permission. Permission can be withdrawn at any time.

V1 does not request permission for a separate secondary-research purpose. Answers
may be used only for the approved core listening, advocacy and de-identified
reporting purpose described at the start. If IRAAC later proposes a distinct
research purpose, it must present a separate optional permission and issue a
separate immutable receipt; declining it must not affect survey submission.

### J. Review and submit

Show a plain-language summary with Edit links. Present the current Privacy
Notice and response-use acknowledgement separately from optional contact
permissions. Do not require Terms unless legal review confirms that service
Terms are necessary. Submission creates one idempotent completion event and a
receipt/reference that reveals no answers.

The completion page repeats that people may use G05 to tell IRAAC what was
missed and provides the general IRAAC contact pathway for anyone who would
rather speak with a person. It must not imply that submitting a suggestion
guarantees a survey change, service response or individual follow-up.
Display the approved urgent-help choices again. Every non-empty G05 response
enters trained human triage within the approved staffed-hours and response-time
policy. Deterministic rules may raise priority but never dismiss or close a
safety concern; an LLM cannot make the safety decision.
If trained-review capacity or queue-age limits are exceeded, disable G05 for
new sessions and show the approved human contact pathway until the named safety
owner records that capacity is restored.

## Delivery parity

The canonical contract controls IDs, answer shapes, validation and branching.
Each channel uses an approved adapter:

- web/mobile presents accessible controls;
- staff-assisted mode adds operator notes outside the respondent answers;
- human phone mode uses approved spoken prompts and confirmations;
- AI phone mode uses a restricted question/answer tool and approved disclosure,
  clarification, distress, withdrawal and handover scripts.

Adapters may simplify presentation but cannot change meaning. Conformance tests
must prove that the same answer history reaches the same next question and
produces the same stored answer shape in every mode.

## Release gate

V1 may become active only after all of the following are recorded:

1. Aboriginal community/cultural review of purpose, language and priorities;
2. privacy/legal review of collection, data use and each contact permission;
3. safeguarding and operational review of distress, violence and urgent-help paths;
   this includes a named safety owner, staffed hours, escalation destinations,
   response targets, training evidence, incident audit and shutdown authority;
4. survey-method review of question order, burden, measures and reporting rules;
5. accessibility testing with keyboard, screen reader, zoom and mobile devices;
6. branch, parity, save/resume, duplicate-submit and withdrawal tests;
7. a reviewed data dictionary, small-cell policy and report-denominator rules;
8. an approved launch and rollback plan using only IRAAC-owned release versions
   or a non-collecting IRAAC maintenance page; and
9. named human approval of the exact immutable release hash.

The release also requires an approved retention/disposal schedule, a
role/action/data access matrix, sparse-community disclosure controls and a
verified vendor/subprocessor data-flow register.
