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
import StatsCards, { type StatCard } from "./components/StatsCards";
import RecentTicketsSection from "./components/RecentTicketsSection";
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

  const roleType = user?.role?.roleType;
  const isHR = roleType === ROLE_TYPE.HR;
  const showLeaderboard = roleType === ROLE_TYPE.ADMIN || isHR;
  // HR's dashboard has no ticket stats, so it doesn't get a ticket feed either.
  const showRecentTickets = !isHR;
  const recentTickets = dashboardData?.recentTickets || [];

  const total = stats?.totalTickets ?? 0;
  const pct = (n?: number) =>
    total > 0 && n !== undefined ? Math.round((n / total) * 100) : null;
  const openPct = pct(stats?.openTickets);
  const resolvedPct = pct(stats?.resolvedTickets);

  const allCards: StatCard[] = [
    {
      label: "Total Tickets",
      value: stats?.totalTickets,
      icon: <CustomIcon name="Ticket" size={18} />,
      color: "var(--accent-primary)",
      caption: "All tickets you can see",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Open Tickets",
      value: stats?.openTickets,
      icon: <CustomIcon name="Clock" size={18} />,
      color: "var(--accent-warning)",
      caption: openPct !== null ? `${openPct}% of all tickets` : undefined,
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Resolved",
      value: stats?.resolvedTickets,
      icon: <CustomIcon name="CheckCircle2" size={18} />,
      color: "var(--accent-success)",
      caption: resolvedPct !== null ? `${resolvedPct}% resolution rate` : undefined,
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "Total Users",
      value: stats?.users,
      icon: <CustomIcon name="Users" size={18} />,
      color: "var(--accent-secondary)",
      caption: "Across the organisation",
    },
  ];

  const cards = isHR
    ? allCards.filter((card) => card.label === "Total Users")
    : allCards;

  if (roleType === ROLE_TYPE.CUSTOMER) {
    return <CustomerDashboard stats={stats} moments={moments} />;
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullname?.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className={`${styles.dashboard} animate-fade-in`}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.pageDate}>{today}</p>
          <h1 className={styles.pageTitle}>
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        {showRecentTickets && (
          <button
            type="button"
            className={styles.headerAction}
            onClick={() => navigate("/tickets/board")}
          >
            <CustomIcon name="KanbanSquare" size={16} />
            Open ticket board
          </button>
        )}
      </header>

      <StatsCards cards={cards} />

      {showRecentTickets ? (
        <>
          {/* Work: recent tickets (+ recruiter leaderboard for Admin) */}
          <div className={showLeaderboard ? styles.splitRow : styles.singleRow}>
            <RecentTicketsSection tickets={recentTickets} />
            {showLeaderboard && <LeaderboardSection />}
          </div>

          {/* Company feed */}
          <div className={styles.twoColRow}>
            <AnnouncementSection announcements={generalAnnouncements} t={t} />
            <ReviewsSection reviews={reviews} />
          </div>

          {/* People */}
          <div className={styles.twoColRow}>
            <NewHiresSection newHires={newHires} />
            <MomentsSection moments={moments} seenMomentIds={seenMomentIds} />
          </div>
        </>
      ) : (
        <>
          {/* HR: people first — new hires beside the recruiter leaderboard */}
          <div className={styles.twoColRow}>
            <NewHiresSection newHires={newHires} />
            {showLeaderboard && <LeaderboardSection />}
          </div>

          <div className={styles.twoColRow}>
            <AnnouncementSection announcements={generalAnnouncements} t={t} />
            <ReviewsSection reviews={reviews} />
          </div>

          <div className={styles.singleRow}>
            <MomentsSection moments={moments} seenMomentIds={seenMomentIds} />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
