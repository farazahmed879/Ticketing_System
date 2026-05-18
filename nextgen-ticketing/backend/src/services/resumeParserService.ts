const { PDFParse } = require("pdf-parse");
import mammoth from "mammoth";

const SECTION_HEADERS = {
  objective: [
    "objective",
    "career objective",
    "professional summary",
    "summary",
    "profile summary",
    "profile",
    "about me",
    "about",
    "career highlights",
    "professional profile",
    "personal summary",
    "executive summary",
    "overview",
    "introduction",
    "professional overview",
  ],
  workExperience: [
    "work experience",
    "professional experience",
    "experience",
    "employment history",
    "employment",
    "work history",
    "career history",
    "professional work history",
    "relevant experience",
    "career experience",
    "industry experience",
    "work summary",
  ],
  technicalSkills: [
    "technical skills",
    "skills",
    "core competencies",
    "key skills",
    "competencies",
    "technologies",
    "tools & technologies",
    "tools and technologies",
    "tech stack",
    "areas of expertise",
    "technical proficiencies",
    "skills & abilities",
    "professional skills",
    "skill set",
    "skillset",
    "expertise",
    "key competencies",
  ],
  projects: [
    "projects",
    "key projects",
    "notable projects",
    "academic projects",
    "personal projects",
    "relevant projects",
    "technical projects",
    "project experience",
    "case studies",
    "portfolio projects",
    "development projects",
    "open source",
    "contributions",
    "major projects",
  ],
};

const ALL_SECTION_HEADERS = Array.from(
  new Set([
    ...SECTION_HEADERS.objective,
    ...SECTION_HEADERS.workExperience,
    ...SECTION_HEADERS.technicalSkills,
    ...SECTION_HEADERS.projects,
    "education",
    "academic background",
    "qualifications",
    "academic credentials",
    "certifications",
    "certificates",
    "awards",
    "honors",
    "references",
    "interests",
    "hobbies",
    "languages",
    "publications",
    "achievements",
    "contact",
    "contact information",
    "personal information",
    "personal details",
    "declaration",
    "additional information",
    "social",
    "social links",
  ]),
);

export const resumeParserService = {
  async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (mimetype === "application/pdf") {
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        return result.text || "";
      } finally {
        await parser.destroy().catch(() => {});
      }
    }
    if (
      mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimetype === "application/msword"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || "";
    }
    return "";
  },

  parseData(text: string) {
    const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const sections = {
      objective: extractSection(normalized, SECTION_HEADERS.objective),
      workExperience: extractSection(normalized, SECTION_HEADERS.workExperience),
      technicalSkills: normalizeSkillList(
        extractSection(normalized, SECTION_HEADERS.technicalSkills),
      ),
      projects: extractSection(normalized, SECTION_HEADERS.projects),
    };
    const contact = extractContactInfo(normalized);
    return {
      ...sections,
      ...contact,
    };
  },
};

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
}

function unspace(str: string) {
  const trimmed = str.trim();
  if (trimmed.length < 4) return trimmed;
  const parts = trimmed.split(/\s+/);
  const shortParts = parts.filter((p) => p.length <= 2).length;
  if (parts.length >= 3 && shortParts / parts.length > 0.6) {
    return trimmed.replace(/(\w)\s(?=\w)/g, "$1").replace(/\s+/g, " ");
  }
  return trimmed;
}

