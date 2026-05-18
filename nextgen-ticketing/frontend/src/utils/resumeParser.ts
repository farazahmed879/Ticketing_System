import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker using the local bundled file
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ResumeData {
  objective: string;
  workExperience: string;
  technicalSkills: string;
  rawText: string;
  // Contact info extracted from resume
  name?: string;
  position?: string;
  email?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  projects?: string;
  dob?: string;
  nationality?: string;
  city?: string;
}

/**
 * Extract text from a file (PDF or DOCX) client-side
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    return extractFromPDF(file);
  } else if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/msword"
  ) {
    return extractFromDOCX(file);
  }
  throw new Error("Unsupported file type. Only PDF and DOCX are supported.");
}

type PdfItem = { x: number; y: number; str: string; width: number };

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });

    const items: PdfItem[] = (content.items as any[])
      .filter((it) => it.str && it.str.trim() !== "")
      .map((it) => ({
        x: it.transform[4],
        y: it.transform[5],
        str: it.str,
        width: it.width || 0,
      }));

    if (items.length === 0) continue;

    // Detect a two-column split: find an X band in the center that few items cross.
    const splitX = detectColumnSplit(items, viewport.width);
    const columnGroups = splitX
      ? [
          items.filter((it) => it.x + it.width / 2 < splitX),
          items.filter((it) => it.x + it.width / 2 >= splitX),
        ]
      : [items];

    for (const col of columnGroups) {
      const colText = reassembleLines(col);
      if (colText) pageTexts.push(colText);
    }
  }

  return pageTexts.join("\n");
}

function detectColumnSplit(items: PdfItem[], pageWidth: number): number | null {
  if (items.length < 30 || !pageWidth) return null;
  const center = pageWidth / 2;
  const band = pageWidth * 0.08;
  const crossing = items.filter(
    (it) => it.x < center + band && it.x + it.width > center - band,
  ).length;
  // If <8% of items straddle the center band, treat as two columns.
  return crossing / items.length < 0.08 ? center : null;
}

function reassembleLines(items: PdfItem[]): string {
  if (items.length === 0) return "";
  // Group into lines by Y proximity (tolerate small vertical jitter within a line).
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfItem[][] = [];
  let current: PdfItem[] = [];
  let currentY: number | null = null;
  const yTolerance = 3;

  for (const it of sorted) {
    if (currentY === null || Math.abs(it.y - currentY) <= yTolerance) {
      current.push(it);
      currentY = currentY === null ? it.y : currentY;
    } else {
      lines.push(current);
      current = [it];
      currentY = it.y;
    }
  }
  if (current.length) lines.push(current);

  return lines
    .map((row) => {
      const inOrder = row.sort((a, b) => a.x - b.x);
      // Insert a separator when there's a large horizontal gap between items
      // (helps preserve column-like separation within a single visual row).
      let text = "";
      let prevEnd: number | null = null;
      for (const r of inOrder) {
        if (prevEnd !== null && r.x - prevEnd > 20) text += "  ";
        else if (text) text += " ";
        text += r.str;
        prevEnd = r.x + r.width;
      }
      return text.trim();
    })
    .filter(Boolean)
    .join("\n");
}

async function extractFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parse extracted text into structured resume sections
 */
export function parseResumeData(text: string): ResumeData {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const objective = extractSection(normalized, [
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
  ]);

  const workExperience = extractSection(normalized, [
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
  ]);

  const technicalSkills = extractSection(normalized, [
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
  ]);

  const projects = extractSection(normalized, [
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
  ]);

  // Extract contact info
  const contactInfo = extractContactInfo(normalized);

  return {
    objective: objective || "",
    workExperience: workExperience || "",
    technicalSkills: normalizeSkillList(technicalSkills) || "",
    projects: projects || "",
    rawText: normalized,
    ...contactInfo,
  };
}

/**
 * Derive a candidate name from the resume's filename as a last-resort fallback.
 * Strips the extension, splits on CamelCase boundaries and separators, drops
 * resume-related noise words, and title-cases what remains.
 *
 *   "resumeShabeeh.pdf"          -> "Shabeeh"
 *   "Resume_Shabeeh_Haider.pdf"  -> "Shabeeh Haider"
 *   "JohnDoeResume.docx"         -> "John Doe"
 *   "shabeeh-haider-cv.pdf"      -> "Shabeeh Haider"
 *   "cv.pdf"                     -> ""
 *   "1234_resume.pdf"            -> ""
 */
