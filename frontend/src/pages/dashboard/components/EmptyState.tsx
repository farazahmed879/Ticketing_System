import React from "react";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

interface EmptyStateProps {
  icon: string;
  title: string;
  hint?: string;
}

/** Compact, consistent empty state for dashboard sections. */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, hint }) => (
  <div className={styles.emptyState}>
    <span className={styles.emptyStateIcon} aria-hidden="true">
      <CustomIcon name={icon} size={20} />
    </span>
    <p className={styles.emptyStateTitle}>{title}</p>
    {hint && <p className={styles.emptyStateHint}>{hint}</p>}
  </div>
);

export default EmptyState;
