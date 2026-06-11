import React from "react";
import CustomSkeleton from "../../../../components/CustomSkeleton";

const ModalSkeleton: React.FC = () => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.6fr 1fr",
        gap: 30,
        padding: "10px 0",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Left Skeleton */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <CustomSkeleton width={140} height={36} borderRadius={8} />
          <CustomSkeleton width={180} height={36} borderRadius={8} />
          <CustomSkeleton width={160} height={36} borderRadius={8} />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <CustomSkeleton width={100} height={14} />
            <CustomSkeleton width="100%" height={200} borderRadius={12} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <CustomSkeleton width={80} height={14} />
                <CustomSkeleton width="100%" height={60} borderRadius={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Right Skeleton (Comments) */}
      <div
        style={{
          borderLeft: "1px solid var(--border-glass)",
          paddingLeft: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <CustomSkeleton width={140} height={18} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-card"
            style={{
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <CustomSkeleton width={100} height={12} />
              <CustomSkeleton width={60} height={10} />
            </div>
            <CustomSkeleton width="90%" height={14} />
          </div>
        ))}
        <CustomSkeleton
          width="100%"
          height={48}
          borderRadius={10}
          style={{ marginTop: "auto" }}
        />
      </div>
    </div>
  );
};

export default ModalSkeleton;
