import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import styles from "./Dashboard.module.css";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { RoleName } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomBadge from "../../components/CustomBadge";
import CustomSkeleton from "../../components/CustomSkeleton";
import Modal from "../../components/Modal";
import { useTranslation } from "react-i18next";

import type { DashboardStats as Stats } from "../../types";
import { DashboardSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

const newHires = [
  {
    id: 1,
    name: "Sarah Johnson",
    position: "Senior Frontend Developer",
    startDate: "2026-05-01",
    avatar: "https://i.pravatar.cc/150?u=sarah",
  },
  {
    id: 2,
    name: "Michael Chen",
    position: "UI/UX Designer",
    startDate: "2026-05-03",
    avatar: "https://i.pravatar.cc/150?u=michael",
  },
  {
    id: 3,
    name: "Aisha Patel",
    position: "DevOps Engineer",
    startDate: "2026-05-05",
    avatar: "https://i.pravatar.cc/150?u=aisha",
  },
];

const clientReviews = [
  {
    id: 1,
    client: "TechFlow Systems",
    representative: "Robert Wilson",
    text: "The ticketing system has streamlined our internal support significantly. Highly recommend!",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=robert",
  },
  {
    id: 2,
    client: "Global Logistics",
    representative: "Elena Rodriguez",
    text: "Fast response times and intuitive UI. A game changer for our operations team.",
    rating: 5,
    avatar: "https://i.pravatar.cc/150?u=elena",
  },
];

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  // const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewHiresModalOpen, setIsNewHiresModalOpen] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuth();
  console.log(user);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, annRes] = await Promise.all([
          api.get(API_ROUTES.DASHBOARD.STATS),
          api.get(API_ROUTES.ANNOUNCEMENTS.BASE),
        ]);
        setStats(statsRes.data.stats);
        // setRecentTickets(statsRes.data.recentTickets);
        setAnnouncements(annRes.data.announcements.slice(0, 2)); // Show top 2 on dashboard
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

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
      {/* Hero Section: Announcements & Welcomes */}
      <div className={styles.heroSection}>
        <div className={styles.announcementContainer}>
          <div className={styles.sectionHeader}>
            <h2 style={{ fontSize: "1.25rem" }}>
              {t("dashboard.announcements")}
            </h2>
          </div>
          {announcements.length > 0 ? (
            announcements.map((ann) => (
              <div
                key={ann.id}
                className={`${styles.announcementCard} glass-card`}
              >
                <div className={styles.announcementHeader}>
                  <CustomIcon
                    name={ann.type === "event" ? "Calendar" : "Megaphone"}
                    size={16}
                  />
                  <span>{ann.type}</span>
                </div>
                <h3 className={styles.announcementTitle}>{ann.title}</h3>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    marginBottom: "12px",
                  }}
                >
                  {ann.description}
                </p>
                <div className={styles.announcementFooter}>
                  <div className={styles.announcementAuthor}>
                    {ann.author?.image ? (
                      <img src={ann.author.image} alt="" className={styles.authorAvatar} />
                    ) : (
                      <div className={styles.authorAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', fontSize: '10px' }}>
                        {ann.author?.fullname?.charAt(0)}
                      </div>
                    )}
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>{ann.author?.fullname}</span>
                      <span className={styles.authorRole}>{ann.author?.title || ann.author?.role?.name}</span>
                    </div>
                  </div>
                  <div className={styles.announcementDate}>
                    <CustomIcon name="Clock" size={14} />
                    {formatDistanceToNow(new Date(ann.date), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyAnnouncements}>
              <div className={styles.emptyIcon}>
                <CustomIcon name="MegaphoneOff" size={24} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  No announcements yet
                </p>
                <p style={{ fontSize: '0.85rem' }}>
                  Stay tuned for important updates and events.
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className={`${styles.welcomeSection} glass-card`}
          style={{ padding: "24px" }}
        >
          <div className={styles.welcomeHeader}>
            <div className={styles.welcomeTitle}>
              <CustomIcon name="Sparkles" size={24} />
              <h2>{t("dashboard.welcomeNewHires")}</h2>
            </div>
            <CustomBadge variant="success">{newHires.length} New</CustomBadge>
          </div>

          <div className={styles.newHireCard}>
            <img
              src={newHires[0].avatar}
              alt={newHires[0].name}
              style={{ width: 50, height: 50, borderRadius: "12px" }}
            />
            <div className={styles.newHireInfo}>
              <h4>{newHires[0].name}</h4>
              <p>{newHires[0].position}</p>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <CustomIcon
                name="PartyPopper"
                color="var(--accent-success)"
                size={24}
              />
            </div>
          </div>

          <p
            style={{
              marginTop: "16px",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
              lineHeight: "1.5",
            }}
          >
            We're thrilled to have you join Jami Partners! Let's build something
            amazing together.
          </p>

          <button
            className={styles.expandBtn}
            onClick={() => setIsNewHiresModalOpen(true)}
          >
            View All New Hires <CustomIcon name="Maximize2" size={14} />
          </button>
        </div>
      </div>

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

      <div className={styles.mainGrid}>
        <div>
          <div className={styles.sectionHeader}>
            <h2 style={{ fontSize: "1.25rem" }}>Client Happy Reviews</h2>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
          >
            {clientReviews.map((review) => (
              <div
                key={review.id}
                className={`${styles.reviewCard} glass-card`}
              >
                <CustomIcon
                  name="Quote"
                  size={40}
                  className={styles.quoteIcon}
                />
                <p className={styles.reviewText}>"{review.text}"</p>
                <div className={styles.reviewer}>
                  <img
                    src={review.avatar}
                    alt={review.representative}
                    style={{ width: 40, height: 40, borderRadius: "50%" }}
                  />
                  <div className={styles.reviewerInfo}>
                    <h5>{review.representative}</h5>
                    <span>{review.client}</span>
                    <div className={styles.rating}>
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <CustomIcon
                          key={i}
                          name="Star"
                          size={12}
                          className={styles.star}
                          fill="currentColor"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Mini Leaderboard Preview */}
          {(user?.role?.name === RoleName.ADMIN ||
            user?.role?.name === RoleName.HR ||
            user?.role?.name === RoleName.AGENT) && (
            <div>
              <div className={styles.sectionHeader}>
                <h2 style={{ fontSize: "1.25rem" }}>Top Candidates</h2>
                <Link
                  to="/candidates/leaderboard"
                  className={styles.viewAllBtn}
                >
                  <CustomIcon name="Trophy" size={16} />
                </Link>
              </div>
              <div className="glass-card" style={{ padding: 0 }}>
                <LeaderboardPreview />
              </div>
            </div>
          )}

          <div className="glass-card" style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: 16, fontSize: "1.1rem" }}>Team Pulse</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                }}
              >
                <span>Employee Satisfaction</span>
                <span style={{ color: "var(--accent-success)" }}>94%</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--border-glass)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "94%",
                    height: "100%",
                    background: "var(--accent-success)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.85rem",
                  marginTop: 8,
                }}
              >
                <span>Ticket Resolution Rate</span>
                <span style={{ color: "var(--accent-primary)" }}>88%</span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--border-glass)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: "88%",
                    height: "100%",
                    background: "var(--accent-primary)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isNewHiresModalOpen}
        onClose={() => setIsNewHiresModalOpen(false)}
        title="Welcome New Hires!"
        maxWidth="800px"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
          }}
        >
          {newHires.map((hire) => (
            <div
              key={hire.id}
              className="glass-card"
              style={{ padding: 24, textAlign: "center" }}
            >
              <img
                src={hire.avatar}
                alt={hire.name}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "20px",
                  marginBottom: 16,
                }}
              />
              <h4
                style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 4 }}
              >
                {hire.name}
              </h4>
              <p
                style={{
                  color: "var(--accent-primary)",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  marginBottom: 8,
                }}
              >
                {hire.position}
              </p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Joined{" "}
                {formatDistanceToNow(new Date(hire.startDate), {
                  addSuffix: true,
                })}
              </p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <p style={{ fontSize: "1.1rem", color: "var(--text-secondary)" }}>
            Welcome to the Jami Partners family! 🎉
          </p>
        </div>
      </Modal>
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
        className="glass-card"
        style={{
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", gap: "12px" }}
          >
            <CustomSkeleton type="circle" width={24} height={24} />
            <div style={{ flex: 1 }}>
              <CustomSkeleton
                width="70%"
                height="12px"
                style={{ marginBottom: "6px" }}
              />
              <CustomSkeleton width="40%" height="10px" />
            </div>
            <CustomSkeleton width="30px" height="14px" />
          </div>
        ))}
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
