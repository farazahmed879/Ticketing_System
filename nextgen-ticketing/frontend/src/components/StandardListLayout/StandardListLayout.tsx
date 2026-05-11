import React from "react";

interface StandardListLayoutProps {
  header?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode; // Usually the scrollable table area
  pagination?: React.ReactNode;
  height?: string;
}

const StandardListLayout: React.FC<StandardListLayoutProps> = ({
  header,
  filters,
  children,
  pagination,
  height = "calc(100vh - 150px)",
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
      {header && <div style={{ marginBottom: 24 }}>{header}</div>}
      {filters && <div style={{ marginBottom: 24 }}>{filters}</div>}
      
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", marginBottom: pagination ? "20px" : 0 }}>
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
