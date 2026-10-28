import { describe, expect, it } from "vitest";
import {
  CandidateFilter,
  SEARCHABLE_TEXT_FIELDS,
  EMBEDDING_TEXT_FIELDS,
  candidateEnrichmentText,
  embeddingProfileText,
  hasAllTags,
  rankCandidates,
  tagsNamedInQuery,
  judgeProfile,
  selectForJudge,
  applyJudgement,
} from "./aiSearchService";

// Pure tests: no Claude/Gemini/DB calls. The parsed filter is written by hand
// to stand in for what Claude returns from parseQuery().
const filter = (over: Partial<CandidateFilter> = {}): CandidateFilter => ({
  skills: [],
  minYearsExperience: null,
  position: null,
  statuses: [],
  failedInterviewBefore: false,
  keywords: [],
  vague: false,
  ...over,
});

const candidate = (name: string, over: Record<string, any> = {}) => ({
  name,
  position: null,
  technicalSkills: null,
  observingSkills: null,
  metaTags: null,
  skills: [] as string[],
  skillEmbedding: [] as number[],
  ...over,
});

const names = (rows: { name: string }[]) => rows.map((r) => r.name);

describe("searchable fields", () => {
  it("includes meta tags and observing skills everywhere search reads", () => {
    for (const fields of [SEARCHABLE_TEXT_FIELDS, EMBEDDING_TEXT_FIELDS]) {
      expect(fields).toContain("metaTags");
      expect(fields).toContain("observingSkills");
    }
  });

  it("feeds meta tags and observing skills to Claude enrichment", () => {
    const text = candidateEnrichmentText(
      candidate("A", { metaTags: "devops,Referred", observingSkills: "Fast learner" }),
    );
    expect(text).toContain("devops,Referred");
    expect(text).toContain("Fast learner");
  });

  it("embeds meta tags and observing skills", () => {
    const text = embeddingProfileText(
      candidate("A", { position: "Engineer", metaTags: "devops", observingSkills: "Fast learner" }),
    );
    expect(text).toContain("devops");
    expect(text).toContain("Fast learner");
  });
});

describe("tagsNamedInQuery", () => {
  const known = ["devops", "Referred", "Hot Lead", "Remote"];

  it("finds tags named in the query, case-insensitively", () => {
    expect(tagsNamedInQuery("referred flutter devs", known)).toEqual(["Referred"]);
  });

  it("matches simple plurals and multi-word tags", () => {
    expect(tagsNamedInQuery("show me hot leads", known)).toEqual(["Hot Lead"]);
  });

  it("matches whole words only", () => {
    expect(tagsNamedInQuery("remotely located devs", known)).toEqual([]);
  });

  it("returns nothing when no tag is named", () => {
    expect(tagsNamedInQuery("flutter dev", known)).toEqual([]);
  });
});

describe("hasAllTags", () => {
  it("requires every named tag", () => {
    expect(hasAllTags("Referred, Remote", ["referred", "remote"])).toBe(true);
    expect(hasAllTags("Referred", ["referred", "remote"])).toBe(false);
    expect(hasAllTags(null, [])).toBe(true);
  });
});

