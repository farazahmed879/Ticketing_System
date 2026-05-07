import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import type { Candidate } from "../../types";
import { format } from "date-fns";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "hiring">("profile");

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await api.get(API_ROUTES.CANDIDATES.BY_ID(id!));
        setCandidate(res.data.candidate);
      } catch (err) {
        console.error("Failed to fetch candidate details", err);
        showNotification("error", "Failed to load candidate details");
        navigate("/candidates");
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [id, navigate, showNotification]);

  const handleConvert = async () => {
    if (!candidate) return;

    if (
      !window.confirm(
        `Are you sure you want to convert ${candidate.name} into a system user?`,
      )
    ) {
      return;
    }

    setIsConverting(true);
    try {
      const res = await api.post(API_ROUTES.CANDIDATES.CONVERT(id!));
      if (res.data.success) {
        showNotification(
          "success",
          `Candidate converted successfully! Temporary password: ${res.data.tempPassword}`,
        );
        setCandidate({ ...candidate, isConverted: true });
      }
    } catch (err: any) {
      console.error("Conversion failed", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to convert candidate",
      );
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!candidate) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Candidate not found.
      </div>
    );
  }

  const statusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "hired":
        return "success";
      case "rejected":
        return "danger";
      case "on hold":
        return "warning";
      default:
        return "primary";
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Back Button */}
      <div style={{ marginBottom: 8 }}>
        <CustomButton
          variant="outline"
          onClick={() => navigate("/candidates")}
          icon={<CustomIcon name="ChevronLeft" size={18} />}
        >
          Back to Candidates
        </CustomButton>
      </div>

      {/* Header Card */}
      <div
        className="glass-card"
        style={{
          padding: "30px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "white",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
            }}
          >
            {candidate.name.charAt(0)}
          </div>
          <div>
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {candidate.name}
            </h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginTop: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    color: "var(--accent-primary)",
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {candidate.position}
                </span>
                <CustomBadge variant={statusBadgeVariant(candidate.status)}>
                  {candidate.status}
                </CustomBadge>
              </div>
              <div
                style={{
                  width: 1,
                  height: 20,
                  background: "var(--border-glass)",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-secondary)",
                    fontSize: "0.95rem",
                  }}
                >
                  <CustomIcon name="Mail" size={16} />
                  {candidate.email}
                </div>
                {candidate.phone && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-secondary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    <CustomIcon name="Phone" size={16} />
                    {candidate.phone}
                  </div>
                )}
                {candidate.address && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-secondary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    <CustomIcon name="MapPin" size={16} />
                    {candidate.address}
                  </div>
                )}
                {candidate.cnic && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "var(--text-secondary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    <CustomIcon name="CreditCard" size={16} />
                    {candidate.cnic}
                  </div>
                )}
              </div>
            </div>

            {/* Social Icons - Now with text fallback */}
            {(candidate.linkedin ||
              candidate.github ||
              candidate.portfolio) && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Professional Links:
                </span>
                <div style={{ display: "flex", gap: 12 }}>
                  {candidate.linkedin && (
                    <a
                      href={candidate.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover-glow"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#0077b5",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "rgba(0,119,181,0.1)",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <CustomIcon name="Linkedin" size={16} />
                      LinkedIn
                    </a>
                  )}
                  {candidate.github && (
                    <a
                      href={candidate.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover-glow"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--text-primary)",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "rgba(255,255,255,0.05)",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <CustomIcon name="Github" size={16} />
                      GitHub
                    </a>
                  )}
                  {candidate.portfolio && (
                    <a
                      href={candidate.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover-glow"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "var(--accent-primary)",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        background: "rgba(124, 58, 237, 0.1)",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                    >
                      <CustomIcon name="Globe" size={16} />
                      Portfolio
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {candidate.resumeUrl && (
            <CustomButton
              variant="gradient"
              onClick={() => window.open(candidate.resumeUrl, "_blank")}
              icon={<CustomIcon name="FileText" size={20} />}
            >
              View Full Resume
            </CustomButton>
          )}

          {candidate.status === "Hired" && !candidate.isConverted && (
            <CustomButton
              variant="gradient"
              onClick={handleConvert}
              loading={isConverting}
              icon={<CustomIcon name="UserPlus" size={20} />}
            >
              Convert to User
            </CustomButton>
          )}

          {candidate.isConverted && (
            <CustomBadge
              variant="success"
              style={{ padding: "8px 16px", fontSize: "0.9rem" }}
            >
              <CustomIcon
                name="CheckCircle"
                size={16}
                style={{ marginRight: 6 }}
              />
              Converted to User
            </CustomBadge>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--border-glass)",
          padding: "0 10px",
        }}
      >
        <button
          onClick={() => setActiveTab("profile")}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "profile"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color:
              activeTab === "profile"
                ? "var(--accent-primary)"
                : "var(--text-muted)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            fontSize: "1rem",
          }}
        >
          Candidate Profile
        </button>
        <button
          onClick={() => setActiveTab("hiring")}
          style={{
            padding: "12px 24px",
            background: "transparent",
            border: "none",
            borderBottom:
              activeTab === "hiring"
                ? "3px solid var(--accent-primary)"
                : "3px solid transparent",
            color:
              activeTab === "hiring"
                ? "var(--accent-primary)"
                : "var(--text-muted)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s",
            fontSize: "1rem",
          }}
        >
          Hiring Process
        </button>
      </div>

      {activeTab === "profile" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 24,
              }}
            >
              {/* Left Column */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <CustomIcon
                      name="Target"
                      size={20}
                      color="var(--accent-primary)"
                    />
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                      Objective / Summary
                    </h3>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      fontSize: "0.95rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {candidate.objective || "No objective provided."}
                  </p>
                </div>

                <div
                  style={{ height: "1px", background: "var(--border-glass)" }}
                />

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <CustomIcon
                      name="Zap"
                      size={20}
                      color="var(--accent-primary)"
                    />
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                      Observing Skills
                    </h3>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {candidate.observingSkills ? (
                      candidate.observingSkills.split(",").map((skill, i) => (
                        <CustomBadge key={i} variant="secondary">
                          {skill.trim()}
                        </CustomBadge>
                      ))
                    ) : (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                        }}
                      >
                        No observing skills recorded.
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{ height: "1px", background: "var(--border-glass)" }}
                />

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <CustomIcon
                      name="Briefcase"
                      size={20}
                      color="var(--accent-primary)"
                    />
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                      Work Experience
                    </h3>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      fontSize: "0.95rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {candidate.workExperience || "No work experience details."}
                  </p>
                </div>
              </div>

              {/* Right Column */}
              <div
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <CustomIcon
                      name="Cpu"
                      size={20}
                      color="var(--accent-primary)"
                    />
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                      Technical Skills
                    </h3>
                  </div>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      fontSize: "0.95rem",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {candidate.technicalSkills || "No technical skills listed."}
                  </p>
                </div>

                {candidate.projects && (
                  <>
                    <div
                      style={{
                        height: "1px",
                        background: "var(--border-glass)",
                      }}
                    />
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <CustomIcon
                          name="FolderKanban"
                          size={20}
                          color="var(--accent-primary)"
                        />
                        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                          Projects
                        </h3>
                      </div>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          lineHeight: 1.6,
                          fontSize: "0.95rem",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {candidate.projects}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {candidate.notes && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  Notes
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  {candidate.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className="animate-fade-in"
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {(candidate as any).interviews?.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 32,
                position: "relative",
                paddingLeft: 40,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 15,
                  top: 20,
                  bottom: 20,
                  width: 2,
                  background:
                    "linear-gradient(to bottom, var(--accent-primary), var(--border-glass))",
                }}
              />

              {(candidate as any).interviews.map(
                (interview: any, index: number) => (
                  <div key={interview.id} style={{ position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -40,
                        top: 0,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background:
                          interview.status === "Completed"
                            ? "var(--accent-success)"
                            : "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 800,
                        zIndex: 1,
                        boxShadow: "0 0 10px rgba(0,0,0,0.3)",
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      className="glass-card"
                      style={{ padding: 0, overflow: "hidden" }}
                    >
                      <div
                        style={{
                          padding: "20px 24px",
                          background: "rgba(255,255,255,0.02)",
                          borderBottom: "1px solid var(--border-glass)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              margin: 0,
                              fontSize: "1.2rem",
                              fontWeight: 700,
                            }}
                          >
                            {interview.title}
                          </h3>
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                              marginTop: 4,
                            }}
                          >
                            <CustomIcon
                              name="Calendar"
                              size={14}
                              style={{ marginRight: 6 }}
                            />
                            {format(new Date(interview.scheduledAt), "PPP p")}
                            <span style={{ margin: "0 10px" }}>•</span>
                            <CustomIcon
                              name="Clock"
                              size={14}
                              style={{ marginRight: 6 }}
                            />
                            {interview.duration} mins
                          </div>
                        </div>
                        <CustomBadge
                          variant={
                            interview.status === "Completed"
                              ? "success"
                              : "primary"
                          }
                        >
                          {interview.status}
                        </CustomBadge>
                      </div>

                      <div style={{ padding: 24 }}>
                        <h4
                          style={{
                            margin: "0 0 16px 0",
                            fontSize: "1rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          Panel Feedback
                        </h4>
                        {interview.feedbacks?.length > 0 ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(400px, 1fr))",
                              gap: 20,
                            }}
                          >
                            {interview.feedbacks.map((fb: any) => (
                              <div
                                key={fb.id}
                                style={{
                                  padding: 16,
                                  borderRadius: 12,
                                  background: "rgba(255,255,255,0.01)",
                                  border: "1px solid var(--border-glass)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 12,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      background: "var(--bg-input)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.8rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {fb.interviewer.fullname.charAt(0)}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontSize: "0.9rem",
                                        fontWeight: 600,
                                      }}
                                    >
                                      {fb.interviewer.fullname}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      Interviewer
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div
                                      style={{
                                        fontSize: "0.95rem",
                                        fontWeight: 700,
                                        color: "var(--accent-primary)",
                                      }}
                                    >
                                      {fb.overallRating}/5
                                    </div>
                                    <div
                                      style={{
                                        fontSize: "0.65rem",
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      Rating
                                    </div>
                                  </div>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--text-muted)",
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    Comments
                                  </span>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: "0.85rem",
                                      color: "var(--text-secondary)",
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {fb.comments || "No comments provided."}
                                  </p>
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderTop: "1px solid var(--border-glass)",
                                    paddingTop: 10,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    Recommendation:
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      fontWeight: 600,
                                      color: fb.recommendation.includes("Hire")
                                        ? "var(--accent-success)"
                                        : "var(--accent-danger)",
                                    }}
                                  >
                                    {fb.recommendation}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "20px 0",
                              color: "var(--text-muted)",
                              background: "rgba(255,255,255,0.01)",
                              borderRadius: 12,
                              border: "1px dashed var(--border-glass)",
                            }}
                          >
                            No feedback submitted for this session yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              className="glass-card"
              style={{ padding: 60, textAlign: "center" }}
            >
              <div
                style={{
                  color: "var(--text-muted)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <CustomIcon name="CalendarOff" size={48} />
                <div>
                  <h3 style={{ margin: 0, color: "var(--text-primary)" }}>
                    No Recruitment Process Started
                  </h3>
                  <p style={{ marginTop: 8 }}>
                    Schedule the first interview to begin the hiring workflow.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CandidateDetail;
