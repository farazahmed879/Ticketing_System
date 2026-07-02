import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * AI search service.
 *
 * Turns a natural-language candidate query (typed by HR/CEO in the search bar)
 * into a *validated, constrained* filter, then into a Prisma `where` clause.
 *
 * Design notes:
 * - The LLM never touches the database. It only emits a structured filter,
 *   which we treat as UNTRUSTED INPUT and re-validate with zod (allowlist of
 *   fields + enum checks) before building a parameterized Prisma query.
 * - We use forced tool-calling for structured output: the model is required to
 *   call `build_candidate_filter`, and we read `tool_use.input`.
 */

const MODEL = "claude-haiku-4-5";

// Candidate.status values that exist in the data model.
const CANDIDATE_STATUSES = ["Active", "Hired", "Rejected", "On Hold"] as const;

// InterviewFeedback.recommendation values that count as "failed an interview".
const FAILED_RECOMMENDATIONS = ["No Hire", "Strong No Hire"];

// ---------------------------------------------------------------------------
// 1) The contract the LLM must fill. This zod schema IS the allowlist — any
//    field the model invents that isn't here is dropped on parse.
// ---------------------------------------------------------------------------
const candidateFilterSchema = z.object({
  // Normalized, lowercase skill tags to match against Candidate.skills[].
  skills: z.array(z.string()).default([]),
  // Minimum total years of experience (null = no constraint).
  minYearsExperience: z.number().nonnegative().nullable().default(null),
  // Free-text position/title to match (e.g. "backend", "devops"); null = any.
  position: z.string().nullable().default(null),
  // Which candidate statuses to include. Empty = all statuses.
  statuses: z.array(z.enum(CANDIDATE_STATUSES)).default([]),
  // True when the user is asking for people who failed an interview / were
  // rejected before.
  failedInterviewBefore: z.boolean().default(false),
  // Loose free-text terms for a fallback contains-match across text fields,
  // used to catch intent the structured fields above don't capture.
  keywords: z.array(z.string()).default([]),
});

export type CandidateFilter = z.infer<typeof candidateFilterSchema>;

// JSON Schema mirror of the above, handed to the model as the tool input.
const filterToolInputSchema = {
  type: "object" as const,
  properties: {
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Normalized lowercase skill/technology tags the candidate must have, e.g. [\"python\", \"fastapi\"]. Split compound phrases into individual tags.",
    },
    minYearsExperience: {
      type: ["number", "null"],
      description:
        "Minimum total years of professional experience. Use for phrases like '3+ years' (=> 3). null if no experience constraint.",
    },
    position: {
      type: ["string", "null"],
      description:
        "Role/title keyword to match, e.g. 'backend', 'frontend', 'devops'. null if not specified.",
    },
    statuses: {
      type: "array",
      items: { type: "string", enum: CANDIDATE_STATUSES },
      description:
        "Candidate pipeline statuses to include. Leave empty to search ALL statuses (default). Only set when the user explicitly names a status.",
    },
    failedInterviewBefore: {
      type: "boolean",
      description:
        "true if the user wants candidates who previously failed an interview or were rejected (e.g. 'failed an interview before', 'rejected applicants').",
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description:
        "Any remaining free-text terms from the query not captured by the fields above, for a loose text match.",
    },
  },
  required: [
    "skills",
    "minYearsExperience",
    "position",
    "statuses",
    "failedInterviewBefore",
    "keywords",
  ],
};

const SYSTEM_PROMPT = `You convert a recruiter's natural-language candidate search into a structured filter by calling the build_candidate_filter tool.

Context: this searches a company's candidate/applicant database (current and past applicants, including rejected ones).

Rules:
- Always call build_candidate_filter exactly once. Never answer in prose.
- skills: normalize to lowercase, split compound requirements into individual tags (e.g. "FastAPI and async REST" -> ["fastapi", "rest"]).
- minYearsExperience: extract the number from phrases like "3+ years", "at least 5 years". null if none.
- position: the role keyword only (e.g. "python developer" -> position "developer" is too generic; prefer leaving position null and putting "python" in skills unless a clear role like "backend"/"frontend"/"devops"/"qa" is stated).
- statuses: leave EMPTY unless the user explicitly restricts to a status. Searching all statuses is the default.
- failedInterviewBefore: true only when the user asks for people who failed/were rejected previously.
- keywords: leftover meaningful terms not captured above. Do not duplicate skills here.`;

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Ask the LLM to translate a natural-language query into a validated filter.
 * Throws if the model fails to produce a valid tool call (caller decides the
 * fallback).
 */
