import React, { useEffect, useState } from 'react';
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import styles from "./Dashboard.module.css";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { PriorityName } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";

import type { DashboardStats as Stats, RecentTicket } from "../../types";

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(API_ROUTES.DASHBOARD.STATS);
        setStats(res.data.stats);
        setRecentTickets(res.data.recentTickets);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="animate-fade-in">Loading dashboard...</div>;

  const cards = [
    { label: 'Total Tickets', value: stats?.totalTickets, icon: <CustomIcon name="Ticket" size={24} />, color: 'var(--accent-primary)' },
    { label: 'Open Tickets', value: stats?.openTickets, icon: <CustomIcon name="Clock" size={24} />, color: 'var(--accent-warning)' },
    { label: 'Resolved', value: stats?.resolvedTickets, icon: <CustomIcon name="CheckCircle2" size={24} />, color: 'var(--accent-success)' },
    { label: 'Total Users', value: stats?.users, icon: <CustomIcon name="Users" size={24} />, color: 'var(--accent-secondary)' },
  ];

  return (
    <div className="animate-fade-in">
      <div className={styles.grid}>
        {cards.map((card, i) => (
          <div key={i} className={`${styles.statCard} glass-card glass-card-hover`}>
            <div className={styles.statHeader}>
              <div style={{ color: card.color }}>{card.icon}</div>
              <CustomIcon name="TrendingUp" size={16} />
            </div>
            <div className={styles.statValue}>{card.value}</div>
            <div className={styles.statLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.sectionHeader}>
        <h2 style={{ fontSize: '1.25rem' }}>Recent Tickets</h2>
        <Link to="/tickets" className={styles.viewAllBtn}>
          View All <CustomIcon name="ArrowUpRight" size={16} />
        </Link>
      </div>

      <CustomTable
        columns={[
          {
            header: "ID",
            key: "uid",
            render: (t) => <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>#{t.uid}</span>,
          },
          {
            header: "Subject",
            key: "subject",
            render: (t) => <span style={{ fontWeight: 600 }}>{t.subject}</span>,
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
              <CustomBadge variant={t.priority.name === PriorityName.HIGH ? 'danger' : 'neutral'}>
                {t.priority.name}
              </CustomBadge>
            ),
          },
          {
            header: "Created",
            key: "createdAt",
            render: (t) => formatDistanceToNow(new Date(t.createdAt), { addSuffix: true }),
          },
        ]}
        data={recentTickets}
        loading={loading}
        loadingMessage="Loading dashboard stats..."
        emptyMessage="No recent tickets found"
      />
    </div>
  );
};

export default Dashboard;
