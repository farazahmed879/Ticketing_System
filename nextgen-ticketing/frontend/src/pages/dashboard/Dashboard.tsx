import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import styles from "./Dashboard.module.css";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { PriorityName, RoleName } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";

import type { DashboardStats as Stats, RecentTicket } from "../../types";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  console.log(user);
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(API_ROUTES.DASHBOARD.STATS);
        setStats(res.data.stats);
        setRecentTickets(res.data.recentTickets);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading)
    return <div className="animate-fade-in">Loading dashboard...</div>;

  const cards = [
    {
      label: "Total Tickets",
      value: stats?.totalTickets,
      icon: <CustomIcon name="Ticket" size={24} />,
      color: "var(--accent-primary)",
    },
    {
      label: "Open Tickets",
      value: stats?.openTickets,
      icon: <CustomIcon name="Clock" size={24} />,
      color: "var(--accent-warning)",
    },
    {
      label: "Resolved",
      value: stats?.resolvedTickets,
      icon: <CustomIcon name="CheckCircle2" size={24} />,
      color: "var(--accent-success)",
    },
    {
      label: "Total Users",
      value: stats?.users,
      icon: <CustomIcon name="Users" size={24} />,
      color: "var(--accent-secondary)",
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.grid}>
        {cards.map((card, i) => (
          <div
            key={i}
            className={`${styles.statCard} glass-card glass-card-hover`}
          >
            <div className={styles.statHeader}>
              <div style={{ color: card.color }}>{card.icon}</div>
              <CustomIcon name="TrendingUp" size={16} />
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div>
          <div className={styles.sectionHeader}>
            <h2 style={{ fontSize: "1.25rem" }}>Recent Tickets</h2>
            <Link to="/tickets" className={styles.viewAllBtn}>
              View All <CustomIcon name="ArrowUpRight" size={16} />
            </Link>
          </div>

          <CustomTable
            columns={[
              {
                header: "ID",
                key: "uid",
                render: (t) => (
                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                    #{t.uid}
                  </span>
                ),
              },
              {
                header: "Subject",
                key: "subject",
                render: (t) => (
                  <span style={{ fontWeight: 600 }}>{t.subject}</span>
                ),
              },
              {
                header: "Owner",
                key: "owner",
                render: (t) => t.owner.fullname,
              },
              {
                header: "Status",
                key: "status",
                render: (t) => (
                  <CustomBadge color={t.status.color}>
                    {t.status.name}
                  </CustomBadge>
                ),
              },
              {
                header: "Priority",
                key: "priority",
                render: (t) => (
                  <CustomBadge
                    variant={
                      t.priority.name === PriorityName.HIGH
                        ? "danger"
                        : "neutral"
                    }
                  >
                    {t.priority.name}
                  </CustomBadge>
                ),
              },
              {
                header: "Created",
                key: "createdAt",
                render: (t) =>
                  formatDistanceToNow(new Date(t.createdAt), {
                    addSuffix: true,
                  }),
              },
            ]}
            data={recentTickets}
            loading={loading}
            emptyMessage="No recent tickets found"
          />
        </div>

        {/* Mini Leaderboard Preview */}
        {(user?.role?.name === RoleName.ADMIN ||
          user?.role?.name === RoleName.HR ||
          user?.role?.name === RoleName.AGENT) && (
          <div>
            <div className={styles.sectionHeader}>
              <h2 style={{ fontSize: "1.25rem" }}>Top Candidates</h2>
              <Link to="/candidates/leaderboard" className={styles.viewAllBtn}>
                Full Leaderboard <CustomIcon name="Trophy" size={16} />
              </Link>
            </div>
            <div className="glass-card" style={{ padding: 0 }}>
              <LeaderboardPreview />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LeaderboardPreview: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(API_ROUTES.CANDIDATES.LEADERBOARD)
      .then((res) => setData(res.data.leaderboard.slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div
        style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}
      >
        Loading rankings...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {data.length === 0 ? (
        <div
          style={{
            padding: 20,
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          No rankings available
        </div>
      ) : (
        data.map((c, i) => (
          <div
            key={c.id}
            style={{
              padding: "12px 20px",
              borderBottom:
                i === data.length - 1
                  ? "none"
                  : "1px solid var(--border-glass)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background:
                  i === 0
                    ? "linear-gradient(135deg, #FFD700, #FFA500)"
                    : "var(--bg-input)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 800,
                color: i === 0 ? "#000" : "var(--text-muted)",
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {c.name}
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {c.position}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                {c.averageRating}
              </div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                Rating
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default Dashboard;