export function deriveNameFromFilename(filename: string): string {
  if (!filename) return "";
  let base = filename.replace(/\.[^.]+$/, "");
  // Insert spaces at CamelCase boundaries before tokenizing
  base = base.replace(/([a-z])([A-Z])/g, "$1 $2");
  // Normalize separators to spaces
  base = base.replace(/[_\-.()]+/g, " ");
  // Drop common resume-related noise words as whole tokens
  base = base.replace(
    /\b(resume|cv|curriculum|vitae|biodata|profile|final|new|updated?|copy|version|draft|latest)\b/gi,
    " ",
  );
  const tokens = base
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => {
      if (!t || t.length < 2) return false;
      if (/^\d+$/.test(t)) return false;
      if (/^v\d+$/i.test(t)) return false;
      return /^[A-Za-z]/.test(t);
    });
  if (tokens.length === 0 || tokens.length > 4) return "";
  return tokens
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
    .join(" ");
}

// Normalize skills that arrived as a single line with bullets/pipes/slashes
// into a comma-separated list, while preserving multi-line block layouts.
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

/**
 * Extract contact information from the resume text using regex patterns
 */
function extractContactInfo(text: string): {
  name?: string;
  position?: string;
  email?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  dob?: string;
  nationality?: string;
  city?: string;
} {
  const result: any = {};

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
      .trim();
  };

  const unspace = (str: string) => {
    const trimmed = str.trim();
    if (trimmed.length < 4) return trimmed;
    // Detect if it's spaced out: mostly single or double characters separated by spaces
    const parts = trimmed.split(/\s+/);
    const shortParts = parts.filter((p) => p.length <= 2).length;
    if (parts.length >= 3 && shortParts / parts.length > 0.6) {
      return trimmed.replace(/(\w)\s(?=\w)/g, "$1").replace(/\s+/g, " ");
    }
    return trimmed;
  };

  // --- Name ---
  // Walks the top ~20 lines (covers cases where a two-column resume puts the
  // sidebar first and the name lives further down in the joined text). Also
  // supports accented characters, "Name | Title" patterns, and an email-derived
  // last-resort.
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

  // Try line-by-line in the top of the document. If a candidate line contains
  // a separator like "|" / "—" / "–" / " - ", split it and test each side —
  // common pattern is "John Doe | Senior Software Engineer".
  let nameSet = false;
  let nameLineIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const raw = unspace(lines[i]);
    const segments = raw.split(/\s*[|│•·]\s*|\s+[–—]\s+|\s+-\s+/);
    for (const seg of segments) {
      const candidate = seg.trim();
      if (looksLikeName(candidate)) {
        result.name = toTitleCase(candidate);
        nameSet = true;
        nameLineIndex = i;
        // If the line had multiple segments, the *other* segment is often
        // the position/title.
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
    if (nameSet) break;
  }
  if (!nameSet) {
    const nameMatch = text.match(/(?:^|\n)\s*(?:name|full\s*name)\s*[:\-–]\s*(.+)/i);
    if (nameMatch) {
      const candidate = unspace(nameMatch[1].split("\n")[0]);
      if (candidate.length > 1 && candidate.length < 80) {
        result.name = toTitleCase(candidate);
        nameSet = true;
      }
    }
  }

  // --- Position / Job title ---
  // Three heuristics (first hit wins):
  //   1. Explicit label: "Position:", "Title:", "Role:", "Designation:"
  //   2. Line immediately after the name line (very common at top of resume)
  //   3. Regex of common title shapes in the top 20 lines
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
    // 1. Explicit label
    const labelMatch = text.match(
      /(?:position|title|role|designation|current\s*role)\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    );
    if (labelMatch) {
      const candidate = labelMatch[1].trim();
      if (candidate.length >= 3 && candidate.length <= 80) {
        result.position = toTitleCase(candidate);
      }
    }
  }
  if (!result.position && nameLineIndex >= 0) {
    // 2. Line right after the name
    for (let j = nameLineIndex + 1; j < Math.min(lines.length, nameLineIndex + 4); j++) {
      const candidate = unspace(lines[j]);
      if (isPositionLine(candidate)) {
        result.position = toTitleCase(candidate);
        break;
      }
    }
  }
  if (!result.position) {
    // 3. Regex over top 20 lines
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
    /(\d{4}[\s\-]?\d{7})/, // Standard 03xx-xxxxxxx
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      let rawPhone = (match[1] || match[0]).trim();
      // Remove all non-digits
      let digits = rawPhone.replace(/\D/g, "");

      // Remove Pakistan country code if present (92 or 0092)
      if (digits.startsWith("0092")) {
        digits = digits.slice(4);
      } else if (digits.startsWith("92") && digits.length > 10) {
        digits = digits.slice(2);
      }

      // If it starts with 0 and has 11 digits, it's a local number, keep it as is or remove leading 0 if requested?
      // Usually keeping the 0 for local or removing it for consistency.
      // User said "remove country code", usually implying they want the core number.
      // If it starts with 0, it's 0300... let's keep it if it's 11 digits, otherwise standard is 10 digits.
      if (digits.startsWith("0") && digits.length === 11) {
        // Keep as is or normalize? Let's just return the digits as requested.
      }

      result.phone = digits;
      break;
    }
  }

  // --- CNIC ---
  const cnicMatch = text.match(/\b\d{5}[\-\s]?\d{7}[\-\s]?\d{1}\b/);
  if (cnicMatch) {
    result.cnic = cnicMatch[0].replace(/\s/g, "-");
    if (!result.cnic.includes("-")) {
      const digits = result.cnic.replace(/\D/g, "");
      if (digits.length === 13) {
        result.cnic = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
      }
    }
  }

  // --- Address ---
  const addressPatterns = [
    /(?:address|location|residence|residing)\s*[:\-–]\s*(.+?)(?:\n|$)/i,
    /(?:address|location|residence|residing)\s*[:\-–]\s*(.+?)(?:\n.+?){0,2}/i,
  ];
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]?.trim().length > 5) {
      const addrStart = text.indexOf(match[0]);
      const afterAddr = text.substring(addrStart + match[0].length);
      const extraLines = afterAddr.split("\n").slice(0, 2);
      const collapse = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

      let fullAddr = match[1].trim();
      for (const line of extraLines) {
        const trimmed = line.trim();
        if (!trimmed || /^[a-z\s]{3,}[:\-]/i.test(trimmed)) break;

        const trimmedCollapsed = collapse(trimmed);
        if (
          ALL_SECTION_HEADERS.some((h) => {
            const hCollapsed = collapse(h);
            return (
              trimmedCollapsed === hCollapsed ||
              (trimmedCollapsed.startsWith(hCollapsed) &&
                trimmedCollapsed.length < hCollapsed.length + 5)
            );
          })
        )
          break;
        fullAddr += ", " + trimmed;
      }
      result.address = fullAddr;
      break;
    }
  }

  // --- LinkedIn ---
  const linkedinMatch = text.match(
    /(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9\-_%]+)/i,
  );
  if (linkedinMatch)
    result.linkedin = `https://www.linkedin.com/in/${linkedinMatch[1]}`;

  // --- GitHub ---
  const githubMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9\-_%]+)/i);
  if (githubMatch) result.github = `https://github.com/${githubMatch[1]}`;

  // --- Portfolio / Website ---
  const urlMatch = text.match(
    /https?:\/\/(?:www\.)?([^\s\n\/]+)\.[a-z]{2,}(?:\/[^\s\n]*)?/gi,
  );
  if (urlMatch) {
    const uniqueUrls = urlMatch.filter(
      (u) => !u.includes("linkedin.com") && !u.includes("github.com"),
    );
    if (uniqueUrls.length > 0) result.portfolio = uniqueUrls[0];
  }

  // --- Date of Birth ---
  // Cover: DD/MM/YYYY, YYYY-MM-DD, "5 Jan 1995", "January 5, 1995", "5th January 1995",
  // and label variants: DOB / Date of Birth / Born / D.O.B
  const dobPatterns = [
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*(\d{1,2}(?:st|nd|rd|th)?[\/\-\.\s]+(?:\d{1,2}|[a-z]{3,9})[\/\-\.\s,]+\d{2,4})/i,
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*([a-z]{3,9}\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4})/i,
    /(?:d\.?o\.?b\.?|date\s*of\s*birth|birth\s*date|born(?:\s*on)?)\s*[:\-–]?\s*(\d{4}[\-\/]\d{1,2}[\-\/]\d{1,2})/i,
  ];
  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.dob = match[1].trim().replace(/(\d)(st|nd|rd|th)/gi, "$1");
      break;
    }
  }

  // --- Nationality ---
  const nationalityMatch = text.match(
    /(?:nationality|citizenship|nation)\s*[:\-–]\s*([a-z][a-z\s\-]{2,30}?)(?:[,\n]|$)/i,
  );
  if (nationalityMatch) {
    const val = nationalityMatch[1].trim().split(/\s{2,}/)[0].trim();
    if (val.length >= 3 && val.length <= 30) {
      result.nationality = toTitleCase(val);
    }
  }

  // --- City ---
  let cityFound: string | null = null;
  const cityLabelMatch = text.match(
    /(?:city|town|location|residing\s*in|based\s*in)\s*[:\-–]\s*([a-z][a-z\s\-]{1,30}?)(?:[,\n]|$)/i,
  );
  if (cityLabelMatch) {
    const val = cityLabelMatch[1].trim();
    if (val.length >= 2 && val.length <= 30 && !/^\d/.test(val)) {
      cityFound = toTitleCase(val);
    }
  }
  // Fallback: if address was found, take the last city-like token from it.
  if (!cityFound && result.address) {
    const segments = result.address
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const seg = segments[i].replace(/\b\d{4,}\b/g, "").trim(); // strip ZIPs
      // Pure alpha, 2-30 chars, not a country-name length
      if (/^[A-Za-z][A-Za-z\s\-]{1,29}$/.test(seg) && seg.length <= 25) {
        cityFound = toTitleCase(seg);
        break;
      }
    }
  }
  if (cityFound) result.city = cityFound;

  return result;
}

