/**
 * Synthetic fixtures for the V1 contract.
 *
 * Synthetic data only (AGENTS.md): no real contact list, response, credential
 * or recovery material. These fixtures prove the contract and branching
 * across adapters; every adapter must reproduce the same branch from the same
 * fixture (conformance requirement).
 */

import type { AnswerMap } from "./types.ts";

/** Minimal valid adult start: A01 yes, A02 safe. Everything else skipped. */
export const FIXTURE_ANONYMOUS_MINIMAL: AnswerMap = {
  A01: "Yes",
  A02: "Yes",
};

/** Full anonymous completion: all sections answered except contact/follow-up. */
export const FIXTURE_ANONYMOUS_FULL: AnswerMap = {
  A01: "Yes",
  A02: "Yes",
  A04: "Community member",
  B01: "Dubbo",
  B02: "Aboriginal",
  B03: "25–34",
  B04: "Woman",
  B05: ["Working part-time or casually"],
  B06: "Diploma",
  B07: "$25,000–$49,999",
  C01: "A little",
  C02: ["YouthScape", "Have Your Say"],
  C03: ["Online", "Email"],
  D01: "Mostly okay",
  D02: ["Housing or homelessness", "Work", "Feeling safe"],
  D03: ["Housing or homelessness", "Work"],
  "E01#Housing or homelessness": ["Cost", "Waiting time"],
  "E01#Work": ["Waiting time"],
  "E02#Housing or homelessness": "More affordable housing options and easier access to services.",
  "E02#Work": "Work experience pathways would help.",
  "E03#Housing or homelessness": "Yes but it did not help enough",
  "E03#Work": "No",
  D04: "Sometimes",
  D05: "Mostly",
  D06: "Yes, most days",
  D07: "Yes",
  D08: "Mostly okay",
  D09: "No",
  G01: "A safe youth space with evening programs.",
  G02: "Make housing support easier to access.",
  G03: "More local job opportunities.",
  G04: "The community connections through IRAAC.",
  G05: "Maybe more about transport to services.",
  H01: "No, I just wanted to share",
  H02: ["No support needed"],
};

/** Follow-up requested with contact details (synthetic identifiers). */
export const FIXTURE_WITH_FOLLOWUP: AnswerMap = {
  A01: "Yes",
  A02: "Yes",
  A03: "By myself online",
  A04: "Community member",
  B01: "Newcastle",
  B02: "Both Aboriginal and Torres Strait Islander",
  B03: "35–44",
  C01: "I had heard the name",
  C02: ["Have Your Say"],
  D01: "Some days have been hard",
  D02: ["Food", "Domestic or family violence"],
  D03: ["Food"],
  "E01#Food": ["Not knowing where to go"],
  "E02#Food": "A list of food services that are culturally safe.",
  "E03#Food": "I am still waiting",
  F01: "Yes",
  F02: "Yes",
  F03: "Yes",
  G01: "A community food pantry.",
  G05: "Nothing to add.",
  H01: "Yes, please contact me",
  H02: ["Program information"],
  H03: "Jamie",
  H04: ["Email", "SMS"],
  H05: "jamie.synthetic@example.com",
  H06: "Weekday mornings are best. Do not leave voicemail.",
};

/** A02 = skip personal questions: B04–B07, D04–D09, F01–F03 must vanish. */
export const FIXTURE_SKIP_PERSONAL: AnswerMap = {
  A01: "Yes",
  A02: "I would like to skip personal questions",
  B01: "Wagga Wagga",
  B02: "Aboriginal",
  B03: "45–54",
  C01: "A lot",
  C02: ["MCC", "DARC"],
  C03: ["Face to face"],
  D01: "Going well",
  D02: ["Culture and connection", "Young people"],
  D03: ["Culture and connection"],
  "E01#Culture and connection": ["No suitable service"],
  "E02#Culture and connection": "More culture camps for young people.",
  "E03#Culture and connection": "No",
  G01: "More on-country programs.",
  G02: "Protect culture and language funding.",
  H01: "Maybe, show me the choices",
  H02: ["Face-to-face conversation"],
};

/** Full consent profile: every contact permission ticked. */
export const FIXTURE_FULL_CONSENT: AnswerMap = {
  ...FIXTURE_WITH_FOLLOWUP,
  I01: ["Email me IRAAC newsletters and invitations to future surveys."],
  I02: ["Send me SMS invitations to future surveys."],
  I03: ["An IRAAC worker may call me about future surveys."],
  I04: ["An IRAAC AI assistant may call me about future surveys. The call will identify itself as AI and I can ask for a person or end the call."],
  I05: ["If IRAAC later proposes recording or retaining a phone transcript, ask me for separate permission at that time."],
};

/** No contact permissions at all (declining must not block submission). */
export const FIXTURE_NO_CONSENT: AnswerMap = {
  ...FIXTURE_WITH_FOLLOWUP,
  I01: [],
  I02: [],
  I03: [],
  I04: [],
  I05: [],
};

export const ALL_FIXTURES: Record<string, AnswerMap> = {
  anonymous_minimal: FIXTURE_ANONYMOUS_MINIMAL,
  anonymous_full: FIXTURE_ANONYMOUS_FULL,
  with_followup: FIXTURE_WITH_FOLLOWUP,
  skip_personal: FIXTURE_SKIP_PERSONAL,
  full_consent: FIXTURE_FULL_CONSENT,
  no_consent: FIXTURE_NO_CONSENT,
};
