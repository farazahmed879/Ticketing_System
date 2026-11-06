import React from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomBadge from "../../../components/CustomBadge";
import type { Candidate } from "../../../types";
import styles from "./CandidateDetail.module.css";

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
    <div className={`glass-card ${styles.header}`}>
      <div className={styles.headerMain}>
        <CustomButton
          variant="ghost"
          onClick={() => navigate("/candidates")}
          icon={<CustomIcon name="ArrowLeft" size={20} />}
          className={styles.backButton}
        />
        <div className={styles.avatar}>{candidate.name.charAt(0)}</div>
        <div className={styles.headerInfo}>
          <h1 className={styles.name}>{candidate.name}</h1>
          <div className={styles.metaRow}>
            <div className={styles.positionGroup}>
              <span className={styles.position}>{candidate.position}</span>
              <CustomBadge variant={statusBadgeVariant(candidate.status)}>
                {candidate.status}
              </CustomBadge>
            </div>
            <div className={styles.contactList}>
              <div className={styles.contactItem}>
                <CustomIcon name="Mail" size={16} />
                {candidate.email}
              </div>
              {candidate.phone && (
                <div className={styles.contactItem}>
                  <CustomIcon name="Phone" size={16} />
                  {candidate.phone}
                </div>
              )}
              {candidate.address && (
                <div className={styles.contactItem}>
                  <CustomIcon name="MapPin" size={16} />
                  {candidate.address}
                </div>
              )}
              {candidate.cnic && (
                <div className={styles.contactItem}>
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
            <div className={styles.linksRow}>
              <span className={styles.rowLabel}>Professional Links:</span>
              <div className={styles.links}>
                {candidate.linkedin && (
                  <a
                    href={candidate.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover-glow ${styles.socialLink} ${styles.linkedin}`}
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
                    className={`hover-glow ${styles.socialLink} ${styles.github}`}
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
                    className={`hover-glow ${styles.socialLink} ${styles.portfolio}`}
                  >
                    <CustomIcon name="Globe" size={16} />
                    Portfolio
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Meta Tags */}
          {candidate.metaTags && (
            <div className={styles.tagsRow}>
              <span className={styles.rowLabel}>Tags:</span>
              {candidate.metaTags.split(",").map((tag, i) => (
                <CustomBadge
                  key={i}
                  variant="secondary"
                  style={{
                    padding: "4px 10px",
                    fontSize: "0.8rem",
                    borderRadius: 6,
                  }}
                >
                  {tag.trim()}
                </CustomBadge>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={styles.headerActions}>
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