function extractContactInfo(text: string) {
  const result: any = {
    name: null,
    position: null,
    email: null,
    phone: null,
    cnic: null,
    address: null,
    linkedin: null,
    portfolio: null,
    github: null,
    dob: null,
    nationality: null,
    city: null,
  };

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // --- Name ---
  const headerNoise =
    /^(resume|curriculum\s*vitae|cv|profile|biodata|personal\s*details?|personal\s*information|contact|contact\s*information)\s*[:\-]?$/i;
  const nameWordRe = /^[\p{Lu}\p{Ll}][\p{L}.'\-]{0,30}$/u;
  const looksLikeName = (s: string) => {
    if (!s) return false;
    if (s.length < 3 || s.length > 60) return false;
    if (/[@\d]/.test(s)) return false;
    if (headerNoise.test(s)) return false;
    const words = s.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) return false;
    return words.every((w) => nameWordRe.test(w));
  };

  let nameLineIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const raw = unspace(lines[i]);
    const segments = raw.split(/\s*[|│•·]\s*|\s+[–—]\s+|\s+-\s+/);
    for (const seg of segments) {
      const candidate = seg.trim();
      if (looksLikeName(candidate)) {
        result.name = toTitleCase(candidate);
        nameLineIndex = i;
        if (segments.length > 1 && !result.position) {
          const other = segments
            .map((s) => s.trim())
            .find((s) => s && s !== candidate);
          if (other && other.length >= 3 && other.length <= 80) {
            result.position = toTitleCase(other);
          }
        }
        break;
      }
    }
    if (result.name) break;
  }
  if (!result.name) {
    const m = text.match(/(?:^|\n)\s*(?:name|full\s*name)\s*[:\-–]\s*(.+)/i);
    if (m) {
      const c = unspace(m[1].split("\n")[0]);
      if (c.length > 1 && c.length < 80) result.name = toTitleCase(c);
    }
  }

  // --- Position / Job title ---
  const TITLE_KEYWORDS_RE =
    /\b(?:Senior|Junior|Lead|Principal|Staff|Chief|Head|Director|VP|Vice\s+President|Founder|Co[\s\-]?founder|Owner|Partner|Associate|Intern)?\s*(?:Software|Front[\s\-]?end|Back[\s\-]?end|Full[\s\-]?stack|Web|Mobile|iOS|Android|Cloud|Data|AI|ML|Machine\s+Learning|DevOps|QA|UI|UX|Product|Project|Marketing|Sales|HR|Finance|Embedded|Network|Security|Systems|Game|Graphic|Content|Digital|Business)?\s*(?:Developer|Engineer|Designer|Manager|Analyst|Consultant|Architect|Specialist|Coordinator|Programmer|Scientist|Researcher|Administrator|Executive|Officer|Tester|Recruiter|Trainer|Teacher|Lecturer|Professor|Doctor|Attorney|Lawyer|Accountant|Auditor|Strategist|Writer|Editor|Marketer)\b/i;
  const isPositionLine = (s: string) => {
    if (!s) return false;
    if (s.length < 3 || s.length > 80) return false;
    if (/[@]/.test(s)) return false;
    if (/^\d/.test(s)) return false;
    return TITLE_KEYWORDS_RE.test(s);
  };

  if (!result.position) {
    const labelMatch = text.match(
      /(?:position|title|role|designation|current\s*role)\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    );
    if (labelMatch) {
      const c = labelMatch[1].trim();
      if (c.length >= 3 && c.length <= 80) result.position = toTitleCase(c);
    }
  }
  if (!result.position && nameLineIndex >= 0) {
    for (
      let j = nameLineIndex + 1;
      j < Math.min(lines.length, nameLineIndex + 4);
      j++
    ) {
      const c = unspace(lines[j]);
      if (isPositionLine(c)) {
        result.position = toTitleCase(c);
        break;
      }
    }
  }
  if (!result.position) {
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const raw = unspace(lines[i]);
      const m = raw.match(TITLE_KEYWORDS_RE);
      if (m && isPositionLine(m[0])) {
        result.position = toTitleCase(m[0].trim());
        break;
      }
    }
  }

  // --- Email ---
  const emailMatch = text.match(
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  );
  if (emailMatch) result.email = emailMatch[0];

  // --- Phone ---
  const phonePatterns = [
    /(?:phone|mobile|cell|contact|tel|ph)[:\s\-–]*([+]?\d[\d\s\-().]{7,18}\d)/i,
    /([+]\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/,
    /(\(\d{3,5}\)\s*\d{3,4}[\s\-]?\d{3,4})/,
    /(\d{4}[\s\-]?\d{7})/,
  ];
  for (const pattern of phonePatterns) {
    const m = text.match(pattern);
    if (m) {
      let digits = (m[1] || m[0]).replace(/\D/g, "");
      if (digits.startsWith("0092")) digits = digits.slice(4);
      else if (digits.startsWith("92") && digits.length > 10)
        digits = digits.slice(2);
      result.phone = digits;
      break;
    }
  }

  // --- CNIC ---
  const cnicMatch = text.match(/\b\d{5}[\-\s]?\d{7}[\-\s]?\d{1}\b/);
  if (cnicMatch) {
    let val = cnicMatch[0].replace(/\s/g, "-");
    if (!val.includes("-")) {
      const digits = val.replace(/\D/g, "");
      if (digits.length === 13) {
        val = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      }
    }
    result.cnic = val;
  }

  // --- Address ---
  const addrPatterns = [
    /(?:address|location|residence|residing)\s*[:\-–]\s*(.+?)(?:\n|$)/i,
  ];
  for (const pattern of addrPatterns) {
    const m = text.match(pattern);
    if (m && m[1]?.trim().length > 5) {
      const start = text.indexOf(m[0]);
      const after = text.substring(start + m[0].length);
      const extra = after.split("\n").slice(0, 2);
      const collapse = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      let full = m[1].trim();
      for (const ln of extra) {
        const t = ln.trim();
        if (!t || /^[a-z\s]{3,}[:\-]/i.test(t)) break;
        const tc = collapse(t);
        if (
          ALL_SECTION_HEADERS.some((h) => {
            const hc = collapse(h);
            return tc === hc || (tc.startsWith(hc) && tc.length < hc.length + 5);
          })
        )
          break;
        full += ", " + t;
      }
      result.address = full;
      break;
    }
  }

  // --- LinkedIn / GitHub / Portfolio ---
  const li = text.match(
    /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9\-_%]+)/i,
  );
  if (li) result.linkedin = `https://www.linkedin.com/in/${li[1]}`;

  const gh = text.match(/(?:github\.com\/)([a-zA-Z0-9\-_%]+)/i);
  if (gh) result.github = `https://github.com/${gh[1]}`;

  const urls = text.match(
    /https?:\/\/(?:www\.)?([^\s\n\/]+)\.[a-z]{2,}(?:\/[^\s\n]*)?/gi,
  );
  if (urls) {
    const other = urls.filter(
      (u) => !u.includes("linkedin.com") && !u.includes("github.com"),
    );
    if (other.length > 0) result.portfolio = other[0];
  }

  // --- DOB ---
  const dobPatterns = [
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*(\d{1,2}(?:st|nd|rd|th)?[\/\-\.\s]+(?:\d{1,2}|[a-z]{3,9})[\/\-\.\s,]+\d{2,4})/i,
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*([a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4})/i,
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i,
  ];
  for (const pattern of dobPatterns) {
    const m = text.match(pattern);
    if (m && m[1]) {
      const raw = m[1].trim().replace(/(\d)(st|nd|rd|th)/gi, "$1");
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        result.dob = d;
        break;
      }
      result.dob = raw;
      break;
    }
  }

  // --- Nationality ---
  const natMatch = text.match(
    /(?:nationality|citizenship|nation)\s*[:\-–]\s*([a-z][a-z\s\-]{2,30}?)(?:[,\n]|$)/i,
  );
  if (natMatch) {
    const val = natMatch[1].trim().split(/\s{2,}/)[0].trim();
    if (val.length >= 3 && val.length <= 30) {
      result.nationality = toTitleCase(val);
    }
  }

  // --- City ---
  let cityFound: string | null = null;
  const cityLabel = text.match(
    /(?:city|town|location|residing\s*in|based\s*in)\s*[:\-–]\s*([a-z][a-z\s\-]{1,30}?)(?:[,\n]|$)/i,
  );
  if (cityLabel) {
    const val = cityLabel[1].trim();
    if (val.length >= 2 && val.length <= 30 && !/^\d/.test(val)) {
      cityFound = toTitleCase(val);
    }
  }
  if (!cityFound && result.address) {
    const segs = result.address
      .split(/[,\n]/)
      .map((s: string) => s.trim())
      .filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const seg = segs[i].replace(/\b\d{4,}\b/g, "").trim();
      if (/^[A-Za-z][A-Za-z\s\-]{1,29}$/.test(seg) && seg.length <= 25) {
        cityFound = toTitleCase(seg);
        break;
      }
    }
  }
  if (cityFound) result.city = cityFound;

  return result;
}

