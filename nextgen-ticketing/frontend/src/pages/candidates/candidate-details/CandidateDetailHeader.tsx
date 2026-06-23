import React from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomBadge from "../../../components/CustomBadge";
import type { Candidate } from "../../../types";

interface CandidateDetailHeaderProps {
  candidate: Candidate;
  isConverting: boolean;
  onConvert: () => void;
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

export const CandidateDetailHeader: React.FC<CandidateDetailHeaderProps> = ({
  candidate,
  isConverting,
  onConvert,
}) => {
  const navigate = useNavigate();

  return (
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
        <CustomButton
          variant="ghost"
          onClick={() => navigate("/candidates")}
          icon={<CustomIcon name="ArrowLeft" size={20} />}
          style={{ 
            width: 40, 
            height: 40, 
            padding: 0, 
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-glass)'
          }}
        />
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
            onClick={onConvert}
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
  );
};
