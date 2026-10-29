import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { cosineSimilarity } from "./embeddingService";

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

export const MODEL = "claude-haiku-4-5";

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
  // True when the query is too vague/subjective to search on (no concrete
  // skill, role, seniority, or status) — e.g. "good candidates", "best people".
  vague: z.boolean().default(false),
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
    vague: {
      type: "boolean",
      description:
        "true ONLY when the query has no concrete, matchable criteria — no skill/technology, role (backend/frontend/etc.), seniority/years, or status — and is just a subjective or generic ask (e.g. 'good candidates', 'best people', 'top talent', 'rockstars', 'smart devs', 'anyone', 'someone nice'). false whenever the query names any concrete criterion.",
    },
  },
  required: [
    "skills",
    "minYearsExperience",
    "position",
    "statuses",
    "failedInterviewBefore",
    "keywords",
    "vague",
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
- keywords: leftover meaningful terms not captured above. Do not duplicate skills here.
- vague: set true ONLY when the query names no concrete criterion at all (no skill/technology, role, seniority/years, or status) and is just a subjective/generic ask like "good candidates", "best people", "top talent", "rockstars", "someone experienced". If the query names any real skill, role, or filter, set vague=false.`;

let client: Anthropic | null = null;
export function getClient(): Anthropic {
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
  ["machine learning", "ml"],
  ["deep learning", "dl"],
  ["artificial intelligence", "ai"],
  ["natural language processing", "nlp"],
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
// Role matching.
//
// A role like "backend" isn't a skill tag — embedding the bare word can't tell
// a backend dev from a UX designer (all "developers" cluster together). Instead
// we map each role to its indicative technologies and rank a candidate by how
// many of those they actually have (substring match over skills + position).
// Stems are curated to be specific enough for substring matching (no 2-letter
// tokens like "ui"/"go"/"ml" that would match inside unrelated words).
// ---------------------------------------------------------------------------
const ROLE_KEYWORDS: Record<string, string[]> = {
  frontend: ["react", "angular", "vue", "svelte", "nextjs", "next.js", "nuxt",
    "tailwind", "bootstrap", "jquery", "redux", "webflow", "html", "css",
    "scss", "sass", "frontend", "front-end", "front end"],
  backend: ["node", "express", "nestjs", "django", "flask", "fastapi", "spring",
    "laravel", "symfony", "rails", ".net", "dotnet", "asp.net", "c#", "servlet",
    "hibernate", "graphql", "microservice", "kafka", "rabbitmq", "redis",
    "mongo", "postgres", "mysql", "php", "restful", "rest api", "backend",
    "back-end", "back end"],
  devops: ["docker", "kubernetes", "k8s", "terraform", "ansible", "ci/cd",
    "jenkins", "github actions", "gitlab", "cloudflare", "prometheus",
    "grafana", "devops", "aws", "azure", "gcp", "linux", "bash"],
  qa: ["selenium", "cypress", "playwright", "jest", "junit", "testng",
    "test automation", "manual testing", "quality assurance", "postman",
    "appium", "cucumber"],
  data: ["pandas", "numpy", "spark", "hadoop", "airflow", "dbt", "snowflake",
    "bigquery", "power bi", "tableau", "etl", "data engineer", "data science",
    "data analyst"],
  ml: ["tensorflow", "pytorch", "scikit", "sklearn", "keras", "machine learning",
    "deep learning", "llm", "opencv", "hugging", "nlp", "computer vision",
    "generative ai"],
  mobile: ["react native", "flutter", "swift", "kotlin", "android", "xamarin",
    "jetpack compose"],
};
ROLE_KEYWORDS.fullstack = [
  ...new Set([...ROLE_KEYWORDS.frontend, ...ROLE_KEYWORDS.backend]),
];

/** Map a free-text position/role to a known role bucket, or null. */
export function roleOf(position: string | null | undefined): string | null {
  if (!position) return null;
  const p = position.toLowerCase();
  if (/full[\s-]?stack/.test(p)) return "fullstack";
  if (/back[\s-]?end/.test(p)) return "backend";
  if (/front[\s-]?end/.test(p)) return "frontend";
  if (/devops|site reliability|\bsre\b|infrastructure|cloud engineer/.test(p))
    return "devops";
  if (/\bqa\b|quality|tester|test engineer|sdet/.test(p)) return "qa";
  if (/data engineer|data scientist|data analyst|\bdata\b/.test(p)) return "data";
  if (/machine learning|deep learning|\bml\b|\bai\b|nlp/.test(p)) return "ml";
  if (/mobile|android|\bios\b|flutter/.test(p)) return "mobile";
  return null;
}

/**
 * Count DISTINCT role technologies a candidate shows across their skills and
 * position text. Higher = stronger fit for the role.
 */
export function roleSkillHits(
  role: string,
  candidate: SearchableCandidate,
): number {
  const stems = ROLE_KEYWORDS[role];
  if (!stems) return 0;
  const hay = [...searchTags(candidate), candidate.position || ""]
    .join(" | ")
    .toLowerCase();
  return stems.filter((k) => hay.includes(k)).length;
}

// ---------------------------------------------------------------------------
// Searchable fields.
//
// The ONE list of candidate fields AI search reads. Enrichment (Claude), the
// embedding text (Gemini) and the keyword fallback all derive from these, so a
// field added here is picked up everywhere — and a field missing here is
// invisible to search everywhere. Covered by aiSearchService.test.ts.
// ---------------------------------------------------------------------------
export type SearchableCandidate = {
  position?: string | null;
  technicalSkills?: string | null;
  workExperience?: string | null;
  objective?: string | null;
  projects?: string | null;
  observingSkills?: string | null;
  metaTags?: string | null;
  skills?: string[] | null;
  skillEmbedding?: number[] | null;
};

// Full-text fields: fed to Claude enrichment and the keyword fallback.
export const SEARCHABLE_TEXT_FIELDS = [
  "position",
  "technicalSkills",
  "workExperience",
  "objective",
  "projects",
  "observingSkills",
  "metaTags",
] as const;

// Concise subset embedded for semantic matching (long prose dilutes the
// role/skill signal; see embeddingProfileText).
export const EMBEDDING_TEXT_FIELDS = [
  "position",
  "technicalSkills",
  "observingSkills",
  "metaTags",
] as const;

/** Split a comma-separated field (metaTags, observingSkills) into clean items. */
export function splitList(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Every tag a candidate can be matched on: Claude's normalized skills plus the
 * recruiter-entered meta tags and observing skills.
 */
export function searchTags(c: SearchableCandidate): string[] {
  return [
    ...(c.skills || []),
    ...splitList(c.metaTags),
    ...splitList(c.observingSkills),
  ];
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Meta tags the query names explicitly (case-insensitive, whole words, simple
 * plurals: "hot leads" names "Hot Lead"). Named tags are REQUIRED filters.
 */
export function tagsNamedInQuery(query: string, knownTags: string[]): string[] {
  const q = query.toLowerCase();
  const named = new Map<string, string>();
  for (const tag of knownTags) {
    const t = tag.trim().toLowerCase();
    if (!t || named.has(t)) continue;
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(t)}(s|es)?([^a-z0-9]|$)`);
    if (re.test(q)) named.set(t, tag.trim());
  }
  return [...named.values()];
}

