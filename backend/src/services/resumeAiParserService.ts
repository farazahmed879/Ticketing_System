import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MODEL, getClient } from "./aiSearchService";
import { resumeParserService } from "./resumeParserService";

/**
 * Resume text -> structured candidate fields via Claude (forced tool call,
 * zod-validated). One call also returns the normalized skills + years of
 * experience that search needs, so createCandidate can skip re-enriching.
 *
 * Falls back to the regex parser (resumeParserService.parseData) if the LLM
 * call or validation fails, so uploads keep working without the API.
 */

const str = z.string().trim().nullable().default(null);

const resumeSchema = z.object({
  name: str,
  position: str,
  email: str,
  phone: str,
  phoneCountryCode: str,
  cnic: str,
  address: str,
  city: str,
  nationality: str,
  dob: str,
  linkedin: str,
  github: str,
  portfolio: str,
  objective: str,
  technicalSkills: str,
  workExperience: str,
  projects: str,
  skills: z.array(z.string()).default([]),
  yearsExperience: z.number().nonnegative().nullable().default(null),
});

const nullableString = (description: string) => ({
  type: ["string", "null"],
  description,
});

const resumeToolInputSchema = {
  type: "object" as const,
  properties: {
    name: nullableString("Candidate's full name."),
    position: nullableString(
      "The job title this candidate fits: their current/most recent title, or the role their resume targets. If none is stated, infer a short title from their education, skills and projects (e.g. a CS student with Python projects -> \"Python Intern\"). Title case, no seniority guesses. null only if the text has no usable information.",
    ),
    email: nullableString("Email address."),
    phone: nullableString("Phone number exactly as written."),
    phoneCountryCode: nullableString(
      "Country calling code of the phone number, e.g. \"+92\" or \"+966\". Use the code written with the number, or the one its format clearly implies (e.g. 05x numbers in Saudi Arabia -> \"+966\"). null if unknown.",
    ),
    cnic: nullableString("Pakistani CNIC in 12345-1234567-1 format, if present."),
    address: nullableString("Postal/home address."),
    city: nullableString(
      "City of residence. Take it from the address or contact line if not stated separately (e.g. \"Riyadh, Saudi Arabia\" -> \"Riyadh\").",
    ),
    nationality: nullableString("Nationality, only if stated."),
    dob: nullableString("Date of birth as YYYY-MM-DD, only if stated."),
    linkedin: nullableString("LinkedIn profile URL."),
    github: nullableString("GitHub profile URL."),
    portfolio: nullableString("Personal website/portfolio URL (not LinkedIn/GitHub)."),
    objective: nullableString("Objective/summary section, as written."),
    technicalSkills: nullableString("Technical skills section, as written."),
    workExperience: nullableString(
      "Work experience/internships section, as written (roles, companies, dates, duties).",
    ),
    projects: nullableString("Projects section, as written."),
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Normalized lowercase skill/technology tags, e.g. [\"python\", \"django\", \"sql\"]. Split compound phrases into individual tags.",
    },
    yearsExperience: {
      type: ["number", "null"],
      description:
        "Total years of professional experience from the work history (0 for students with none). null if it cannot be determined.",
    },
  },
  required: Object.keys(resumeSchema.shape),
};

const SYSTEM_PROMPT = `You extract structured fields from a job candidate's resume text by calling the extract_resume tool.

Rules:
- Always call extract_resume exactly once. Never answer in prose.
- Copy values from the resume; do not invent contact details, dates or URLs. Use null when a field is absent.
- position is the exception: infer a sensible title when none is stated (see its description).
- The text may contain Markdown (**bold**, # headings, tables); return plain text without Markdown symbols.`;

export type ParsedResume = Omit<z.infer<typeof resumeSchema>, "phoneCountryCode">;

// "+<code> <number>", the shape the frontend splits back into its country
// code dropdown. Defaults to Pakistan (+92) when the code is unknown.
export function normalizePhone(
  raw: string | null,
  countryCode: string | null = null,
): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  const code = countryCode?.replace(/\D/g, "") || "92";
  if (digits.startsWith(code) && digits.length > 10) digits = digits.slice(code.length);
  return digits ? `+${code} ${digits}` : null;
}

async function parseWithClaude(text: string): Promise<ParsedResume> {
  const response = await getClient().messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [
      {
        name: "extract_resume",
        description: "Extract structured candidate fields from resume text.",
        input_schema: resumeToolInputSchema as any,
      },
    ],
    tool_choice: { type: "tool", name: "extract_resume" },
    messages: [{ role: "user", content: text.slice(0, 60_000) }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Model did not return a tool call");
  }

  const { phoneCountryCode, ...parsed } = resumeSchema.parse(toolUse.input);
  return { ...parsed, phone: normalizePhone(parsed.phone, phoneCountryCode) };
}

/**
 * Parse resume text into candidate fields. Claude first; regex fallback.
 * `skills`/`yearsExperience` are only present on the Claude path.
 */
async function parse(
  text: string,
): Promise<Partial<ParsedResume> & Record<string, any>> {
  if (!text.trim()) return {};
  try {
    return await parseWithClaude(text);
  } catch (err) {
    console.error("Claude resume parsing failed, falling back to regex:", err);
    return resumeParserService.parseData(text);
  }
}

export const resumeAiParserService = { parse };
