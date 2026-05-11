import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomButton from "../../../components/CustomButton";
import CustomChipInput from "../../../components/CustomChipInput";
import PhoneInput from "../../../components/PhoneInput";
import { CandidateStatus, COUNTRY_CODES } from "../../../utils/constants";
import {
  extractTextFromFile,
  parseResumeData,
  type ResumeData,
} from "../../../utils/resumeParser";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import styles from "./CandidateForm.module.css";
import type { Candidate, CandidateFormData } from "../../../types";

interface CandidateFormProps {
  initialData?: Candidate | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const CandidateForm: React.FC<CandidateFormProps> = ({
  initialData,
  onSubmit,
}) => {
  const { showNotification } = useNotification();

  // Form handling
  const { handleSubmit, control, setValue, getValues, reset } =
    useForm<CandidateFormData>({
      defaultValues: {
        name: "",
        email: "",
        phone: "",
        position: "",
        resumeUrl: "",
        notes: "",
        status: "Active",
        countryCode: "+92",
        cnic: "",
        address: "",
        linkedin: "",
        portfolio: "",
        github: "",
        projects: "",
        dob: "",
        nationality: "",
        city: "",
        observingSkills: "",
      },
    });

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData>({
    objective: "",
    technicalSkills: "",
    workExperience: "",
    projects: "",
    rawText: "",
  });
  const [hasUploadedResume, setHasUploadedResume] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      // Parse phone and country code
      let phoneVal = initialData.phone || "";
      let matchedCode = "+92";
      const matched = COUNTRY_CODES.find((code) =>
        phoneVal.startsWith(code.value),
      );
      if (matched) {
        matchedCode = matched.value;
        phoneVal = phoneVal.replace(matched.value, "").trim();
      }

      reset({
        name: initialData.name,
        email: initialData.email,
        phone: phoneVal,
        position: initialData.position,
        resumeUrl: initialData.resumeUrl || "",
        notes: initialData.notes || "",
        status: initialData.status,
        countryCode: matchedCode,
        cnic: initialData.cnic || "",
        address: initialData.address || "",
        linkedin: initialData.linkedin || "",
        portfolio: initialData.portfolio || "",
        github: initialData.github || "",
        projects: initialData.projects || "",
        dob: initialData.dob
          ? new Date(initialData.dob).toISOString().split("T")[0]
          : "",
        nationality: initialData.nationality || "",
        city: initialData.city || "",
        observingSkills: initialData.observingSkills || "",
      });

      if (
        initialData.objective ||
        initialData.technicalSkills ||
        initialData.workExperience ||
        initialData.projects
      ) {
        setResumeData({
          objective: initialData.objective || "",
          technicalSkills: initialData.technicalSkills || "",
          workExperience: initialData.workExperience || "",
          projects: initialData.projects || "",
          rawText: "",
        });
        setExpandedSections({
          objective: true,
          technicalSkills: true,
          workExperience: true,
          projects: true,
        });
        setHasUploadedResume(!!initialData.resumeUrl);
      }
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        position: "",
        resumeUrl: "",
        notes: "",
        status: "Active",
        countryCode: "+92",
        cnic: "",
        address: "",
        linkedin: "",
        portfolio: "",
        github: "",
        projects: "",
        dob: "",
        nationality: "",
        city: "",
        observingSkills: "",
      });
      setResumeData({
        objective: "",
        technicalSkills: "",
        workExperience: "",
        projects: "",
        rawText: "",
      });
      setHasUploadedResume(false);
      setExpandedSections({});
    }
  }, [initialData, reset]);

  const handleResumeSelect = async (file: File) => {
    setResumeFile(file);
    setResumeUploading(true);
    setHasUploadedResume(false);
    setExpandedSections({});

    try {
      const text = await extractTextFromFile(file);
      const parsed = parseResumeData(text);
      setResumeData(parsed);
      setExpandedSections({
        objective: true,
        technicalSkills: true,
        workExperience: true,
        projects: true,
      });

      if (parsed.name) setValue("name", parsed.name);
      if (parsed.email) setValue("email", parsed.email);
      if (parsed.cnic) setValue("cnic", parsed.cnic);
      if (parsed.address) setValue("address", parsed.address);
      if (parsed.linkedin) setValue("linkedin", parsed.linkedin);
      if (parsed.portfolio) setValue("portfolio", parsed.portfolio);
      if (parsed.github) setValue("github", parsed.github);
      if (parsed.projects) setValue("projects", parsed.projects);
      if (parsed.dob) {
        try {
          const date = new Date(parsed.dob);
          if (!isNaN(date.getTime())) {
            setValue("dob", date.toISOString().split("T")[0]);
          }
        } catch (e) {}
      }
      if (parsed.nationality) setValue("nationality", parsed.nationality);
      if (parsed.city) setValue("city", parsed.city);

      if (parsed.phone) {
        const extractedPhone = parsed.phone;
        const matchedCode = COUNTRY_CODES.find((code) =>
          extractedPhone.startsWith(code.value),
        );
        if (matchedCode) {
          setValue("countryCode", matchedCode.value);
          setValue(
            "phone",
            extractedPhone.replace(matchedCode.value, "").trim(),
          );
        } else {
          setValue("phone", extractedPhone);
        }
      }

      const formData = new FormData();
      formData.append("resume", file);
      try {
        const uploadRes = await api.post(
          API_ROUTES.CANDIDATES.UPLOAD_RESUME,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        if (uploadRes.data.driveUrl) {
          setValue("resumeUrl", uploadRes.data.driveUrl);
          setHasUploadedResume(true);
          if (uploadRes.data.parsedData) {
            const serverParsed = uploadRes.data.parsedData;
            // Only populate if not already set by client-side parsing
            const currentValues = getValues();

            if (serverParsed.dob && !currentValues.dob) {
              const date = new Date(serverParsed.dob);
              if (!isNaN(date.getTime())) {
                setValue("dob", date.toISOString().split("T")[0]);
              }
            }
            if (serverParsed.nationality && !currentValues.nationality) {
              setValue("nationality", serverParsed.nationality);
            }
            if (serverParsed.city && !currentValues.city) {
              setValue("city", serverParsed.city);
            }
          }
          showNotification("success", "Resume uploaded to Google Drive");
        }
      } catch (uploadErr: any) {
        console.warn(
          "Google Drive upload skipped:",
          uploadErr.response?.data?.error || uploadErr.message,
        );
        showNotification("warning", "Resume parsed but Drive upload failed.");
      }
    } catch (err: any) {
      console.error("Resume processing failed:", err);
      showNotification("error", "Failed to process resume");
      setResumeFile(null);
    } finally {
      setResumeUploading(false);
    }
  };

  const handleFormSubmit = (formData: CandidateFormData) => {
    const fullPhone = formData.phone
      ? `${formData.countryCode} ${formData.phone.trim()}`
      : "";

    // Remove countryCode from the data sent to the backend
    const { countryCode, ...data } = formData;

    const payload = {
      ...data,
      observingSkills: formData.observingSkills || null,
      phone: fullPhone,
      cnic: data.cnic || null,
      address: data.address || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      github: data.github || null,
      projects: data.projects || resumeData.projects || null,
      objective: resumeData.objective || null,
      technicalSkills: resumeData.technicalSkills || null,
      workExperience: resumeData.workExperience || null,
    };
    onSubmit(payload);
  };

  const handleReset = () => {
    reset({
      name: "",
      email: "",
      phone: "",
      position: "",
      resumeUrl: "",
      notes: "",
      status: "Active",
      countryCode: "+92",
      cnic: "",
      address: "",
      linkedin: "",
      portfolio: "",
      github: "",
      projects: "",
      dob: "",
      nationality: "",
      city: "",
      observingSkills: "",
    });
    setResumeData({
      objective: "",
      technicalSkills: "",
      workExperience: "",
      projects: "",
      rawText: "",
    });
    setResumeFile(null);
    setHasUploadedResume(false);
    setExpandedSections({});
  };

  return (
    <div className={styles.formContainer}>
      <form
        id="candidate-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        onReset={(e) => {
          e.preventDefault();
          handleReset();
        }}
        className={styles.formGrid}
      >
        {/* LEFT COLUMN - Candidate Details */}
        <div className={styles.leftColumn}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <CustomIcon
              name="UserPlus"
              size={18}
              color="var(--accent-primary)"
            />
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Candidate Details
            </span>
          </div>

          <CustomInput
            name="name"
            control={control}
            rules={{ required: "Full name is required" }}
            label="Full Name"
            type="text"
            placeholder="John Doe"
            required
          />

          <div className={styles.twoColGrid}>
            <CustomInput
              name="position"
              control={control}
              rules={{ required: "Position is required" }}
              label="Position"
              type="text"
              placeholder="e.g. Senior Developer"
              required
            />

            <CustomSelect
              name="status"
              control={control}
              label="Status"
              options={Object.values(CandidateStatus).map((s) => ({
                label: s,
                value: s,
              }))}
            />
          </div>

          <div className={styles.twoColGrid}>
            <PhoneInput
              label="Phone"
              control={control}
              name="phone"
              countryCodeName="countryCode"
              placeholder="234 567 890"
            />

            <CustomInput
              name="email"
              control={control}
              rules={{ required: "Email is required" }}
              label="Email"
              type="email"
              placeholder="john@example.com"
              required
            />
          </div>
          <div className={styles.twoColGrid}>
            <CustomInput
              name="dob"
              control={control}
              label="Date of Birth"
              type="date"
            />
            <CustomInput
              name="cnic"
              control={control}
              label="CNIC"
              type="text"
              placeholder="12345-1234567-1"
            />
          </div>
          <div className={styles.twoColGrid}>
            <CustomInput
              name="nationality"
              control={control}
              label="Nationality"
              type="text"
              placeholder="e.g. Pakistani"
            />

            <CustomInput
              name="city"
              control={control}
              label="City"
              type="text"
              placeholder="e.g. Islamabad"
            />
          </div>

          <CustomChipInput
            name="observingSkills"
            control={control}
            label="Observing Skills"
            placeholder="Type and press Enter (e.g. Punctual, Fast Learner)"
            icon={<CustomIcon name="Zap" size={16} />}
          />

          <div className={styles.twoColGrid}>
            <CustomInput
              name="linkedin"
              control={control}
              label="LinkedIn Profile"
              type="url"
              placeholder="https://linkedin.com/in/username"
            />
            <CustomInput
              name="github"
              control={control}
              label="GitHub Profile"
              type="url"
              placeholder="https://github.com/username"
            />
          </div>
          <div className={styles.twoColGrid}>
            <CustomInput
              name="portfolio"
              control={control}
              label="Portfolio / Website"
              type="url"
              placeholder="https://yourportfolio.com"
            />

            <CustomInput
              name="resumeUrl"
              control={control}
              label="Resume URL"
              type="url"
              placeholder="Auto-populated or paste manually"
            />
          </div>

          <CustomTextArea
            name="address"
            control={control}
            label="Home Address"
            placeholder="Full home address..."
            rows={2}
          />

          <CustomTextArea
            name="notes"
            control={control}
            label="Notes"
            placeholder="Additional notes about the candidate..."
            rows={4}
          />
        </div>

        {/* RIGHT COLUMN - Resume Upload & Extracted Data */}
        <div className={styles.rightColumn}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <CustomIcon
              name="Sparkles"
              size={18}
              color="var(--accent-primary)"
            />
            <span
              style={{
                fontSize: "0.95rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Resume Analysis (AI)
            </span>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed var(--border-glass)",
              borderRadius: 16,
              padding: 30,
              textAlign: "center",
              cursor: "pointer",
              background: "rgba(255,255,255,0.02)",
              transition: "all 0.3s ease",
              position: "relative",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--accent-primary)";
              e.currentTarget.style.background = "rgba(100, 108, 255, 0.05)";
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.style.borderColor = "var(--border-glass)";
              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleResumeSelect(file);
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) =>
                e.target.files?.[0] && handleResumeSelect(e.target.files[0])
              }
              accept=".pdf,.docx"
              style={{ display: "none" }}
            />

            {resumeUploading ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  className="loading-spinner"
                  style={{ width: 30, height: 30 }}
                />
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}
                >
                  Processing resume...
                </span>
              </div>
            ) : resumeFile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                }}
              >
                <CustomIcon name="FileCheck" size={20} color="#4caf50" />
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 200,
                  }}
                >
                  {resumeFile.name}
                </span>
                <CustomButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    setResumeData({
                      objective: "",
                      technicalSkills: "",
                      workExperience: "",
                      projects: "",
                      rawText: "",
                    });
                    setValue("resumeUrl", "");
                    setExpandedSections({});
                  }}
                  icon={<CustomIcon name="X" size={16} />}
                  style={{
                    color: "var(--accent-danger)",
                    padding: 4,
                  }}
                />
              </div>
            ) : (
              <div>
                <CustomIcon name="Upload" size={32} color="var(--text-muted)" />
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    marginTop: 8,
                  }}
                >
                  Drop resume here or{" "}
                  <span
                    style={{ color: "var(--accent-primary)", fontWeight: 600 }}
                  >
                    browse
                  </span>
                </p>
                <p
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.7rem",
                    marginTop: 4,
                    opacity: 0.7,
                  }}
                >
                  PDF or DOCX — Max 10MB
                </p>
              </div>
            )}
          </div>

          {/* Extracted Resume Sections */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {(
              [
                "objective",
                "technicalSkills",
                "workExperience",
                "projects",
              ] as const
            ).map((key) => {
              const labels: Record<string, string> = {
                objective: "Objective / Summary",
                technicalSkills: "Technical Skills",
                workExperience: "Work Experience",
                projects: "Projects",
              };
              const icons: Record<string, string> = {
                objective: "Target",
                technicalSkills: "Cpu",
                workExperience: "Briefcase",
                projects: "FolderKanban",
              };
              const isExpanded =
                expandedSections[key] ||
                (!hasUploadedResume && !!resumeData[key]);
              const hasData = !!resumeData[key];

              return (
                <div
                  key={key}
                  className="glass-card"
                  style={{
                    borderRadius: 10,
                    overflow: "hidden",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <div
                    onClick={() =>
                      setExpandedSections((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    style={{
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      background: isExpanded
                        ? "rgba(255,255,255,0.03)"
                        : "transparent",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <CustomIcon
                        name={icons[key] as any}
                        size={16}
                        color={
                          hasData
                            ? "var(--accent-primary)"
                            : "var(--text-muted)"
                        }
                      />
                      <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                        {labels[key]}
                      </span>
                      {hasData && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            background: "rgba(76, 175, 80, 0.1)",
                            color: "#4caf50",
                            padding: "2px 8px",
                            borderRadius: 10,
                          }}
                        >
                          Found
                        </span>
                      )}
                    </div>
                    <CustomIcon
                      name={isExpanded ? "ChevronUp" : "ChevronDown"}
                      size={14}
                      color="var(--text-muted)"
                    />
                  </div>
                  {isExpanded && (
                    <div
                      style={{
                        padding: 16,
                        borderTop: "1px solid var(--border-glass)",
                        background: "rgba(0,0,0,0.1)",
                      }}
                    >
                      <textarea
                        value={resumeData[key] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResumeData((prev) => ({ ...prev, [key]: val }));
                        }}
                        placeholder={`Enter ${labels[key]}...`}
                        style={{
                          width: "100%",
                          minHeight: 120,
                          background: "transparent",
                          border: "none",
                          color: "var(--text-secondary)",
                          fontSize: "0.85rem",
                          lineHeight: 1.5,
                          resize: "vertical",
                          outline: "none",
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CandidateForm;
