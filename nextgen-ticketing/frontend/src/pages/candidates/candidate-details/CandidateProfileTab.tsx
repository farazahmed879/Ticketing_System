import React from "react";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import type { Candidate } from "../../../types";

interface CandidateProfileTabProps {
  candidate: Candidate;
}

export const CandidateProfileTab: React.FC<CandidateProfileTabProps> = ({
  candidate,
}) => {
  return (
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
  );
};
