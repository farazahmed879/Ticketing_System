import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import type { Project } from "../../types";
import { ROLE_TYPE } from "../roles/roleConstants";
import ProjectDeveloperHours from "./components/ProjectDeveloperHours";
import { FormattedTaskDescription } from "../timesheet/components/TaskDescriptionEditor";
import styles from "./ProjectDetail.module.css";

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "success" as const;
    case "on hold":
      return "warning" as const;
    case "completed":
      return "info" as const;
    case "cancelled":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user } = useAuth();
  // Clients see their project peers as "Team Members"; everyone else sees
  // them labelled as "Clients".
  const peopleLabel =
    user?.role?.roleType === ROLE_TYPE.CUSTOMER ? "Team Members" : "Clients";
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await api.get(API_ROUTES.PROJECTS.BY_ID(id!));
        setProject(res.data.project);
      } catch (err) {
        console.error("Failed to fetch project", err);
        showNotification("error", "Failed to load project details");
        navigate("/projects");
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id, navigate, showNotification]);

  if (loading) return <DetailSkeleton />;
  if (!project)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>Project not found.</div>
    );

  return (
    <div className={`animate-fade-in ${styles.page}`}>
      {/* Header card */}
      <div className={`glass-card ${styles.headerCard}`}>
        <div className={styles.headerMain}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate(-1)}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{
              width: 40,
              height: 40,
              padding: 0,
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-glass)",
              flexShrink: 0,
            }}
          />
          <div className={styles.headerIcon}>
            <CustomIcon name="FolderKanban" size={32} />
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>{project.name}</h2>
            <div className={styles.headerMeta}>
              <CustomBadge variant={getStatusVariant(project.status)}>
                {project.status}
              </CustomBadge>
              <span className={styles.headerDept}>
                {project.department?.name || "Global Project"}
              </span>
              <span className={styles.headerDate}>
                <CustomIcon name="Calendar" size={14} />
                Started {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Left Column: Description + Developer Hours */}
        <div className={styles.column}>
          {/* Description */}
          <div className={`glass-card ${styles.card}`}>
            <div className={`${styles.sectionHead} ${styles.sectionHeadTight}`}>
              <CustomIcon
                name="FileText"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 className={`${styles.sectionTitle} ${styles.sectionTitleLg}`}>
                About this Project
              </h3>
            </div>
            <p className={styles.description}>
              {project.description?.trim() ? <FormattedTaskDescription content={project.description} /> :
                "No description has been provided for this project."}
            </p>
          </div>

          {/* Developer Hours & Timesheet Analysis */}
          <ProjectDeveloperHours projectId={project.id} />
        </div>

        {/* Sidebar Info (Manager + Clients) */}
        <div className={`${styles.column} ${styles.sidebar}`}>
          {/* Project Manager */}
          {project.manager && (
            <div className={`glass-card ${styles.card}`}>
              <div className={`${styles.sectionHead} ${styles.sectionHeadTight}`}>
                <CustomIcon
                  name="UserCheck"
                  size={20}
                  color="var(--accent-primary)"
                />
                <h3 className={styles.sectionTitle}>Project Manager</h3>
              </div>
              <div className={styles.listItem}>
                <div className={styles.avatar}>
                  {project.manager.fullname.charAt(0).toUpperCase()}
                </div>
                <span className={`${styles.itemText} ${styles.itemName}`}>
                  {project.manager.fullname}
                </span>
              </div>
            </div>
          )}

          {/* Assigned Teams */}
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.sectionHead}>
              <CustomIcon
                name="Users"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 className={styles.sectionTitle}>
                Teams ({project.teams?.length || 0})
              </h3>
            </div>
            {project.teams && project.teams.length > 0 ? (
              <div className={styles.list}>
                {project.teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/teams/${t.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/teams/${t.id}`);
                      }
                    }}
                    className={`${styles.listItem} ${styles.clickable}`}
                  >
                    <div className={`${styles.avatar} ${styles.avatarSquare}`}>
                      <CustomIcon name="Users" size={16} />
                    </div>
                    <div className={styles.itemText}>
                      <div className={styles.itemName}>{t.name}</div>
                      <div className={styles.itemSub}>
                        <CustomIcon name="UserCheck" size={12} />
                        {t.teamLead?.fullname
                          ? `Lead: ${t.teamLead.fullname}`
                          : "No lead assigned"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No teams assigned to this project.</p>
            )}
          </div>

          {/* Clients */}
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.sectionHead}>
              <CustomIcon
                name="Users"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 className={styles.sectionTitle}>
                {peopleLabel} ({project.clients?.length || 0})
              </h3>
            </div>
            {project.clients && project.clients.length > 0 ? (
              <div className={styles.list}>
                {project.clients.map((c) => (
                  <div key={c.id} className={styles.listItem}>
                    <div className={styles.avatar}>
                      {c.fullname.charAt(0).toUpperCase()}
                    </div>
                    <span className={`${styles.itemText} ${styles.itemName}`}>
                      {c.fullname}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No clients linked to this project.</p>
            )}
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.sectionHead}>
          <CustomIcon name="Ticket" size={20} color="var(--accent-primary)" />
          <h3 className={`${styles.sectionTitle} ${styles.sectionTitleLg}`}>
            Tickets ({project.tickets?.length || 0})
          </h3>
        </div>
        {project.tickets && project.tickets.length > 0 ? (
          <div className={styles.ticketList}>
            {project.tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/tickets/${t.id}`);
                  }
                }}
                className={styles.ticketRow}
              >
                <div className={styles.ticketMain}>
                  <span className={styles.ticketUid}>#{t.uid}</span>
                  <span className={styles.ticketSubject}>{t.subject}</span>
                </div>
                <div className={styles.ticketMeta}>
                  {t.priority && (
                    <CustomBadge variant="neutral">
                      {t.priority.name}
                    </CustomBadge>
                  )}
                  {t.status && (
                    <CustomBadge variant="info">{t.status.name}</CustomBadge>
                  )}
                  {t.owner && (
                    <span
                      className={styles.ticketPerson}
                      title={`Created by ${t.owner.fullname}`}
                    >
                      <CustomIcon name="User" size={12} /> {t.owner.fullname}
                    </span>
                  )}
                  {t.assignee && (
                    <span
                      className={styles.ticketPerson}
                      title={`Assigned to ${t.assignee.fullname}`}
                    >
                      <CustomIcon name="UserCheck" size={12} />{" "}
                      {t.assignee.fullname}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>No tickets linked to this project yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
