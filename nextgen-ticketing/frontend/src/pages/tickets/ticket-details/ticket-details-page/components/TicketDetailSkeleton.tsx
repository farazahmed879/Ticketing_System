import React from "react";
import styles from "../TicketDetail.module.css";

const TicketDetailSkeleton: React.FC = () => {
  return (
    <div className={`${styles.container} animate-fade-in`}>
      {/* Left Column Skeleton */}
      <div>
        {/* Ticket Info Card */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div style={{ flex: 1 }}>
              <div
                className="skeleton-pulse"
                style={{
                  width: 120,
                  height: 14,
                  borderRadius: 8,
                  background: "var(--bg-skeleton)",
                  marginBottom: 12,
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  width: "70%",
                  height: 28,
                  borderRadius: 8,
                  background: "var(--bg-skeleton)",
                  marginBottom: 16,
                }}
              />
            </div>
            <div
              className="skeleton-pulse"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 16,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
              marginBottom: 8,
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "90%",
              height: 16,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
              marginBottom: 8,
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "60%",
              height: 16,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
              marginBottom: 24,
            }}
          />
          <div style={{ display: "flex", gap: 12 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 60,
                height: 24,
                borderRadius: 16,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: 80,
                height: 24,
                borderRadius: 16,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div
          style={{
            display: "flex",
            gap: 32,
            borderBottom: "1px solid var(--border-glass)",
            marginBottom: 24,
            paddingBottom: 12,
          }}
        >
          <div
            className="skeleton-pulse"
            style={{
              width: 120,
              height: 16,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: 80,
              height: 16,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
            }}
          />
        </div>

        {/* Comments Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: "flex", gap: 16 }}>
              <div
                className="skeleton-pulse"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--bg-skeleton)",
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <div
                    className="skeleton-pulse"
                    style={{
                      width: 100,
                      height: 12,
                      borderRadius: 6,
                      background: "var(--bg-skeleton)",
                    }}
                  />
                  <div
                    className="skeleton-pulse"
                    style={{
                      width: 70,
                      height: 10,
                      borderRadius: 6,
                      background: "var(--bg-skeleton)",
                    }}
                  />
                </div>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: "85%",
                    height: 14,
                    borderRadius: 6,
                    background: "var(--bg-skeleton)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Comment Input Skeleton */}
        <div className="glass-card" style={{ marginTop: 32, padding: 24 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 80,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
              marginBottom: 12,
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              className="skeleton-pulse"
              style={{
                width: 120,
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: 80,
                height: 36,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Right Column (Sidebar) Skeleton */}
      <div
        className="glass-card"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: 60,
              height: 10,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              background: "var(--bg-skeleton)",
            }}
          />
        </div>
        {/* Priority */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: 70,
              height: 10,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              background: "var(--bg-skeleton)",
            }}
          />
        </div>
        {/* Owner */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: 50,
              height: 10,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: 120,
                height: 14,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
        </div>
        {/* Assignee */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: 70,
              height: 10,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 40,
              borderRadius: 10,
              background: "var(--bg-skeleton)",
            }}
          />
        </div>
        {/* Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            className="skeleton-pulse"
            style={{
              width: 60,
              height: 10,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "80%",
              height: 14,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "70%",
              height: 14,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "60%",
              height: 14,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "100%",
              height: 36,
              borderRadius: 8,
              background: "var(--bg-skeleton)",
            }}
          />
          <div
            className="skeleton-pulse"
            style={{
              width: "75%",
              height: 14,
              borderRadius: 6,
              background: "var(--bg-skeleton)",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TicketDetailSkeleton;
