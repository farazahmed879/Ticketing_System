import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import styles from "./Dashboard.module.css";
import { RoleName, AnnouncementType } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import type { DashboardStats as Stats } from "../../types";
import { DashboardSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

// Sub-components
import StatsCards from "./components/StatsCards";
import AnnouncementSection from "./components/AnnouncementSection";
import ReviewsSection from "./components/ReviewsSection";
import NewHiresSection from "./components/NewHiresSection";
import MomentsSection from "./components/MomentsSection";
import LeaderboardSection from "./components/LeaderboardSection";
import CustomerDashboard from "./CustomerDashboard";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newHires, setNewHires] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenMomentIds, setSeenMomentIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, annRes] = await Promise.all([
          api.get(API_ROUTES.DASHBOARD.STATS),
          api.get(API_ROUTES.ANNOUNCEMENTS.DASHBOARD, { params: { limit: -1 } }),
        ]);
        setStats(statsRes.data.stats);
        // Clients aren't "new hires" — exclude them from the dashboard.
        setNewHires(
          (statsRes.data.newHires || []).filter(
            (hire: any) => hire?.role?.name !== RoleName.CUSTOMER,
          ),
        );
        setAnnouncements(annRes.data.announcements);
        setSeenMomentIds(annRes.data.seenMomentIds || []);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const generalAnnouncements = announcements.filter(
    (ann) =>
      ![AnnouncementType.REVIEW, AnnouncementType.MOMENT].includes(
        ann.type as any,
      ),
  );
  const reviews = announcements.filter(
    (ann) => ann.type === AnnouncementType.REVIEW,
  );
  const moments = announcements.filter(
    (ann) => ann.type === AnnouncementType.MOMENT,
  );

  const cards = [
    {
      label: "Total Tickets",
      value: stats?.totalTickets,
      icon: <CustomIcon name="Ticket" size={24} />,
      color: "var(--accent-primary)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Open Tickets",
      value: stats?.openTickets,
      icon: <CustomIcon name="Clock" size={24} />,
      color: "var(--accent-warning)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Resolved",
      value: stats?.resolvedTickets,
      icon: <CustomIcon name="CheckCircle2" size={24} />,
      color: "var(--accent-success)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Total Users",
      value: stats?.users,
      icon: <CustomIcon name="Users" size={24} />,
      color: "var(--accent-secondary)",
    },
  ];

  if (user?.role?.name === RoleName.CUSTOMER) {
    return <CustomerDashboard stats={stats} moments={moments} />;
  }

  return (
    <div className="animate-fade-in">
      <StatsCards cards={cards} />

      {/* Row 1: General Announcements & Client Reviews */}
      <div className={styles.heroSection}>
        <AnnouncementSection announcements={generalAnnouncements} t={t} />
        <ReviewsSection reviews={reviews} />
      </div>

      {/* Row 2: New Hires & Moments of Joy */}
      <div className={styles.heroSection}>
        <NewHiresSection
          newHires={newHires}
        />
        <MomentsSection moments={moments} seenMomentIds={seenMomentIds} />
      </div>

      <div className={styles.mainGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Mini Leaderboard Preview */}
          {(user?.role?.name === RoleName.ADMIN ||
            user?.role?.name === RoleName.HR) && <LeaderboardSection />}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
