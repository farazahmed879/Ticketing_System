import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

const LeaderboardPreview: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    api
      .get(API_ROUTES.CANDIDATES.LEADERBOARD)
      .then((res) => setData(res.data.leaderboard || []))
      .catch((err) => console.error("Failed to load leaderboard", err))
      .finally(() => setLoading(false));
  }, []);

  const renderContent = (isOverlay = false) => {
    const listToRender = isOverlay ? data : data.slice(0, 5);
    return (
      <>
        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: isOverlay ? "1.3rem" : "1.1rem", fontWeight: 700 }}>
            Top Recruiters
          </h2>
          <button
            className={styles.expandSectionBtn}
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <CustomIcon name={isExpanded ? "Minimize2" : "Maximize2"} size={16} />
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {listToRender.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom:
                    index === listToRender.length - 1 ? "none" : "1px solid var(--border-glass)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        index === 0
                          ? "var(--accent-warning)"
                          : "rgba(255,255,255,0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </div>
                  <span style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                    {item.fullname}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CustomIcon
                    name="Award"
                    size={14}
                    color="var(--accent-primary)"
                  />
                  <span style={{ fontWeight: 600 }}>{item.points} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      {isExpanded ? (
        <div className={styles.fullscreenSectionOverlay} onClick={() => setIsExpanded(false)}>
          <div className={styles.fullscreenSectionContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.closeOverlayBtn}
              onClick={() => setIsExpanded(false)}
              title="Close"
              style={{ zIndex: 10 }}
            >
              <CustomIcon name="X" size={20} />
            </button>
            {renderContent(true)}
          </div>
        </div>
      ) : (
        <div className={`${styles.recentTickets} glass-card`}>
          {renderContent(false)}
        </div>
      )}
    </>
  );
};

export default LeaderboardPreview;
