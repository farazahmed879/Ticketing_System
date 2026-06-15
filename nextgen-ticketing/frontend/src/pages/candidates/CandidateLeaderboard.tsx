import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import CustomTable from "../../components/CustomTable";
import { CandidateStatus } from "../../utils/constants";
import { useNavigate } from "react-router-dom";
import CustomButton from "../../components/CustomButton";

import { getLeaderboardColumns, type LeaderboardEntry } from "./columns";

const CandidateLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ROUTES.CANDIDATES.LEADERBOARD);
      setData(res.data.leaderboard);
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
      showNotification("error", "Failed to load hiring leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const columns = getLeaderboardColumns(navigate);

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/candidates")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{
              width: 40,
              height: 40,
              padding: 0,
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-glass)",
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              Hiring Leaderboard
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              Top performing candidates based on interview feedback and ratings
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "24px 32px",
            borderBottom: "1px solid var(--border-glass)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(124, 58, 237, 0.1)",
                color: "var(--accent-primary)",
              }}
            >
              <CustomIcon name="Trophy" size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
                Candidate Rankings
              </h3>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                Updated in real-time as feedback is submitted
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                {data.length}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Total Candidates
              </div>
            </div>
            <div style={{ width: 1, background: "var(--border-glass)" }} />
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  color: "var(--accent-success)",
                }}
              >
                {data.filter((c) => c.status === CandidateStatus.HIRED).length}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Successfully Hired
              </div>
            </div>
          </div>
        </div>

        <CustomTable
          columns={columns}
          data={data}
          loading={loading}
          loadingMessage="Calculating rankings..."
          emptyMessage="No interview feedback available yet to rank candidates"
        />
      </div>
    </div>
  );
};

export default CandidateLeaderboard;
