import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
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

  const renderList = (isOverlay = false) => {
    const listToRender = isOverlay ? data : data.slice(0, 5);
    if (loading) return <p>Loading...</p>;
    return (
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
                    {item.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CustomIcon
                    name="Star"
                    size={14}
                    color="var(--accent-warning)"
                  />
                  <span style={{ fontWeight: 600 }}>{item.averageRating} pts</span>
                </div>
              </div>
            ))}
          </div>
    );
  };

  return (
    <>
      <div className={`${styles.recentTickets} glass-card`}>
        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Top Recruiters
          </h2>
          <button
            className={styles.expandSectionBtn}
            onClick={() => setIsExpanded(true)}
            title="Expand"
          >
            <CustomIcon name="Maximize2" size={16} />
          </button>
        </div>
        {renderList(false)}
      </div>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Top Recruiters"
        maxWidth="720px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
          {renderList(true)}
        </div>
      </Modal>
    </>
  );
};

export default LeaderboardPreview;
