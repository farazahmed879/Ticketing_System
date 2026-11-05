import React from "react";
import type { StandardListLayoutProps } from "../types";
import styles from "./StandardListLayout.module.css";

const StandardListLayout: React.FC<StandardListLayoutProps> = ({
  header,
  filters,
  children,
  pagination,
  height = "calc(100vh - 90px)",
}) => {
  return (
    <div
      className={`animate-fade-in ${styles.layout}`}
      style={{ ["--layout-height" as any]: height }}
    >
      {header && <div className={styles.headerSlot}>{header}</div>}
      {filters && <div className={styles.filtersSlot}>{filters}</div>}

      <div
        className={`${styles.contentSlot} ${pagination ? styles.contentWithPagination : ""}`}
      >
        {children}
      </div>

      {pagination && (
        <div className={`glass-card ${styles.paginationSlot}`}>
          {pagination}
        </div>
      )}
    </div>
  );
};

export default StandardListLayout;