// All known section headers for boundary detection
const ALL_SECTION_HEADERS = [
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
  "work experience",
  "professional experience",
  "experience",
  "employment history",
  "employment",
  "work history",
  "career history",
  "professional work history",
  "relevant experience",
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
  "education",
  "academic background",
  "qualifications",
  "academic credentials",
  "certifications",
  "certificates",
  "awards",
  "honors",
  "projects",
  "personal projects",
  "key projects",
  "relevant projects",
  "technical projects",
  "project experience",
  "references",
  "interests",
  "hobbies",
  "languages",
  "publications",
  "achievements",
  "honors",
  "contact",
  "contact information",
  "personal information",
  "personal details",
  "declaration",
  "additional information",
  "social",
  "social links",
];

function extractSection(text: string, headers: string[]): string {
  const lines = text.split("\n");
  const collapse = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const header of headers) {
    const headerCollapsed = collapse(header);
    const headerIndex = lines.findIndex((line) => {
      const lineRaw = line.trim();
      if (!lineRaw) return false;

      const cleaned = lineRaw
        .toLowerCase()
        .replace(/[:\-–—]/g, "")
        .trim();

      // Standard match
      if (cleaned === header || cleaned.startsWith(header + " ")) return true;

      // Collapsed match for spaced-out headers (e.g., K E Y S K I L L S)
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

      const lineCleaned = lineRaw
        .toLowerCase()
        .replace(/[:\-–—]/g, "")
        .trim();
      const lineCollapsed = collapse(lineRaw);

      const isNextSection = ALL_SECTION_HEADERS.some((h) => {
        // Standard match
        if (lineCleaned === h) return true;
        if (lineCleaned.startsWith(h) && lineRaw.length < h.length + 5)
          return true;

        // Collapsed match
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

    const result = contentLines.join("\n").trim();
    if (result.length > 5) return result;
  }
  return "";
}