export async function parseQuery(nlQuery: string): Promise<CandidateFilter> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "build_candidate_filter",
        description:
          "Build a structured filter from the recruiter's natural-language candidate search.",
        input_schema: filterToolInputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: "build_candidate_filter" },
    messages: [{ role: "user", content: nlQuery }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  // Untrusted model output -> validate/allowlist before use.
  return candidateFilterSchema.parse(toolUse.input);
}

/**
 * Translate a validated filter into a Prisma `where` for prisma.candidate.
 * Each condition is pushed into an AND array so multiple OR-groups can coexist.
 */
export function toPrismaWhere(filter: CandidateFilter): any {
  const and: any[] = [];

  // --- Hard structured filters: unambiguous numeric/enum/relational constraints.
  if (filter.minYearsExperience != null) {
    // Include candidates who clear the bar OR whose experience is unknown
    // (null) — we'd rather surface a senior dev we couldn't parse and let
    // semantic ranking judge them than silently hide them.
    and.push({
      OR: [
        { yearsExperience: { gte: filter.minYearsExperience } },
        { yearsExperience: null },
      ],
    });
  }

  if (filter.statuses.length > 0) {
    and.push({ status: { in: filter.statuses } });
  }

  if (filter.failedInterviewBefore) {
    and.push({
      OR: [
        { status: "Rejected" },
        {
          interviews: {
            some: {
              deleted: false,
              feedbacks: {
                some: { recommendation: { in: FAILED_RECOMMENDATIONS } },
              },
            },
          },
        },
      ],
    });
  }

  // NOTE: topic relevance (skills / position / keywords) is intentionally NOT a
  // DB filter here — those terms are vocabulary-fragile ("frontend" vs
  // "front-end") and are handled semantically by vector similarity in the
  // usecase (see queryTopicText + embeddingService). This builder only emits
  // the unambiguous structured constraints.

  return and.length > 0 ? { AND: and } : {};
}

/**
 * The portion of a parsed query used for *semantic* matching (skills, role,
 * loose keywords) — joined into one string to embed. Empty string means the
 * query has no topic signal (pure structured query, e.g. "rejected candidates").
 */
export function queryTopicText(filter: CandidateFilter): string {
  return [...filter.skills, ...(filter.position ? [filter.position] : []), ...filter.keywords]
    .filter(Boolean)
    .join(", ")
    .trim();
}

