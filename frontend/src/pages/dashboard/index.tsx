import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { socket } from "../../services/socket";
import styles from "./Dashboard.module.css";
import { AnnouncementType } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { DashboardSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

// Sub-components
import StatsCards from "./components/StatsCards";
import AnnouncementSection from "./components/AnnouncementSection";
import ReviewsSection from "./components/ReviewsSection";
import NewHiresSection from "./components/NewHiresSection";
import MomentsSection from "./components/MomentsSection";
import LeaderboardSection from "./components/LeaderboardSection";
import CustomerDashboard from "./CustomerDashboard";
import { ROLE_TYPE } from "../roles/roleConstants";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: async () => {
      const statsRes = await api.get(API_ROUTES.DASHBOARD.STATS);
      return statsRes.data;
    },
  });

  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    };
    socket.on("ticket:updated", handleUpdate);
    socket.on("announcement:updated", handleUpdate);
    return () => {
      socket.off("ticket:updated", handleUpdate);
      socket.off("announcement:updated", handleUpdate);
    };
  }, [queryClient]);

  const stats = dashboardData?.stats || null;
  const newHires = (dashboardData?.newHires || []).filter(
    (hire: any) => hire?.role?.roleType !== ROLE_TYPE.CUSTOMER,
  );
  const announcements = dashboardData?.announcements || [];
  const seenMomentIds = dashboardData?.seenMomentIds || [];

  if (loading) return <DashboardSkeleton />;

  const generalAnnouncements = announcements.filter(
    (ann: { type: any }) =>
      ![AnnouncementType.REVIEW, AnnouncementType.MOMENT].includes(
        ann.type as any,
      ),
  );
  const reviews = announcements.filter(
    (ann: { type: string }) => ann.type === AnnouncementType.REVIEW,
  );
  const moments = announcements.filter(
    (ann: { type: string }) => ann.type === AnnouncementType.MOMENT,
  );

  const isHR = user?.role?.roleType === ROLE_TYPE.HR;

  const allCards = [
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

  const cards = isHR
    ? allCards.filter((card) => card.label === "Total Users")
    : allCards;

  if (user?.role?.roleType === ROLE_TYPE.CUSTOMER) {
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
        <NewHiresSection newHires={newHires} />
        <MomentsSection moments={moments} seenMomentIds={seenMomentIds} />
      </div>

      <div className={styles.mainGrid}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Mini Leaderboard Preview */}
          {(user?.role?.roleType === ROLE_TYPE.ADMIN ||
            user?.role?.roleType === ROLE_TYPE.HR) && <LeaderboardSection />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
