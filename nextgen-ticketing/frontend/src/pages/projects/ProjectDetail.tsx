import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import { RoleName } from "../../utils/constants";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import type { Project } from "../../types";

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
    user?.role?.name === RoleName.CUSTOMER ? "Team Members" : "Clients";
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
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Back button + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
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
          }}
        />
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
            Project Details
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "4px 0 0 0",
              fontSize: "0.9rem",
            }}
          >
            Overview, owners, and clients
          </p>
        </div>
      </div>

      {/* Header card */}
      <div
        className="glass-card"
        style={{
          padding: 30,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              boxShadow: "0 4px 15px rgba(124, 58, 237, 0.3)",
            }}
          >
            <CustomIcon name="FolderKanban" size={32} />
          </div>
          <div>
            <h2
              style={{
                fontSize: "1.8rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--text-primary)",
              }}
            >
              {project.name}
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <CustomBadge variant={getStatusVariant(project.status)}>
                {project.status}
              </CustomBadge>
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.95rem",
                }}
              >
                {project.department?.name || "Global Project"}
              </span>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.9rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <CustomIcon name="Calendar" size={14} />
                Started {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}
      >
        {/* Description */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <CustomIcon
              name="FileText"
              size={20}
              color="var(--accent-primary)"
            />
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
              About this Project
            </h3>
          </div>
          <p
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              fontSize: "1rem",
              whiteSpace: "pre-wrap",
            }}
          >
            {project.description?.trim() ||
              "No description has been provided for this project."}
          </p>
        </div>

        {/* Sidebar Info (Manager + Clients) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Project Manager */}
          {project.manager && (
            <div className="glass-card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <CustomIcon
                  name="UserCheck"
                  size={20}
                  color="var(--accent-primary)"
                />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Project Manager
                </h3>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {project.manager.fullname.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                  {project.manager.fullname}
                </span>
              </div>
            </div>
          )}

          {/* Team Lead */}
          {project.teamLead && (
            <div className="glass-card" style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <CustomIcon
                  name="User"
                  size={20}
                  color="var(--accent-success)"
                />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Team Lead
                </h3>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, var(--accent-success), #10b981)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {project.teamLead.fullname.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                  {project.teamLead.fullname}
                </span>
              </div>
            </div>
          )}

          {/* Clients */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 20,
              }}
            >
              <CustomIcon name="Users" size={20} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                {peopleLabel} ({project.clients?.length || 0})
              </h3>
            </div>
            {project.clients && project.clients.length > 0 ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {project.clients.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-glass)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {c.fullname.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                      {c.fullname}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No clients linked to this project.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tickets */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <CustomIcon name="Ticket" size={20} color="var(--accent-primary)" />
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
            Tickets ({project.tickets?.length || 0})
          </h3>
        </div>
        {project.tickets && project.tickets.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      minWidth: 60,
                    }}
                  >
                    #{t.uid}
                  </span>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {t.subject}
                  </span>
                </div>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 12 }}
                >
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
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                      title={`Created by ${t.owner.fullname}`}
                    >
                      <CustomIcon name="User" size={12} /> {t.owner.fullname}
                    </span>
                  )}
                  {t.assignee && (
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
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
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            No tickets linked to this project yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
