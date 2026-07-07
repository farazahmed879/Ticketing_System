import React from "react";
import type { StandardListLayoutProps } from "../types";

const StandardListLayout: React.FC<StandardListLayoutProps> = ({
  header,
  filters,
  children,
  pagination,
  // Fill the viewport minus the chrome above/below the page container
  // (56px topbar + 16px top/bottom page padding ≈ 88px).
  height = "calc(100vh - 90px)",
}) => {
  return (
    <div
      className="animate-fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        height,
        overflow: "hidden",
      }}
    >
      {header && <div style={{ marginBottom: 14 }}>{header}</div>}
      {filters && <div style={{ marginBottom: 14 }}>{filters}</div>}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          marginBottom: pagination ? "12px" : 0,
        }}
      >
        {children}
      </div>

      {pagination && (
        <div
          className="glass-card"
          style={{
            padding: 0,
            zIndex: 10,
            borderTop: "1px solid var(--border-glass)",
            backdropFilter: "var(--blur-md)",
            background: "var(--bg-card)",
          }}
        >
          {pagination}
        </div>
      )}
    </div>
  );
};

export default StandardListLayout;
