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

async function extractFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by Y position to reconstruct lines
    const itemsByY: Map<number, string[]> = new Map();
    for (const item of content.items as any[]) {
      if (!item.str || item.str.trim() === "") continue;
      // Round Y to group items on same line
      const y = Math.round(item.transform[5]);
      if (!itemsByY.has(y)) itemsByY.set(y, []);
      itemsByY.get(y)!.push(item.str);
    }

    // Sort by Y descending (PDF coords: top = higher Y)
    const sortedYs = [...itemsByY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const lineText = itemsByY.get(y)!.join(" ").trim();
      if (lineText) lines.push(lineText);
    }
  }

  return lines.join("\n");
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
    technicalSkills: technicalSkills || "",
    projects: projects || "",
    rawText: normalized,
    ...contactInfo,
  };
}

/**
 * Extract contact information from the resume text using regex patterns
 */
function extractContactInfo(text: string): {
  name?: string;
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

  if (lines.length > 0) {
    const firstLine = unspace(lines[0]);
    const labelPattern =
      /^(resume|curriculum vitae|cv|name|contact|personal)\s*[:\-]/i;
    if (
      !labelPattern.test(firstLine) &&
      firstLine.length < 60 &&
      firstLine.length > 2
    ) {
      result.name = toTitleCase(firstLine);
    } else {
      const nameMatch = text.match(/(?:name|full\s*name)\s*[:\-–]\s*(.+)/i);
      if (nameMatch) result.name = toTitleCase(unspace(nameMatch[1]));
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
  const dobMatch = text.match(
    /(?:dob|date\s*of\s*birth|birth|born)\s*[:\-–]\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})/i,
  );
  if (dobMatch) result.dob = dobMatch[1].trim();

  // --- Nationality ---
  const nationalityMatch = text.match(
    /(?:nationality|citizenship)\s*[:\-–]\s*([a-z\s]+)(?:\n|$)/i,
  );
  if (nationalityMatch) result.nationality = nationalityMatch[1].trim();

  // --- City ---
  const cityMatch = text.match(
    /(?:city|location|residing\s*in)\s*[:\-–]\s*([a-z\s]+)(?:\n|$)/i,
  );
  if (cityMatch) result.city = cityMatch[1].trim();

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
