import React, { useState, useRef } from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import {
  extractTextFromFile,
  parseResumeData,
  deriveNameFromFilename,
} from "../../../utils/resumeParser";
import { CandidateStatus, COUNTRY_CODES } from "../../../utils/constants";

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Triggered when at least one candidate is successfully created
}

type FileStatus = "pending" | "processing" | "success" | "error";

interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  message?: string;
  candidateName?: string;
}

interface CsvCandidateRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  city: string;
  nationality: string;
  cnic: string;
  address: string;
  skills: string;
  experience: string;
  notes: string;
  immediateJoiner: string;
  status: FileStatus;
  message?: string;
  isValid: boolean;
  errors: string[];
}

// RFC-4180 compliant CSV Parser
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let row = [""];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push("");
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      lines.push(JSON.stringify(row));
      row = [""];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== "") {
    lines.push(JSON.stringify(row));
  }

  if (lines.length < 2) return [];

  const headers = JSON.parse(lines[0]).map((h: string) => h.trim());
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = JSON.parse(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === ""))
      continue;
    const entry: Record<string, string> = {};
    headers.forEach((header: string, index: number) => {
      entry[header] = values[index] !== undefined ? values[index].trim() : "";
    });
    results.push(entry);
  }

  return results;
}

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<"resumes" | "csv">("resumes");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [csvRows, setCsvRows] = useState<CsvCandidateRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const { showNotification } = useNotification();

  // --- Resume Bulk Upload Section ---
  const handleFilesSelect = (selectedFiles: FileList | File[]) => {
    const newEntries: FileEntry[] = Array.from(selectedFiles)
      .filter(
        (f) =>
          f.type === "application/pdf" ||
          f.type.includes("document") ||
          f.type.includes("msword"),
      )
      .map((f) => ({
        id: Math.random().toString(36).substr(2, 9),
        file: f,
        status: "pending",
      }));
    setFiles((prev) => [...prev, ...newEntries]);
  };

  const removeFile = (id: string) => {
    if (isProcessing) return;
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    let anySuccess = false;

    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      if (entry.status === "success") continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === entry.id
            ? { ...f, status: "processing", message: "Extracting text..." }
            : f,
        ),
      );

      try {
        const text = await extractTextFromFile(entry.file);
        let parsed = parseResumeData(text);

        if (!parsed.name) {
          const derived = deriveNameFromFilename(entry.file.name);
          if (derived) parsed.name = derived;
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  message: "Uploading to Drive...",
                  candidateName: parsed.name,
                }
              : f,
          ),
        );

        const formData = new FormData();
        formData.append("resume", entry.file);
        let resumeUrl = "";
        try {
          const uploadRes = await api.post(
            API_ROUTES.CANDIDATES.UPLOAD_RESUME,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );
          if (uploadRes.data.driveUrl) {
            resumeUrl = uploadRes.data.driveUrl;
          }
          if (uploadRes.data.parsedData) {
            const serverParsed = uploadRes.data.parsedData;
            parsed = { ...parsed };
            for (const key in serverParsed) {
              if (serverParsed[key] && !parsed[key as keyof typeof parsed]) {
                (parsed as any)[key] = serverParsed[key];
              }
            }
          }
        } catch (uploadErr) {
          console.warn(`Drive upload failed for ${entry.file.name}`, uploadErr);
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id ? { ...f, message: "Creating candidate..." } : f,
          ),
        );

        let phoneVal = parsed.phone || "";
        let countryCode = "+92";
        const matched = COUNTRY_CODES.find((code) =>
          phoneVal.startsWith(code.value),
        );
        if (matched) {
          countryCode = matched.value;
          phoneVal = phoneVal.replace(matched.value, "").trim();
        }

        const payload = {
          name: parsed.name || "Unknown Candidate",
          email:
            parsed.email ||
            `${Math.random().toString(36).substring(7)}@example.com`,
          phone: phoneVal ? `${countryCode} ${phoneVal}` : "",
          position: parsed.position || "Applicant",
          resumeUrl: resumeUrl,
          notes: parsed.rawText
            ? "Automatically created from bulk upload."
            : "",
          status: CandidateStatus.ACTIVE,
          cnic: parsed.cnic || null,
          address: parsed.address || null,
          linkedin: parsed.linkedin || null,
          portfolio: parsed.portfolio || null,
          github: parsed.github || null,
          projects: parsed.projects || null,
          objective: parsed.objective || null,
          technicalSkills: parsed.technicalSkills || null,
          workExperience: parsed.workExperience || null,
          dob: parsed.dob
            ? new Date(parsed.dob).toISOString().split("T")[0]
            : null,
          nationality: parsed.nationality || null,
          city: parsed.city || null,
        };

        await api.post(API_ROUTES.CANDIDATES.BASE, payload);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: "success", message: "Created successfully" }
              : f,
          ),
        );
        anySuccess = true;
      } catch (err: any) {
        console.error(`Failed to process ${entry.file.name}:`, err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? {
                  ...f,
                  status: "error",
                  message:
                    err.response?.data?.error ||
                    err.message ||
                    "Failed to process",
                }
              : f,
          ),
        );
      }
    }

    setIsProcessing(false);
    if (anySuccess) {
      showNotification("success", "Bulk upload completed");
      onSuccess();
    }
  };

  // --- CSV Spreadsheet Upload Section ---
  const handleCsvSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      showNotification("error", "Please select a valid CSV file");
      return;
    }
    try {
      const text = await file.text();
      const parsedRows = parseCSV(text);
      if (parsedRows.length === 0) {
        showNotification("error", "No data rows found in the CSV");
        return;
      }

      const rows: CsvCandidateRow[] = parsedRows.map((row, idx) => {
        const name = row["Name"] || "";
        const email = row["Email"] || "";
        const phone = row["Phone"] || "";
        const position = row["Position"] || "";
        const city = row["City"] || "";
        const nationality = row["Nationality"] || "";
        const cnic = row["CNIC"] || "";
        const address = row["Address"] || "";
        const skills = row["Technical Skills"] || "";
        const experience = row["Experience"] || "";
        const notes = row["Notes"] || "";
        const immediateJoinerRaw = row["Immediate Joiner"] || "";

        const errors: string[] = [];
        if (!name.trim()) errors.push("Name is required");
        if (!email.trim()) errors.push("Email is required");
        else if (
          !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email.trim())
        ) {
          errors.push("Invalid email format");
        }
        if (!position.trim()) errors.push("Position is required");

        return {
          id: `${idx}-${Date.now()}`,
          name,
          email,
          phone,
          position,
          city,
          nationality,
          cnic,
          address,
          skills,
          experience,
          notes,
          immediateJoiner: immediateJoinerRaw,
          status: "pending",
          isValid: errors.length === 0,
          errors,
        };
      });

      setCsvRows(rows);
      showNotification("success", `Parsed ${rows.length} rows successfully`);
    } catch (err) {
      console.error(err);
      showNotification("error", "Failed to parse CSV file");
    }
  };

  const removeCsvRow = (id: string) => {
    if (isProcessing) return;
    setCsvRows((prev) => prev.filter((r) => r.id !== id));
  };

  const clearCsvRows = () => {
    if (isProcessing) return;
    setCsvRows([]);
  };

  const downloadCsvTemplate = () => {
    const headers =
      "Name,Email,Phone,Position,City,Nationality,CNIC,Address,Technical Skills,Experience,Notes,Immediate Joiner\n";
    const sample1 =
      'John Doe,john.doe@example.com,+92 300 1234567,Software Engineer,Islamabad,Pakistani,37405-1234567-1,Street 1 Islamabad,"React, Node.js, TypeScript",3 years,Strong candidate,Yes\n';
    const sample2 =
      'Jane Smith,jane.smith@example.com,+92 321 7654321,Product Manager,Karachi,Pakistani,42101-7654321-1,Street 2 Karachi,"Agile, Jira, Roadmap",5 years,Experienced lead,No\n';

    const blob = new Blob([headers + sample1 + sample2], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "candidate_bulk_upload_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const processCsvUpload = async () => {
    const validRows = csvRows.filter(
      (r) => r.isValid && r.status !== "success",
    );
    if (validRows.length === 0) {
      showNotification("error", "No valid pending candidate rows to upload");
      return;
    }

    setIsProcessing(true);
    let anySuccess = false;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      if (!row.isValid || row.status === "success") continue;

      setCsvRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, status: "processing", message: "Uploading candidate..." }
            : r,
        ),
      );

      try {
        let phoneVal = row.phone.trim();
        let countryCode = "+92";
        const matched = COUNTRY_CODES.find((code) =>
          phoneVal.startsWith(code.value),
        );
        if (matched) {
          countryCode = matched.value;
          phoneVal = phoneVal.replace(matched.value, "").trim();
        }

        const isImmediate =
          row.immediateJoiner.toLowerCase() === "yes" ||
          row.immediateJoiner.toLowerCase() === "true" ||
          row.immediateJoiner === "1";

        const payload = {
          name: row.name.trim(),
          email: row.email.trim(),
          phone: phoneVal ? `${countryCode} ${phoneVal}` : "",
          position: row.position.trim(),
          city: row.city.trim() || null,
          nationality: row.nationality.trim() || null,
          cnic: row.cnic.trim() || null,
          address: row.address.trim() || null,
          technicalSkills: row.skills.trim() || null,
          workExperience: row.experience.trim() || null,
          notes: row.notes.trim() || null,
          immediateJoiner: isImmediate,
          status: CandidateStatus.ACTIVE,
        };

        await api.post(API_ROUTES.CANDIDATES.BASE, payload);

        setCsvRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, status: "success", message: "Created successfully" }
              : r,
          ),
        );
        anySuccess = true;
      } catch (err: any) {
        console.error(`Failed to upload candidate row:`, err);
        setCsvRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  status: "error",
                  message:
                    err.response?.data?.error ||
                    err.message ||
                    "Failed to create",
                }
              : r,
          ),
        );
      }
    }

    setIsProcessing(false);
    if (anySuccess) {
      showNotification("success", "Bulk spreadsheet upload completed");
      onSuccess();
    }
  };

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "pending":
        return <CustomIcon name="Clock" size={16} color="var(--text-muted)" />;
      case "processing":
        return (
          <div
            className="loading-spinner"
            style={{
              width: 16,
              height: 16,
              border: "2px solid var(--accent-primary)",
              borderTopColor: "transparent",
              borderRadius: "50%",
            }}
          />
        );
      case "success":
        return <CustomIcon name="CheckCircle" size={16} color="#10b981" />;
      case "error":
        return <CustomIcon name="AlertCircle" size={16} color="#ef4444" />;
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      setFiles([]);
      setCsvRows([]);
      onClose();
    }
  };

  const isResumesDisabled =
    files.length === 0 ||
    isProcessing ||
    files.every((f) => f.status === "success");
  const isCsvDisabled =
    csvRows.length === 0 ||
    isProcessing ||
    csvRows.every((r) => r.status === "success" || !r.isValid);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Upload Candidates"
      maxWidth="900px"
      footer={
        <>
          <CustomButton
            variant="secondary"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </CustomButton>
          {activeTab === "resumes" ? (
            <CustomButton
              variant="gradient"
              onClick={processFiles}
              loading={isProcessing}
              disabled={isResumesDisabled}
              icon={<CustomIcon name="UploadCloud" size={18} />}
            >
              Start Resume Upload
            </CustomButton>
          ) : (
            <CustomButton
              variant="gradient"
              onClick={processCsvUpload}
              loading={isProcessing}
              disabled={isCsvDisabled}
              icon={<CustomIcon name="UploadCloud" size={18} />}
            >
              Start Spreadsheet Upload
            </CustomButton>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Tab switcher - Hidden for now */}
        {true && (
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid var(--border-glass)",
              paddingBottom: "8px",
              gap: "24px",
            }}
          >
            <button
              onClick={() => !isProcessing && setActiveTab("resumes")}
              style={{
                background: "transparent",
                border: "none",
                color:
                  activeTab === "resumes"
                    ? "var(--accent-primary)"
                    : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.95rem",
                padding: "6px 12px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                borderBottom:
                  activeTab === "resumes"
                    ? "2px solid var(--accent-primary)"
                    : "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <CustomIcon name="Sparkles" size={16} />
              Upload Resumes (AI)
            </button>
            {/* <button
              onClick={() => !isProcessing && setActiveTab("csv")}
              style={{
                background: "transparent",
                border: "none",
                color:
                  activeTab === "csv"
                    ? "var(--accent-primary)"
                    : "var(--text-muted)",
                fontWeight: 600,
                fontSize: "0.95rem",
                padding: "6px 12px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                borderBottom:
                  activeTab === "csv"
                    ? "2px solid var(--accent-primary)"
                    : "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <CustomIcon name="Table" size={16} />
              Upload Spreadsheet (CSV)
            </button> */}
          </div>
        )}

        {/* --- Tab Content: Resumes --- */}
        {activeTab === "resumes" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              style={{
                border: "2px dashed var(--border-glass)",
                borderRadius: "16px",
                padding: "36px 20px",
                textAlign: "center",
                cursor: isProcessing ? "not-allowed" : "pointer",
                background: "rgba(255,255,255,0.02)",
                transition: "all 0.3s ease",
                opacity: isProcessing ? 0.6 : 1,
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (isProcessing) return;
                e.currentTarget.style.borderColor = "var(--accent-primary)";
                e.currentTarget.style.background = "rgba(100, 108, 255, 0.05)";
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                if (isProcessing) return;
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (isProcessing) return;
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                if (e.dataTransfer.files.length > 0) {
                  handleFilesSelect(e.dataTransfer.files);
                }
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept=".pdf,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) handleFilesSelect(e.target.files);
                  e.target.value = "";
                }}
              />
              <CustomIcon
                name="Copy"
                size={32}
                color="var(--text-muted)"
                style={{ marginBottom: "12px" }}
              />
              <h4 style={{ margin: "0 0 8px 0" }}>
                Drop multiple resume files here
              </h4>
              <p
                style={{
                  margin: 0,
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                }}
              >
                Supports PDF and DOCX files.
              </p>
            </div>

            {/* Resume file list */}
            {files.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  maxHeight: "250px",
                  overflowY: "auto",
                  paddingRight: "8px",
                }}
              >
                <h5
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  Selected Resumes ({files.length})
                </h5>
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="glass-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 16px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-glass)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        overflow: "hidden",
                      }}
                    >
                      {getStatusIcon(file.status)}
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {file.file.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color:
                              file.status === "error"
                                ? "#ef4444"
                                : "var(--text-muted)",
                          }}
                        >
                          {file.message ||
                            (file.status === "pending"
                              ? "Waiting to start..."
                              : "")}
                          {file.candidateName && ` • ${file.candidateName}`}
                        </span>
                      </div>
                    </div>
                    {file.status !== "processing" &&
                      file.status !== "success" && (
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          icon={<CustomIcon name="X" size={16} />}
                          onClick={() => removeFile(file.id)}
                          style={{ color: "var(--text-muted)" }}
                        />
                      )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- Tab Content: CSV Spreadsheet --- */}
        {false && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            {/* Template Info Card */}
            <div
              className="glass-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid var(--border-glass)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div
                style={{ display: "flex", gap: "12px", alignItems: "center" }}
              >
                <CustomIcon
                  name="FileSpreadsheet"
                  size={32}
                  color="var(--accent-primary)"
                />
                <div>
                  <h4 style={{ margin: "0 0 4px 0", fontSize: "0.95rem" }}>
                    Use Candidate CSV Template
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Download the template, populate columns (Name, Email, and
                    Position are required), and upload it.
                  </p>
                </div>
              </div>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={downloadCsvTemplate}
                icon={<CustomIcon name="Download" size={16} />}
              >
                Download CSV Template
              </CustomButton>
            </div>

            {/* CSV Dropzone */}
            {csvRows.length === 0 ? (
              <div
                onClick={() =>
                  !isProcessing && csvFileInputRef.current?.click()
                }
                style={{
                  border: "2px dashed var(--border-glass)",
                  borderRadius: "16px",
                  padding: "36px 20px",
                  textAlign: "center",
                  cursor: isProcessing ? "not-allowed" : "pointer",
                  background: "rgba(255,255,255,0.02)",
                  transition: "all 0.3s ease",
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (isProcessing) return;
                  e.currentTarget.style.borderColor = "var(--accent-primary)";
                  e.currentTarget.style.background =
                    "rgba(100, 108, 255, 0.05)";
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (isProcessing) return;
                  e.currentTarget.style.borderColor = "var(--border-glass)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (isProcessing) return;
                  e.currentTarget.style.borderColor = "var(--border-glass)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                  const file = e.dataTransfer.files[0];
                  if (file) handleCsvSelect(file);
                }}
              >
                <input
                  type="file"
                  ref={csvFileInputRef}
                  accept=".csv,text/csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleCsvSelect(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <CustomIcon
                  name="UploadCloud"
                  size={32}
                  color="var(--text-muted)"
                  style={{ marginBottom: "12px" }}
                />
                <h4 style={{ margin: "0 0 8px 0" }}>
                  Drop your candidate CSV file here
                </h4>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                  }}
                >
                  Supports standard comma-separated values (.csv) spreadsheet
                  file.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h5
                    style={{
                      margin: 0,
                      color: "var(--text-secondary)",
                      fontSize: "0.9rem",
                    }}
                  >
                    Candidate Preview List ({csvRows.length} Rows,{" "}
                    {csvRows.filter((r) => r.isValid).length} Valid)
                  </h5>
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={clearCsvRows}
                    disabled={isProcessing}
                    icon={<CustomIcon name="Trash2" size={14} />}
                    style={{ color: "var(--accent-danger)" }}
                  >
                    Clear Spreadsheet
                  </CustomButton>
                </div>

                {/* Validation Preview Table */}
                <div
                  style={{
                    maxHeight: "260px",
                    overflowY: "auto",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "10px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.85rem",
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          borderBottom: "1px solid var(--border-glass)",
                        }}
                      >
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          S.No
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          Name
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          Email
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          Position
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          City
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Immediate Joiner
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            padding: "10px 14px",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                            textAlign: "center",
                          }}
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, idx) => {
                        const hasErr = !row.isValid;
                        return (
                          <tr
                            key={row.id}
                            style={{
                              borderBottom: "1px solid var(--border-glass)",
                              background: hasErr
                                ? "rgba(239, 68, 68, 0.05)"
                                : "transparent",
                            }}
                          >
                            <td
                              style={{
                                padding: "10px 14px",
                                color: "var(--text-muted)",
                              }}
                            >
                              {idx + 1}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                fontWeight: 500,
                                color:
                                  hasErr && !row.name
                                    ? "#ef4444"
                                    : "var(--text-primary)",
                              }}
                            >
                              {row.name || (
                                <span
                                  style={{
                                    fontStyle: "italic",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Missing
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                color:
                                  hasErr &&
                                  (!row.email ||
                                    row.errors.some((e) => e.includes("email")))
                                    ? "#ef4444"
                                    : "var(--text-secondary)",
                              }}
                            >
                              {row.email || (
                                <span
                                  style={{
                                    fontStyle: "italic",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Missing
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                color:
                                  hasErr && !row.position
                                    ? "#ef4444"
                                    : "var(--text-secondary)",
                              }}
                            >
                              {row.position || (
                                <span
                                  style={{
                                    fontStyle: "italic",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  Missing
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                color: "var(--text-muted)",
                              }}
                            >
                              {row.city || "—"}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                textAlign: "center",
                              }}
                            >
                              {row.immediateJoiner.toLowerCase() === "yes" ||
                              row.immediateJoiner.toLowerCase() === "true" ||
                              row.immediateJoiner === "1" ? (
                                <span
                                  style={{
                                    color: "#10b981",
                                    fontSize: "0.75rem",
                                    background: "rgba(16, 185, 129, 0.1)",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 600,
                                  }}
                                >
                                  Yes
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  No
                                </span>
                              )}
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                }}
                              >
                                {getStatusIcon(row.status)}
                                {hasErr && (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#ef4444",
                                    }}
                                    title={row.errors.join(", ")}
                                  >
                                    Invalid
                                  </span>
                                )}
                                {row.message &&
                                  row.status !== "success" &&
                                  row.status !== "error" && (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      {row.message}
                                    </span>
                                  )}
                              </div>
                            </td>
                            <td
                              style={{
                                padding: "10px 14px",
                                textAlign: "center",
                              }}
                            >
                              <CustomButton
                                variant="ghost"
                                size="sm"
                                icon={<CustomIcon name="Trash2" size={14} />}
                                onClick={() => removeCsvRow(row.id)}
                                disabled={isProcessing}
                                style={{ color: "var(--accent-danger)" }}
                                title="Remove candidate from list"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BulkUploadModal;
