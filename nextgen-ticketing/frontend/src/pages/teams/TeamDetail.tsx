import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import type { Team } from "../../types";
import CustomImage from "../../components/CustomImage";

const getInitials = (name?: string) =>
  (name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get(API_ROUTES.TEAMS.BY_ID(id!));
        setTeam(res.data.team);
      } catch (err) {
        console.error("Failed to fetch team", err);
        showNotification("error", "Failed to load team details");
        navigate("/teams");
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [id, navigate, showNotification]);

  if (loading) return <DetailSkeleton />;
  if (!team)
    return (
      <div style={{ padding: 40, textAlign: "center" }}>Team not found.</div>
    );

  return (
    <div
      className="animate-fade-in"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >

      {/* Header card */}
      <div
        className="glass-card"
        style={{
          padding: 30,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
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
          <CustomIcon name="ShieldCheck" size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              margin: 0,
              color: "var(--text-primary)",
            }}
          >
            {team.name}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 8,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CustomIcon name="Users" size={14} />
              {team.members?.length || 0} members
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CustomIcon name="FolderKanban" size={14} />
              {team.projects?.length || 0} projects
            </span>
            {team.department?.name && (
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CustomIcon name="Building2" size={14} />
                {team.department.name}
              </span>
            )}
          </div>
          {team.description && (
            <p
              style={{
                color: "var(--text-secondary)",
                margin: "12px 0 0 0",
                fontSize: "0.95rem",
                lineHeight: 1.6,
              }}
            >
              {team.description}
            </p>
          )}
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 350px", gap: 24 }}
      >
        {/* Members */}
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
              Members ({team.members?.length || 0})
            </h3>
          </div>
          {team.members && team.members.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {team.members.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/profile/${m.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-glass)",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "rgba(124, 58, 237, 0.15)",
                      color: "var(--accent-primary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {m.image ? (
                      <CustomImage
                        src={m.image}
                        alt={m.fullname}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      getInitials(m.fullname)
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {m.fullname}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {m.role?.name || m.email || "Team Member"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              No members in this team yet.
            </p>
          )}
        </div>

        {/* Sidebar: Team Lead + Projects */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {team.teamLead && (
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
                  name="Crown"
                  size={20}
                  color="var(--accent-warning)"
                />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                  Team Lead
                </h3>
              </div>
              <div
                onClick={() => navigate(`/profile/${team.teamLead!.id}`)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-glass)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background:
                      "linear-gradient(135deg, var(--accent-warning), #f59e0b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {team.teamLead.image ? (
                    <CustomImage
                      src={team.teamLead.image}
                      alt={team.teamLead.fullname}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    getInitials(team.teamLead.fullname)
                  )}
                </div>
                <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                  {team.teamLead.fullname}
                </span>
              </div>
            </div>
          )}

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
                name="FolderKanban"
                size={20}
                color="var(--accent-primary)"
              />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
                Assigned Projects ({team.projects?.length || 0})
              </h3>
            </div>
            {team.projects && team.projects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {team.projects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-glass)",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    <CustomIcon
                      name="FolderKanban"
                      size={14}
                      color="var(--accent-primary)"
                    />
                    {p.name}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                No projects assigned yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamDetail;