// ---------------------------------------------------------------------------
// Skill canonicalization.
//
// The LLM strips punctuation from tags (".net" -> "net", "c#" -> "c"), and the
// same skill is written many ways (".net" / "dotnet" / "asp.net", "react" /
// "react.js"). Exact tag equality therefore misses real matches. We collapse
// each spelling to one canonical token so query skills and candidate skills can
// be compared reliably. C# is grouped with .NET because .NET work is done in C#.
// ---------------------------------------------------------------------------
const SKILL_ALIAS_GROUPS: string[][] = [
  // canonical first; every entry maps to the group's canonical form.
  ["dotnet", "dot net", ".net", "net", "asp.net", "aspnet", "asp net",
    ".net core", "dotnet core", ".net framework", "vb.net", "vbnet",
    "c#", "csharp", "c-sharp", "c sharp"],
  ["cpp", "c++", "cplusplus", "c plus plus"],
  ["nodejs", "node.js", "node js", "node"],
  ["reactjs", "react.js", "react js", "react", "react native"],
  ["nextjs", "next.js", "next js"],
  ["vuejs", "vue.js", "vue js", "vue"],
  ["angularjs", "angular.js", "angular js", "angular"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["postgresql", "postgres", "psql"],
  ["golang", "go lang", "go"],
];

// Normalize a tag to a comparison key: lowercase, drop spaces/dots/slashes/
// hyphens. NOTE: "#" and "+" are kept (so "c#"/"c++" don't collapse into "c").
const skillKey = (s: string) =>
  s.toLowerCase().trim().replace(/[\s._/\\-]+/g, "");

const ALIAS_TO_CANON = new Map<string, string>();
for (const group of SKILL_ALIAS_GROUPS) {
  const canonical = skillKey(group[0]);
  for (const alias of group) ALIAS_TO_CANON.set(skillKey(alias), canonical);
}

/** Collapse a single skill tag to its canonical form. */
export function canonicalizeSkill(raw: string): string {
  const key = skillKey(raw);
  return ALIAS_TO_CANON.get(key) ?? key;
}

/** Canonical skill set for a candidate (from its normalized `skills[]`). */
export function candidateSkillSet(skills: string[] | null | undefined): Set<string> {
  return new Set((skills || []).map(canonicalizeSkill).filter(Boolean));
}

/**
 * Fraction of the query's skills the candidate has (0..1), using canonical
 * matching. Returns 0 when the query names no skills.
 */
export function skillCoverage(
  querySkills: string[],
  candidateSkills: string[] | null | undefined,
): number {
  const q = [...new Set(querySkills.map(canonicalizeSkill).filter(Boolean))];
  if (q.length === 0) return 0;
  const have = candidateSkillSet(candidateSkills);
  const hit = q.filter((s) => have.has(s)).length;
  return hit / q.length;
}

// ---------------------------------------------------------------------------
// Write-time enrichment: extract normalized skills + years of experience from
// a candidate's free-text fields so search can filter on them. The LLM is the
// semantic layer here — we understand the resume once, at write time.
// ---------------------------------------------------------------------------
const enrichmentSchema = z.object({
  skills: z.array(z.string()).default([]),
  yearsExperience: z.number().nonnegative().nullable().default(null),
});

export type CandidateEnrichment = z.infer<typeof enrichmentSchema>;

const enrichmentToolInputSchema = {
  type: "object" as const,
  properties: {
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Normalized lowercase skill/technology tags the candidate has, e.g. [\"python\", \"fastapi\", \"rest\"]. Split compound phrases into individual tags. Empty array if none can be determined.",
    },
    yearsExperience: {
      type: ["number", "null"],
      description:
        "Total years of professional experience, inferred from the work history (sum durations / use the span from earliest to latest role). null if it cannot be determined.",
    },
  },
  required: ["skills", "yearsExperience"],
};

const ENRICHMENT_SYSTEM_PROMPT = `You extract a structured profile from a job candidate's resume text by calling the extract_candidate_profile tool.

Rules:
- Always call extract_candidate_profile exactly once. Never answer in prose.
- skills: normalize to lowercase individual tags; split compound requirements (e.g. "async REST APIs with FastAPI" -> ["rest", "fastapi"]). Include languages, frameworks, tools, and platforms. Empty array if none.
- yearsExperience: estimate total years of professional experience from the work history. null if there's not enough information.`;

/**
 * Extract normalized skills + years of experience from a candidate's free-text
 * fields. Throws on LLM/validation failure — callers decide whether to default.
 */
export async function enrichCandidate(text: string): Promise<CandidateEnrichment> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: ENRICHMENT_SYSTEM_PROMPT,
    tools: [
      {
        name: "extract_candidate_profile",
        description:
          "Extract normalized skills and total years of experience from resume text.",
        input_schema: enrichmentToolInputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: "extract_candidate_profile" },
    messages: [{ role: "user", content: text }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  return enrichmentSchema.parse(toolUse.input);
}

/**
 * Build the text blob we feed the enrichment model from a candidate record.
 * Returns "" when there's nothing meaningful to enrich.
 */
export function candidateEnrichmentText(c: any): string {
  return [c.position, c.technicalSkills, c.workExperience, c.objective, c.projects]
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/**
 * Concise text to embed for semantic matching: role + normalized skills (+ the
 * raw skills line). Deliberately drops the verbose work-history/objective prose
 * — mean-pooling long text dilutes the role/skill signal we actually match on.
 */
export function embeddingProfileText(c: {
  position?: string | null;
  skills?: string[] | null;
  technicalSkills?: string | null;
}): string {
  return [c.position, (c.skills || []).join(", "), c.technicalSkills]
    .filter(Boolean)
    .join(". ")
    .slice(0, 1800)
    .trim();
}

export const aiSearchService = {
  parseQuery,
  toPrismaWhere,
  queryTopicText,
  canonicalizeSkill,
  candidateSkillSet,
  skillCoverage,
  enrichCandidate,
  candidateEnrichmentText,
  embeddingProfileText,
};
