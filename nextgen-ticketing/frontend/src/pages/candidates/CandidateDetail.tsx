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
import { DetailSkeleton } from "../../components/CustomSkeleton";

const CandidateDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);

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
        <CustomButton variant="outline" onClick={() => navigate("/candidates")} icon={<CustomIcon name="ChevronLeft" size={18} />}>
          Back to Candidates
        </CustomButton>
      </div>

      {/* Header Card */}
      <div className="glass-card" style={{ padding: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ 
            width: 70, 
            height: 70, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            color: 'white',
            boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)'
          }}>
            {candidate.name.charAt(0)}
          </div>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {candidate.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <span style={{ color: "var(--text-secondary)", fontSize: "1rem", fontWeight: 500 }}>
                {candidate.position}
              </span>
              <CustomBadge variant={statusBadgeVariant(candidate.status)}>
                {candidate.status}
              </CustomBadge>
            </div>
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
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}
      >
        {/* Main Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Resume Data Sections */}
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

            <div style={{ height: "1px", background: "var(--border-glass)" }} />

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

            <div style={{ height: "1px", background: "var(--border-glass)" }} />

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

            {candidate.projects && (
              <>
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
                      name="FolderKanban"
                      size={20}
                      color="var(--accent-primary)"
                    />
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Projects</h3>
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

          {/* Interview History */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <CustomIcon
                name="Calendar"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                Interview History
              </h3>
            </div>

            {(candidate as any).interviews?.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {(candidate as any).interviews.map((interview: any) => (
                  <div
                    key={interview.id}
                    onClick={() => navigate(`/interviews/${interview.id}`)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-glass)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {interview.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                          marginTop: 4,
                        }}
                      >
                        {format(new Date(interview.scheduledAt), "PPP p")}
                      </div>
                    </div>
                    <CustomBadge
                      variant={
                        interview.status === "Completed" ? "success" : "primary"
                      }
                    >
                      {interview.status}
                    </CustomBadge>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                }}
              >
                No interviews scheduled yet.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            className="glass-card"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              Contact Info
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon name="Mail" size={18} color="var(--text-muted)" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Email
                  </span>
                  <span style={{ fontSize: "0.9rem" }}>{candidate.email}</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <CustomIcon name="Phone" size={18} color="var(--text-muted)" />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                    }}
                  >
                    Phone
                  </span>
                  <span style={{ fontSize: "0.9rem" }}>
                    {candidate.phone || "—"}
                  </span>
                </div>
              </div>

              {candidate.cnic && (
                <div style={{ display: "flex", gap: 12 }}>
                  <CustomIcon
                    name="CreditCard"
                    size={18}
                    color="var(--text-muted)"
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      CNIC
                    </span>
                    <span style={{ fontSize: "0.9rem" }}>{candidate.cnic}</span>
                  </div>
                </div>
              )}

              {candidate.address && (
                <div style={{ display: "flex", gap: 12 }}>
                  <CustomIcon
                    name="MapPin"
                    size={18}
                    color="var(--text-muted)"
                  />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      Address
                    </span>
                    <span style={{ fontSize: "0.9rem" }}>
                      {candidate.address}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Social Links */}
          {(candidate.linkedin || candidate.github || candidate.portfolio) && (
            <div
              className="glass-card"
              style={{
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 20,
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
                Professional Links
              </h3>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {candidate.linkedin && (
                  <a
                    href={candidate.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <CustomIcon name="Linkedin" size={18} color="#0077b5" />
                    LinkedIn Profile
                  </a>
                )}
                {candidate.github && (
                  <a
                    href={candidate.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <CustomIcon name="Github" size={18} />
                    GitHub Repository
                  </a>
                )}
                {candidate.portfolio && (
                  <a
                    href={candidate.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "var(--text-primary)",
                      textDecoration: "none",
                      fontSize: "0.9rem",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    <CustomIcon
                      name="Globe"
                      size={18}
                      color="var(--accent-primary)"
                    />
                    Portfolio / Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
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
    </div>
  );
};

export default CandidateDetail;
