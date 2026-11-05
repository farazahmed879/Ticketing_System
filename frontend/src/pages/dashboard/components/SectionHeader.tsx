import React from "react";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

interface SectionHeaderProps {
  /** lucide icon name */
  icon: string;
  /** CSS colour (usually an accent variable) used to tint the icon tile */
  tone: string;
  title: string;
  /** Small muted text next to the title, e.g. a count */
  meta?: React.ReactNode;
  /** Extra controls rendered before the expand button */
  action?: React.ReactNode;
  onExpand?: () => void;
  expandDisabled?: boolean;
  expandLabel?: string;
}

/**
 * Shared header for every dashboard section so they all read as one system:
 * tinted icon tile + neutral title + optional meta, with the expand control
 * on the right.
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  tone,
  title,
  meta,
  action,
  onExpand,
  expandDisabled,
  expandLabel = "Expand",
}) => (
  <div className={styles.sectionHead}>
    <div className={styles.sectionTitleGroup}>
      <span
        className={styles.sectionIcon}
        style={{ "--tone": tone } as React.CSSProperties}
        aria-hidden="true"
      >
        <CustomIcon name={icon} size={16} />
      </span>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {meta !== undefined && meta !== null && meta !== "" && (
        <span className={styles.sectionMeta}>{meta}</span>
      )}
    </div>
    <div className={styles.sectionActions}>
      {action}
      {onExpand && (
        <button
          type="button"
          className={styles.expandSectionBtn}
          onClick={onExpand}
          disabled={expandDisabled}
          title={expandLabel}
          aria-label={`${expandLabel}: ${title}`}
        >
          <CustomIcon name="Maximize2" size={15} />
        </button>
      )}
    </div>
  </div>
);

export default SectionHeader;