function extractSection(text: string, headers: string[]): string {
  const lines = text.split("\n");
  const collapse = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const header of headers) {
    const headerCollapsed = collapse(header);
    const headerIndex = lines.findIndex((line) => {
      const lineRaw = line.trim();
      if (!lineRaw) return false;
      const cleaned = lineRaw.toLowerCase().replace(/[:\-–—]/g, "").trim();
      if (cleaned === header || cleaned.startsWith(header + " ")) return true;
      const lineCollapsed = collapse(lineRaw);
      if (lineCollapsed === headerCollapsed) return true;
      if (
        lineCollapsed.startsWith(headerCollapsed) &&
        lineCollapsed.length < headerCollapsed.length + 10
      ) {
        return true;
      }
      return false;
    });

    if (headerIndex === -1) continue;

    const headerLine = lines[headerIndex];
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = headerLine.match(
      new RegExp(`${escapedHeader}\\s*[:\\-–—]?\\s*(.+)`, "i"),
    );

    const contentLines: string[] = [];
    if (inlineMatch && inlineMatch[1]?.trim())
      contentLines.push(inlineMatch[1].trim());

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const lineRaw = lines[i].trim();
      if (!lineRaw) continue;
      const lineCleaned = lineRaw.toLowerCase().replace(/[:\-–—]/g, "").trim();
      const lineCollapsed = collapse(lineRaw);

      const isNextSection = ALL_SECTION_HEADERS.some((h) => {
        if (lineCleaned === h) return true;
        if (lineCleaned.startsWith(h) && lineRaw.length < h.length + 5)
          return true;
        const hCollapsed = collapse(h);
        if (lineCollapsed === hCollapsed) return true;
        if (
          lineCollapsed.startsWith(hCollapsed) &&
          lineCollapsed.length < hCollapsed.length + 5
        ) {
          return true;
        }
        return false;
      });

      if (isNextSection) break;
      contentLines.push(lineRaw);
    }

    const out = contentLines.join("\n").trim();
    if (out.length > 5) return out;
  }
  return "";
}

function normalizeSkillList(skills: string): string {
  if (!skills) return "";
  const trimmed = skills.trim();
  if (!trimmed) return "";
  const looksLikeBlock = trimmed.split("\n").length > 2;
  if (looksLikeBlock) return trimmed;
  return trimmed
    .split(/[•·●▪◦|·•\/]| – | - /g)
    .map((s) => s.replace(/^[\s\-:,]+|[\s\-:,]+$/g, ""))
    .filter((s) => s.length > 1)
    .join(", ");
}
