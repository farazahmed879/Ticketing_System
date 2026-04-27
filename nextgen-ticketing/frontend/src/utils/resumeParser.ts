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
  ]);

  const workExperience = extractSection(normalized, [
    "work experience",
    "professional experience",
    "experience",
    "employment history",
    "employment",
    "work history",
    "career history",
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
    objective: objective || "No objective section found",
    workExperience: workExperience || "No work experience section found",
    technicalSkills: technicalSkills || "No technical skills section found",
    projects: projects || "No projects section found",
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
} {
  const result: ReturnType<typeof extractContactInfo> = {};

  // --- Name: usually the first meaningful non-empty line ---
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    // First line is usually the candidate name
    // Skip if it looks like a label/header
    const firstLine = lines[0];
    const labelPattern = /^(resume|curriculum vitae|cv|name|contact|personal)\s*[:\-]/i;
    if (!labelPattern.test(firstLine) && firstLine.length < 60 && firstLine.length > 2) {
      result.name = firstLine;
    } else {
      // Try to find "Name:" label
      const nameMatch = text.match(/(?:name|full\s*name)\s*[:\-–]\s*(.+)/i);
      if (nameMatch) result.name = nameMatch[1].trim();
    }
  }

  // --- Email ---
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) result.email = emailMatch[0];

  // --- Phone ---
  // Match various formats: +92-300-1234567, (021) 123-4567, +1 234 567 8901, etc.
  const phonePatterns = [
    /(?:phone|mobile|cell|contact|tel|ph)[:\s\-–]*([+]?\d[\d\s\-().]{7,18}\d)/i,
    /([+]\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4})/,
    /(\(\d{3,5}\)\s*\d{3,4}[\s\-]?\d{3,4})/,
  ];
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.phone = (match[1] || match[0]).trim();
      break;
    }
  }

  // --- CNIC (Pakistani format: 12345-1234567-1) ---
  const cnicMatch = text.match(/\b\d{5}[\-\s]?\d{7}[\-\s]?\d{1}\b/);
  if (cnicMatch) {
    result.cnic = cnicMatch[0].replace(/\s/g, "-");
    // Normalize to xxxxx-xxxxxxx-x format
    if (!result.cnic.includes("-")) {
      const digits = result.cnic.replace(/\D/g, "");
      if (digits.length === 13) {
        result.cnic = `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`;
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
      // Grab up to 2 subsequent lines for multi-line addresses
      const addrStart = text.indexOf(match[0]);
      const afterAddr = text.substring(addrStart + match[0].length);
      const extraLines = afterAddr.split("\n").slice(0, 2);
      let fullAddr = match[1].trim();
      for (const line of extraLines) {
        const trimmed = line.trim();
        // Stop if next line is a section header or label
        if (!trimmed || /^[a-z\s]{3,}[:\-]/i.test(trimmed)) break;
        if (ALL_SECTION_HEADERS.some(h => trimmed.toLowerCase().startsWith(h))) break;
        fullAddr += ", " + trimmed;
      }
      result.address = fullAddr;
      break;
    }
  }

  // --- LinkedIn ---
  const linkedinMatch = text.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)([a-zA-Z0-9\-_%]+)/i);
  if (linkedinMatch) result.linkedin = `https://www.linkedin.com/in/${linkedinMatch[1]}`;

  // --- GitHub ---
  const githubMatch = text.match(/(?:github\.com\/)([a-zA-Z0-9\-_%]+)/i);
  if (githubMatch) result.github = `https://github.com/${githubMatch[1]}`;

  // --- Portfolio / Website ---
  const portfolioMatch = text.match(/(?:portfolio|website|site|web|link)\s*[:\-–]\s*(https?:\/\/[^\s\n]+)/i);
  if (portfolioMatch) {
    result.portfolio = portfolioMatch[1].trim();
  } else {
    // Look for generic URLs that aren't email/linkedin/github
    const urlMatch = text.match(/https?:\/\/(?:www\.)?([^\s\n\/]+)\.[a-z]{2,}(?:\/[^\s\n]*)?/ig);
    if (urlMatch) {
      const uniqueUrls = urlMatch.filter(u => !u.includes("linkedin.com") && !u.includes("github.com"));
      if (uniqueUrls.length > 0) result.portfolio = uniqueUrls[0];
    }
  }

  return result;
}

// All known section headers for boundary detection
const ALL_SECTION_HEADERS = [
  "objective", "career objective", "professional summary", "summary",
  "profile summary", "profile", "about me", "about",
  "work experience", "professional experience", "experience",
  "employment history", "employment", "work history", "career history",
  "technical skills", "skills", "core competencies", "key skills",
  "competencies", "technologies", "tools & technologies",
  "tools and technologies", "tech stack", "areas of expertise",
  "education", "academic background", "qualifications", "academic credentials",
  "certifications", "certificates", "awards", "honors",
  "projects", "personal projects", "key projects", "relevant projects", "technical projects", "project experience",
  "references", "interests", "hobbies",
  "languages", "publications", "achievements", "honors",
  "contact", "contact information", "personal information", "personal details",
  "declaration", "additional information", "social", "social links",
];

/**
 * Extract a section from text based on header keywords.
 * Uses flexible matching: headers can appear at start of a line,
 * possibly followed by a colon or dash. Captures until the next section header.
 */
function extractSection(text: string, headers: string[]): string {
  const lines = text.split("\n");

  for (const header of headers) {
    // Find the line index where this header appears
    const headerIndex = lines.findIndex((line) => {
      const cleaned = line.trim().toLowerCase().replace(/[:\-–—]/g, "").trim();
      // Exact match or starts-with match for the header
      return cleaned === header || cleaned.startsWith(header + " ");
    });

    if (headerIndex === -1) continue;

    // Check if header is alone on the line (section title)
    // or has content after it on the same line
    const headerLine = lines[headerIndex];
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const inlineMatch = headerLine.match(
      new RegExp(`${escapedHeader}\\s*[:\\-–—]?\\s*(.+)`, "i")
    );

    const contentLines: string[] = [];

    // If there's inline content after the header on the same line
    if (inlineMatch && inlineMatch[1]?.trim()) {
      contentLines.push(inlineMatch[1].trim());
    }

    // Collect lines until the next section header
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const lineRaw = lines[i].trim();
      if (!lineRaw) continue;

      const lineCleaned = lineRaw.toLowerCase().replace(/[:\-–—]/g, "").trim();

      // Check if this line is another section header
      // It must be a short line or exactly match a header to be considered a new section
      const isNextSection = ALL_SECTION_HEADERS.some(
        (h) => {
          if (lineCleaned === h) return true;
          // If it starts with a header, it must be followed by a boundary
          // and be relatively short (not a full sentence)
          if (lineCleaned.startsWith(h) && lineRaw.length < h.length + 5) {
             return true;
          }
          return false;
        }
      );

      if (isNextSection) break;

      contentLines.push(lineRaw);
    }

    const result = contentLines.join("\n").trim();
    if (result.length > 5) return result;
  }

  return "";
}
