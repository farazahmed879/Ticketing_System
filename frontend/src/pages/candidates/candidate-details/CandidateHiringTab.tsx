import React from "react";
import { format } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import type { Candidate } from "../../../types";

interface CandidateHiringTabProps {
  candidate: Candidate;
}

export const CandidateHiringTab: React.FC<CandidateHiringTabProps> = ({
  candidate,
}) => {
  const interviews = (candidate as any).interviews || [];

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {interviews.length > 0 ? (
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

          {interviews.map((interview: any, index: number) => (
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
          ))}
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
  );
};
