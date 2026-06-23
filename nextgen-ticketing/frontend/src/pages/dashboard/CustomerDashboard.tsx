import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import StatsCards from "./components/StatsCards";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { Project, CustomerDashboardProps } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomSkeleton from "../../components/CustomSkeleton/CustomSkeleton";
import styles from "./Dashboard.module.css";

const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ stats }) => {
  const navigate = useNavigate();
  const { data: projectsData, isLoading: loading } = useQuery({
    queryKey: ["customerProjects"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.PROJECTS.BASE);
      return res.data.projects as Project[];
    },
  });

  const projects = projectsData || [];

  const cards = [
    {
      label: "Project Total Tickets",
      value: stats?.projectTickets || 0,
      icon: <CustomIcon name="FolderKanban" size={24} />,
      color: "var(--accent-secondary)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "My Total Tickets",
      value: stats?.totalTickets || 0,
      icon: <CustomIcon name="Ticket" size={24} />,
      color: "var(--accent-primary)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "My Open Tickets",
      value: stats?.openTickets || 0,
      icon: <CustomIcon name="Clock" size={24} />,
      color: "var(--accent-warning)",
      onClick: () => navigate("/tickets/board"),
    },
    {
      label: "My Resolved Tickets",
      value: stats?.resolvedTickets || 0,
      icon: <CustomIcon name="CheckCircle2" size={24} />,
      color: "var(--accent-success)",
      onClick: () => navigate("/tickets/board"),
    },
  ];

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "on hold":
        return "warning";
      case "completed":
        return "info";
      case "cancelled":
        return "danger";
      default:
        return "neutral";
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: 8 }}>
          Welcome Back!
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Here's an overview of your projects and support tickets.
        </p>
      </div>

      <StatsCards cards={cards} />

      <div style={{ marginTop: 40 }}>
        <div className={styles.sectionHeader}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <CustomIcon
              name="Briefcase"
              size={20}
              color="var(--accent-primary)"
            />
            My Active Projects
          </h2>
        </div>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: 20,
            }}
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <CustomSkeleton width={48} height={48} borderRadius={12} />
                    <div>
                      <CustomSkeleton
                        width="120px"
                        height="1.1rem"
                        style={{ marginBottom: 6 }}
                      />
                      <CustomSkeleton width="80px" height="0.8rem" />
                    </div>
                  </div>
                  <CustomSkeleton
                    width="70px"
                    height="24px"
                    borderRadius="12px"
                  />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <CustomSkeleton width="100%" height="0.9rem" />
                  <CustomSkeleton width="70%" height="0.9rem" />
                </div>
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-glass)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <CustomSkeleton width="100px" height="14px" />
                  <CustomSkeleton width="60px" height="14px" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
              gap: 20,
            }}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/projects/${project.id}`);
                  }
                }}
                className="glass-card"
                style={{
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: "rgba(var(--primary-rgb), 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary)",
                      }}
                    >
                      <CustomIcon name="FolderKanban" size={24} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        {project.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {project.department?.name || "Global Project"}
                      </span>
                    </div>
                  </div>
                  <CustomBadge
                    variant={getStatusVariant(project.status) as any}
                  >
                    {project.status}
                  </CustomBadge>
                </div>

                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    margin: 0,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {project.description ||
                    "No description provided for this project."}
                </p>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 16,
                    borderTop: "1px solid var(--border-glass)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--text-muted)",
                    }}
                  >
                    <CustomIcon name="Calendar" size={14} />
                    Started {new Date(project.createdAt).toLocaleDateString()}
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--accent-primary)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Details <CustomIcon name="ArrowRight" size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyAnnouncements}>
            <div className={styles.emptyIcon}>
              <CustomIcon name="Briefcase" size={32} />
            </div>
            <h3
              style={{ fontSize: "1.1rem", fontWeight: 600, margin: "8px 0" }}
            >
              No Projects Yet
            </h3>
            <p style={{ color: "var(--text-muted)", maxWidth: 300 }}>
              You don't have any active projects assigned to your account.
            </p>
          </div>
        )}
      </div>

      {/* <div style={{ marginTop: 40 }}>
        <MomentsSection moments={moments} />
      </div> */}
    </div>
  );
};

export default CustomerDashboard;