/** True when the candidate carries every required meta tag. */
export function hasAllTags(
  metaTags: string | null | undefined,
  required: string[],
): boolean {
  if (required.length === 0) return true;
  const have = new Set(splitList(metaTags).map((t) => t.toLowerCase()));
  return required.every((t) => have.has(t.toLowerCase()));
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
export function candidateEnrichmentText(c: SearchableCandidate): string {
  return SEARCHABLE_TEXT_FIELDS.map((f) => c[f])
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

/**
 * Concise text to embed for semantic matching: role + normalized skills + the
 * raw skills line + recruiter tags/observations. Deliberately drops the verbose
 * work-history/objective prose — mean-pooling long text dilutes the role/skill
 * signal we actually match on.
 */
export function embeddingProfileText(c: SearchableCandidate): string {
  const [position, ...rest] = EMBEDDING_TEXT_FIELDS.map((f) => c[f]);
  return [position, (c.skills || []).join(", "), ...rest]
    .filter(Boolean)
    .join(". ")
    .slice(0, 1800)
    .trim();
}

export type RankedCandidate<T> = T & { matchScore: number };

// Word stems (first 5 letters) so "data science" matches a "Data Scientist"
// title and "android" matches "Android Developer".
const stems = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9#+]+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 5));

/** True when every word of `term` appears (by stem) in the job title. */
export function titleMatches(term: string, title: string | null | undefined): boolean {
  const want = stems(term);
  if (!want.length || !title) return false;
  const have = new Set(stems(title));
  return want.every((w) => have.has(w));
}

// Broad fields (not specific technologies) that a candidate can show through
// the field's tools: "data science" via pandas + numpy. Deliberately excludes
// concrete tech like "flutter" — an Android dev is not a Flutter dev.
const FIELD_ROLES = new Map<string, string>(
  [
    ["data science", "data"],
    ["data analysis", "data"],
    ["data analytics", "data"],
    ["data engineering", "data"],
    ["machine learning", "ml"],
    ["deep learning", "ml"],
    ["artificial intelligence", "ml"],
    ["natural language processing", "ml"],
    ["computer vision", "ml"],
    ["devops", "devops"],
    ["frontend", "frontend"],
    ["backend", "backend"],
    ["full stack", "fullstack"],
    ["mobile development", "mobile"],
    ["quality assurance", "qa"],
    ["testing", "qa"],
  ].map(([field, role]) => [canonicalizeSkill(field), role]),
);

/**
 * How strongly a candidate shows one query skill (0..1):
 *  1     exact tag (alias-normalized), or the skill is in their job title
 *  ≤0.5  the skill is a broad field ("data science", "machine learning") and
 *        they have that field's technologies (0.25 each, e.g. pandas)
 */
export function skillStrength(skill: string, c: SearchableCandidate): number {
  const key = canonicalizeSkill(skill);
  if (candidateSkillSet(searchTags(c)).has(key)) return 1;
  if (titleMatches(skill, c.position)) return 1;
  const role = FIELD_ROLES.get(key);
  return role ? Math.min(0.5, 0.25 * roleSkillHits(role, c)) : 0;
}

/**
 * Rank structurally-matched candidates for a parsed query. Pure (no I/O):
 * the caller supplies the query embedding (empty if unavailable) and the meta
 * tags the query named, which are applied as a hard filter first.
 *
 *  - Skill/role query: included on skill evidence (tag, job title, or a
 *    field's technologies). Score = 60% skill coverage + 15% job-title
 *    match + 25% semantic closeness (relative to this query).
 *  - Tag-only query (e.g. "hot leads"): every tagged candidate, by similarity.
 *  - Other topic query: semantic ranking with a relevance floor.
 *  - Pure structured query (e.g. "rejected candidates"): returned as-is.
 */
export function rankCandidates<T extends SearchableCandidate>(
  filter: CandidateFilter,
  candidates: T[],
  queryVec: number[],
  requiredTags: string[] = [],
): RankedCandidate<T>[] {
  const tagged = candidates.filter((c) => hasAllTags(c.metaTags, requiredTags));
  const roleKey = roleOf(filter.position);
  const hasSkills = filter.skills.length > 0;
  const sim = (c: T) =>
    queryVec.length ? cosineSimilarity(queryVec, c.skillEmbedding || []) : 0;

  if (hasSkills || roleKey) {
    const sims = tagged.map(sim);
    const top = sims.length ? Math.max(...sims) : 0;
    const bottom = sims.length ? Math.min(...sims) : 0;
    const simNorm = (s: number) =>
      queryVec.length && top > bottom ? (s - bottom) / (top - bottom) : 0;

    return tagged
      .map((c, i) => {
        const s = sims[i];
        let evidence: number;
        let title: number;
        let solid: boolean;
        if (hasSkills) {
          const strengths = filter.skills.map((k) => skillStrength(k, c));
          evidence = strengths.reduce((a, b) => a + b, 0) / strengths.length;
          title =
            filter.skills.filter((k) => titleMatches(k, c.position)).length /
            filter.skills.length;
          // At least one skill shown clearly (exact tag/title, or 2+ of its
          // role technologies) — one incidental tool like pandas isn't enough.
          solid = Math.max(...strengths) >= 0.5;
        } else {
          // Role query: each role technology is ~1/3 of a full match, so a
          // single incidental tool reads as weak rather than 100%.
          evidence = Math.min(1, roleSkillHits(roleKey!, c) / 3);
          title = roleOf(c.position) === roleKey ? 1 : 0;
          solid = evidence > 0;
        }
        // Similarity only ranks — it never includes on its own: model
        // similarities sit in a narrow band (~0.53-0.70 on real candidates),
        // so soft phrases like "fast learner" look close to everyone.
        const matchScore = Math.round(
          100 * (0.6 * evidence + 0.15 * title + 0.25 * simNorm(s)),
        );
        return { c, s, include: solid || title > 0, matchScore };
      })
      // Needs clear evidence: a skill/role signal or the job title. Nothing
      // => not returned (e.g. "dev"-only matches).
      .filter((r) => r.include)
      .sort((a, b) => b.matchScore - a.matchScore || b.s - a.s)
      .map((r) => ({ ...r.c, matchScore: r.matchScore }));
  }

  if (requiredTags.length > 0) {
    return tagged
      .map((c) => ({ c, s: sim(c) }))
      .sort((a, b) => b.s - a.s)
      .map((r) => ({ ...r.c, matchScore: 100 }));
  }

  if (queryTopicText(filter) && queryVec.length) {
    const scored = tagged
      .map((c) => ({ c, s: sim(c) }))
      .sort((a, b) => b.s - a.s);
    // Keep results within a margin of the best match (and above a sane
    // floor). If nothing clears the floor, return empty rather than dumping
    // every candidate.
    const top = scored[0]?.s ?? 0;
    const REL_GAP = 0.08;
    const ABS_FLOOR = 0.6;
    return scored
      .filter((r) => r.s >= Math.max(ABS_FLOOR, top - REL_GAP))
      .map((r) => ({ ...r.c, matchScore: Math.min(100, Math.round(r.s * 100)) }));
  }

  return tagged as RankedCandidate<T>[];
}

// ---------------------------------------------------------------------------
// LLM judge.
//
// The rules above match on evidence (tags, titles, a field's tools) but can't
// tell a strong fit from an incidental one, or understand asks like
// "cybersecurity" or "could lead a small team". So after the hard filters,
// Claude reads a compact profile of each candidate and decides who fits and
// why. rankCandidates is the fallback if this call fails.
// ---------------------------------------------------------------------------

// Cap on profiles sent per search (~1,000 tokens each), so cost and latency stay
// flat as the candidate pool grows.
export const JUDGE_MAX_CANDIDATES = 100;

// Matches below this relevance are dropped even if the model returns them.
const JUDGE_MIN_RELEVANCE = 60;

export type JudgeCandidate = SearchableCandidate & {
  id: string;
  yearsExperience?: number | null;
};

// Per-field cap for the judge profile. Generous on purpose: clipping projects
// at 400 chars hid the chatbot projects of the two best "built a chatbot"
// candidates (at chars 673 and 1,327), and the judge then guessed. This only
// guards against unusually long fields.
const PROFILE_FIELD_MAX = 3000;

const clip = (s: string | null | undefined, max: number) =>
  s ? (s.length > max ? `${s.slice(0, max)}…` : s) : null;

/** Profile the judge reads for one candidate. */
export function judgeProfile(c: JudgeCandidate) {
  return {
    id: c.id,
    title: c.position || null,
    yearsExperience: c.yearsExperience ?? null,
    skills: (c.skills || []).slice(0, 30),
    technicalSkills: clip(c.technicalSkills, PROFILE_FIELD_MAX),
    experience: clip(c.workExperience, PROFILE_FIELD_MAX),
    projects: clip(c.projects, PROFILE_FIELD_MAX),
    metaTags: splitList(c.metaTags),
    observingSkills: splitList(c.observingSkills),
  };
}

/**
 * Pick which candidates the judge sees. Everyone (after required tags) when
 * the pool fits the cap; otherwise rule-based matches first, then the rest by
 * semantic similarity, so the likeliest fits make the cut.
 */
export function selectForJudge<T extends JudgeCandidate>(
  filter: CandidateFilter,
  candidates: T[],
  queryVec: number[],
  requiredTags: string[] = [],
  max = JUDGE_MAX_CANDIDATES,
): T[] {
  const tagged = candidates.filter((c) => hasAllTags(c.metaTags, requiredTags));
  if (tagged.length <= max) return tagged;

  const ruledIds = rankCandidates(filter, tagged, queryVec).map((c) => c.id);
  const ruled = new Set(ruledIds);
  const byId = new Map(tagged.map((c) => [c.id, c]));
  const sim = (c: T) =>
    queryVec.length ? cosineSimilarity(queryVec, c.skillEmbedding || []) : 0;
  const rest = tagged
    .filter((c) => !ruled.has(c.id))
    .sort((a, b) => sim(b) - sim(a));
  return [...ruledIds.map((id) => byId.get(id)!), ...rest].slice(0, max);
}

export type JudgedCandidate<T> = T & { matchScore: number; matchReason: string };

const evidenceWords = (s: string) =>
  s.toLowerCase().match(/[a-z0-9#+]{3,}/g) || [];

/**
 * True when the judge's quoted evidence actually appears in the profile (at
 * least 80% of its words), so a match can't rest on an invented reason.
 */
export function evidenceInProfile(evidence: string, c: JudgeCandidate): boolean {
  const words = evidenceWords(evidence);
  if (words.length === 0) return false;
  const profile = new Set(evidenceWords(JSON.stringify(judgeProfile(c))));
  return words.filter((w) => profile.has(w)).length / words.length >= 0.8;
}

/**
 * Merge the judge's verdicts onto the candidates: drop unknown ids, repeats,
 * low-relevance matches and matches whose evidence isn't in the profile, then
 * sort by relevance.
 */
export function applyJudgement<T extends JudgeCandidate>(
  candidates: T[],
  matches: { id: string; relevance: number; evidence: string; reason: string }[],
): JudgedCandidate<T>[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  return matches
    .filter((m) => {
      const c = byId.get(m.id);
      if (
        !c ||
        seen.has(m.id) ||
        m.relevance < JUDGE_MIN_RELEVANCE ||
        !evidenceInProfile(m.evidence, c)
      ) {
        return false;
      }
      seen.add(m.id);
      return true;
    })
    .sort((a, b) => b.relevance - a.relevance)
    .map((m) => ({
      ...byId.get(m.id)!,
      matchScore: Math.round(m.relevance),
      matchReason: m.reason.trim(),
    }));
}

const judgeSchema = z.object({
  matches: z
    .array(
      z.object({
        id: z.string(),
        relevance: z.number().min(0).max(100),
        evidence: z.string(),
        reason: z.string(),
      }),
    )
    .default([]),
});

const judgeToolInputSchema = {
  type: "object" as const,
  properties: {
    matches: {
      type: "array",
      description:
        "Candidates that genuinely fit the search, best first. Empty when none fit.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Candidate id, exactly as given." },
          relevance: {
            type: "number",
            description: "60-100, using the scoring scale in the instructions.",
          },
          evidence: {
            type: "string",
            description:
              "A short exact quote (a few words) copied from this candidate's profile that proves the match.",
          },
          reason: {
            type: "string",
            description:
              "One sentence, max 20 words: what they did that matches, and the main gap if any.",
          },
        },
        required: ["id", "relevance", "evidence", "reason"],
      },
    },
  },
  required: ["matches"],
};

const JUDGE_SYSTEM_PROMPT = `You screen job candidates for a recruiter. You get one search and a small batch of candidate profiles. Call the rank_candidates tool once with the candidates who clearly match the search; never answer in prose.

How to decide:
1. Work out what the search requires. A named skill or technology ("Flutter", "Django", "chatbot") must be present. A role ("android developer") needs real work in that role. A trait ("fast learner", "team player") needs the recruiter's observingSkills or concrete evidence of it in the profile.
2. For each candidate, look for direct evidence in their title, skills, experience, projects, metaTags or observingSkills.
3. Include a candidate only if you can quote that evidence. Adjacent work is not a match: a MERN dashboard is not a chatbot, React Native is not Flutter, and calling an LLM API is not building a chatbot unless the project is a conversational assistant.
4. Most batches contain few or no matches. An empty list is the expected answer when nobody clearly fits. Never include someone to fill the list.

Scoring:
- 90-100: the search is the candidate's main focus (their title, or several projects or roles).
- 75-89: clear, direct evidence (at least one real project or role).
- 60-74: the requirement appears only as a listed skill, with no project or role behind it.
- Below 60: do not include.

For each match, give:
- evidence: a short exact quote (a few words) copied from the profile that proves the match.
- reason: one sentence, max 20 words, for the recruiter: what they did that matches, and the main gap if any. No praise.

Students and interns count unless the search asks for seniority or years of experience. Use only the candidate ids provided.`;

// Newer small model for the judge: Claude Haiku 4.5 padded batches with
// non-matches and invented reasons (e.g. a MERN dashboard as a "chatbot").
const JUDGE_MODEL = "claude-haiku-5-5";

// Profiles per judge call. In one long list (~30 profiles, ~10k tokens) the
// model overlooked candidates near the end: the same 4 Android developers
// were all found or all missed depending on list order. Small batches (full
// profiles are ~1,000 tokens each), run in parallel, avoid that and are faster.
const JUDGE_BATCH_SIZE = 5;

/**
 * Ask Claude which of these candidates fit the search, with a reason each.
 * Throws on LLM/validation failure — the caller falls back to rankCandidates.
 */
export async function judgeCandidates<T extends JudgeCandidate>(
  query: string,
  candidates: T[],
): Promise<JudgedCandidate<T>[]> {
  if (candidates.length === 0) return [];

  const batches: T[][] = [];
  for (let i = 0; i < candidates.length; i += JUDGE_BATCH_SIZE) {
    batches.push(candidates.slice(i, i + JUDGE_BATCH_SIZE));
  }
  const results = await Promise.all(batches.map((b) => judgeBatch(query, b)));
  return applyJudgement(candidates, results.flat());
}

async function judgeBatch(
  query: string,
  candidates: JudgeCandidate[],
): Promise<z.infer<typeof judgeSchema>["matches"]> {
  const response = await getClient().messages.create({
    model: JUDGE_MODEL,
    max_tokens: 8192,
    system: JUDGE_SYSTEM_PROMPT,
    tools: [
      {
        name: "rank_candidates",
        description: "Return the candidates that fit the search, with relevance and a reason.",
        input_schema: judgeToolInputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: "rank_candidates" },
    messages: [
      {
        role: "user",
        content: `Search: ${JSON.stringify(query)}\n\nCandidates:\n${JSON.stringify(
          candidates.map(judgeProfile),
        )}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  return judgeSchema.parse(toolUse.input).matches;
}

export const aiSearchService = {
  parseQuery,
  toPrismaWhere,
  queryTopicText,
  canonicalizeSkill,
  candidateSkillSet,
  skillCoverage,
  roleOf,
  roleSkillHits,
  splitList,
  searchTags,
  tagsNamedInQuery,
  hasAllTags,
  enrichCandidate,
  candidateEnrichmentText,
  embeddingProfileText,
  titleMatches,
  skillStrength,
  rankCandidates,
  JUDGE_MAX_CANDIDATES,
  judgeProfile,
  selectForJudge,
  applyJudgement,
  judgeCandidates,
};
