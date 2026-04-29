import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomButton from "../../../components/CustomButton";
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
  isLoading: isSubmitting = false,
}) => {
  const { showNotification } = useNotification();

  // Form handling
  const { handleSubmit, control, setValue, getValues, reset } = useForm<CandidateFormData>(
    {
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
      },
    },
  );

  // Resume upload state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
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
        dob: initialData.dob ? new Date(initialData.dob).toISOString().split('T')[0] : "",
        nationality: initialData.nationality || "",
        city: initialData.city || "",
      });

      if (
        initialData.objective ||
        initialData.technicalSkills ||
        initialData.workExperience ||
        initialData.projects
      ) {
        setResumeData({
          objective: initialData.objective || "No objective section found",
          technicalSkills:
            initialData.technicalSkills || "No technical skills section found",
          workExperience:
            initialData.workExperience || "No work experience section found",
          projects: initialData.projects || "No projects section found",
          rawText: "",
        });
        setExpandedSections({
          objective: true,
          technicalSkills: true,
          workExperience: true,
          projects: true,
        });
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
      });
      setResumeData(null);
      setExpandedSections({});
    }
  }, [initialData, reset]);

  const handleResumeSelect = async (file: File) => {
    setResumeFile(file);
    setResumeUploading(true);
    setResumeData(null);
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
      if (parsed.projects && parsed.projects !== "No projects section found")
        setValue("projects", parsed.projects);
      if (parsed.dob) {
        try {
          const date = new Date(parsed.dob);
          if (!isNaN(date.getTime())) {
            setValue("dob", date.toISOString().split('T')[0]);
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
        if (uploadRes.data.success && uploadRes.data.driveUrl) {
          setValue("resumeUrl", uploadRes.data.driveUrl);
          if (uploadRes.data.parsedData) {
            const serverParsed = uploadRes.data.parsedData;
            // Only populate if not already set by client-side parsing
            const currentValues = getValues();
            
            if (serverParsed.dob && !currentValues.dob) {
                const date = new Date(serverParsed.dob);
                if (!isNaN(date.getTime())) {
                  setValue("dob", date.toISOString().split('T')[0]);
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
      phone: fullPhone,
      cnic: data.cnic || null,
      address: data.address || null,
      linkedin: data.linkedin || null,
      portfolio: data.portfolio || null,
      github: data.github || null,
      projects:
        data.projects ||
        (resumeData?.projects?.startsWith("No ")
          ? null
          : resumeData?.projects || null),
      objective: resumeData?.objective?.startsWith("No ")
        ? null
        : resumeData?.objective || null,
      technicalSkills: resumeData?.technicalSkills?.startsWith("No ")
        ? null
        : resumeData?.technicalSkills || null,
      workExperience: resumeData?.workExperience?.startsWith("No ")
        ? null
        : resumeData?.workExperience || null,
    };
    onSubmit(payload);
  };

  return (
    <div style={{ width: "100%", maxHeight: "70vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 24,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          minHeight: 0,
        }}
      >
      {/* LEFT COLUMN - Candidate Details */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          minHeight: 0,
          paddingRight: 16,
          borderRight: "1px solid var(--border-glass)",
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <CustomIcon name="UserPlus" size={18} color="var(--accent-primary)" />
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

        <CustomInput
          name="email"
          control={control}
          rules={{ required: "Email is required" }}
          label="Email"
          type="email"
          placeholder="john@example.com"
          required
        />

        <CustomInput
          name="position"
          control={control}
          rules={{ required: "Position is required" }}
          label="Position"
          type="text"
          placeholder="e.g. Senior Developer"
          required
        />

        <PhoneInput
          label="Phone"
          control={control}
          name="phone"
          countryCodeName="countryCode"
          placeholder="234 567 890"
        />

        <CustomInput
          name="cnic"
          control={control}
          label="CNIC"
          type="text"
          placeholder="12345-1234567-1"
        />

        <CustomTextArea
          name="address"
          control={control}
          label="Home Address"
          placeholder="Full home address..."
          rows={2}
        />

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <CustomInput
            name="dob"
            control={control}
            label="Date of Birth"
            type="date"
          />
          <CustomInput
            name="nationality"
            control={control}
            label="Nationality"
            type="text"
            placeholder="e.g. Pakistani"
          />
        </div>

        <CustomInput
          name="city"
          control={control}
          label="City"
          type="text"
          placeholder="e.g. Islamabad"
        />

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
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

        <CustomSelect
          name="status"
          control={control}
          label="Status"
          options={Object.values(CandidateStatus).map((s) => ({
            label: s,
            value: s,
          }))}
        />

        <CustomTextArea
          name="notes"
          control={control}
          label="Notes"
          placeholder="Additional notes about the candidate..."
          rows={4}
        />

        <CustomButton
          type="submit"
          variant="gradient"
          fullWidth
          loading={isSubmitting}
          style={{ marginTop: 6 }}
        >
          {initialData ? "Update Candidate" : "Create Candidate"}
        </CustomButton>
      </div>

      {/* RIGHT COLUMN - Resume Upload & Extracted Data */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          minWidth: 0,
          minHeight: 0,
          overflowY: "auto",
          paddingRight: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <CustomIcon name="Sparkles" size={18} color="var(--accent-primary)" />
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
              <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
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
                  setResumeData(null);
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
        {resumeData ? (
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
              const isExpanded = expandedSections[key];
              const hasData =
                resumeData[key] && !resumeData[key].startsWith("No ");

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
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        borderTop: "1px solid var(--border-glass)",
                        background: "rgba(0,0,0,0.1)",
                      }}
                    >
                      {resumeData[key]}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              gap: 16,
              opacity: 0.5,
            }}
          >
            <CustomIcon name="FileSearch" size={40} />
            <p style={{ fontSize: "0.85rem", textAlign: "center" }}>
              Upload a resume to automatically <br /> extract professional
              details.
            </p>
          </div>
        )}
      </div>
      </form>
    </div>
  );
};

export default CandidateForm;