describe("rankCandidates", () => {
  it("only returns candidates with the skill (no 'dev'-only matches)", () => {
    const rows = [
      candidate("Flutter", { skills: ["flutter", "dart"] }),
      candidate("DevOnly", { skills: ["java"], position: "Software Developer" }),
    ];
    const out = rankCandidates(filter({ skills: ["flutter"], keywords: ["dev"] }), rows, []);
    expect(names(out)).toEqual(["Flutter"]);
  });

  it("matches a skill that only appears as a meta tag", () => {
    const rows = [
      candidate("Tagged", { metaTags: "devops" }),
      candidate("Untagged", { skills: ["react"] }),
    ];
    const out = rankCandidates(filter({ skills: ["devops"] }), rows, []);
    expect(names(out)).toEqual(["Tagged"]);
  });

  it("counts meta tags toward role fit", () => {
    const rows = [
      candidate("Tagged", { metaTags: "devops" }),
      candidate("Frontend", { skills: ["react"] }),
    ];
    const out = rankCandidates(filter({ position: "devops" }), rows, []);
    expect(names(out)).toEqual(["Tagged"]);
  });

  it("matches observing skills", () => {
    const rows = [
      candidate("Learner", { observingSkills: "Fast learner, Team player" }),
      candidate("Other", { skills: ["java"] }),
    ];
    const out = rankCandidates(filter({ skills: ["fast learner"] }), rows, []);
    expect(names(out)).toEqual(["Learner"]);
  });

  it("treats a named meta tag as required", () => {
    const rows = [
      candidate("ReferredFlutter", { skills: ["flutter"], metaTags: "Referred" }),
      candidate("Flutter", { skills: ["flutter"] }),
    ];
    const out = rankCandidates(filter({ skills: ["flutter"] }), rows, [], ["Referred"]);
    expect(names(out)).toEqual(["ReferredFlutter"]);
  });

  it("matches a skill through the job title when the exact tag is missing", () => {
    const rows = [
      candidate("Scientist", { position: "Data Scientist Intern", skills: ["python"] }),
      candidate("Frontend", { position: "Frontend Developer", skills: ["react"] }),
    ];
    const out = rankCandidates(filter({ skills: ["data science"] }), rows, []);
    expect(names(out)).toEqual(["Scientist"]);
  });

  it("treats ml and machine learning as the same skill", () => {
    const rows = [candidate("Ml", { skills: ["ml"] })];
    const out = rankCandidates(filter({ skills: ["machine learning"] }), rows, []);
    expect(names(out)).toEqual(["Ml"]);
  });

  it("needs two role technologies, not one incidental tool", () => {
    const rows = [
      candidate("PandasOnly", { position: "Frontend Developer", skills: ["react", "pandas"] }),
      candidate("DataStack", { position: "Analyst", skills: ["pandas", "numpy"] }),
    ];
    const out = rankCandidates(filter({ skills: ["data science"] }), rows, []);
    expect(names(out)).toEqual(["DataStack"]);
  });

  it("never includes on semantic similarity alone", () => {
    const rows = [
      candidate("Learner", { observingSkills: "Fast learner", skillEmbedding: [1, 0] }),
      candidate("Similar", { skills: ["java"], skillEmbedding: [0.99, 0.1] }),
    ];
    const out = rankCandidates(filter({ skills: ["fast learner"] }), rows, [1, 0]);
    expect(names(out)).toEqual(["Learner"]);
  });

  it("does not treat a specific technology's neighbours as a match", () => {
    const rows = [
      candidate("Flutter", { skills: ["flutter", "dart"] }),
      candidate("Android", { position: "Android Developer", skills: ["kotlin", "android"] }),
    ];
    const out = rankCandidates(filter({ skills: ["flutter"] }), rows, []);
    expect(names(out)).toEqual(["Flutter"]);
  });

  it("ranks a matching job title above the same skill listed by a student", () => {
    const rows = [
      candidate("Student", { position: "Computer Science Student", skills: ["python"] }),
      candidate("PyDev", { position: "Python Developer", skills: ["python"] }),
    ];
    const out = rankCandidates(filter({ skills: ["python"] }), rows, []);
    expect(names(out)).toEqual(["PyDev", "Student"]);
    expect(out[0].matchScore).toBeGreaterThan(out[1].matchScore);
  });

  it("returns every tagged candidate for a tag-only query", () => {
    const rows = [
      candidate("Hot1", { metaTags: "Hot Lead" }),
      candidate("Hot2", { metaTags: "Hot Lead, Remote" }),
      candidate("Cold", { metaTags: "Remote" }),
    ];
    const out = rankCandidates(filter({ keywords: ["hot leads"] }), rows, [], ["Hot Lead"]);
    expect(names(out).sort()).toEqual(["Hot1", "Hot2"]);
  });
});

describe("judge helpers", () => {
  const withId = (id: string, over: Record<string, any> = {}) => ({
    ...candidate(id, over),
    id,
  });

  it("sends meta tags, observing skills and experience in the profile", () => {
    const p = judgeProfile(
      withId("a", {
        position: "Python Developer",
        metaTags: "Referred, Hot Lead",
        observingSkills: "Fast learner",
        workExperience: "x".repeat(5000),
        yearsExperience: 2,
      }),
    );
    expect(p.metaTags).toEqual(["Referred", "Hot Lead"]);
    expect(p.observingSkills).toEqual(["Fast learner"]);
    expect(p.yearsExperience).toBe(2);
    expect(p.experience!.length).toBeLessThan(3100);
  });

  it("sends everyone with the required tags when the pool fits the cap", () => {
    const rows = [withId("a", { metaTags: "Referred" }), withId("b")];
    const out = selectForJudge(filter({ skills: ["python"] }), rows, [], ["Referred"]);
    expect(out.map((c) => c.id)).toEqual(["a"]);
  });

  it("over the cap, keeps rule-based matches first", () => {
    const rows = [
      withId("other1"),
      withId("py", { skills: ["python"] }),
      withId("other2"),
    ];
    const out = selectForJudge(filter({ skills: ["python"] }), rows, [], [], 2);
    expect(out.map((c) => c.id)[0]).toBe("py");
    expect(out).toHaveLength(2);
  });

  it("drops unknown ids, repeats and weak matches, and sorts by relevance", () => {
    const py = { skills: ["python"] };
    const rows = [withId("a", py), withId("b", py), withId("c", py)];
    const ev = "python";
    const out = applyJudgement(rows, [
      { id: "b", relevance: 70, evidence: ev, reason: "Some Python. " },
      { id: "a", relevance: 90, evidence: ev, reason: "Python developer." },
      { id: "a", relevance: 60, evidence: ev, reason: "duplicate" },
      { id: "c", relevance: 55, evidence: ev, reason: "weak" },
      { id: "zzz", relevance: 95, evidence: ev, reason: "not a candidate" },
    ]);
    expect(out.map((c) => [c.id, c.matchScore, c.matchReason])).toEqual([
      ["a", 90, "Python developer."],
      ["b", 70, "Some Python."],
    ]);
  });

  it("drops a match whose quoted evidence isn't in the profile", () => {
    const rows = [
      withId("mern", {
        position: "Software Engineering Student",
        projects: "Built UniKhata dashboard using the MERN stack",
      }),
      withId("bot", { projects: "Developed an AI-powered chatbot using Gemini" }),
    ];
    const out = applyJudgement(rows, [
      { id: "mern", relevance: 85, evidence: "built a conversational chatbot", reason: "x" },
      { id: "bot", relevance: 90, evidence: "AI-powered chatbot using Gemini", reason: "y" },
    ]);
    expect(out.map((c) => c.id)).toEqual(["bot"]);
  });
});
