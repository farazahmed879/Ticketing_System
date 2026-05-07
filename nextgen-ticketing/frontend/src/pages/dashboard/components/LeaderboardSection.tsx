import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

const LeaderboardPreview: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(API_ROUTES.CANDIDATES.LEADERBOARD)
      .then((res) => setData(res.data.leaderboard.slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`${styles.recentTickets} glass-card`}>
      <div className={styles.sectionHeader}>
        <h2 style={{ fontSize: "1.1rem" }}>Top Recruiters</h2>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {data.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  index === data.length - 1 ? "none" : "1px solid var(--border-glass)",
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
                <span style={{ fontSize: "0.9rem" }}>{item.fullname}</span>
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
    </div>
  );
};

export default LeaderboardPreview;
