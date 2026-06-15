import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages, RoleName } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import type { Team, User, Department, Project } from "../../types";
import type { TableColumn } from "../../components/types";
import TeamModal from "./components/TeamModal";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import Highlight from "../../components/Highlight";
import { useAuth } from "../../context/AuthContext";

import StandardListLayout from "../../components/StandardListLayout";

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [users, setUsers] = useState<User[]>([]);

  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const canManageTeams =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
    user?.role?.permissions?.teams?.create === true;

  const isManagerOrAdmin =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
    user?.role?.name === RoleName.AGENT;

  const fetchData = async (searchTerm = "") => {
    try {
      setLoading(true);
      const endpoint = isManagerOrAdmin
        ? API_ROUTES.TEAMS.BASE
        : API_ROUTES.TEAMS.MY_TEAM;

      // Server-side search (only the teams list endpoint supports it).
      const config = isManagerOrAdmin
        ? { params: { search: searchTerm || undefined } }
        : undefined;

      const teamsRes = await api.get(endpoint, config);
      setTeams(teamsRes.data.teams || teamsRes.data.accounts || []); // Match backend response key
    } catch (err) {
      console.error("Failed to fetch teams data", err);
      showNotification("error", "Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  const fetchModalApis = async () => {
    try {
      setLoading(true);

      const usersRes = await api.get(API_ROUTES.USERS.BASE + "?limit=1000"); // Get all users for member selection

      setUsers(usersRes.data.accounts);
    } catch (err) {
      console.error("Failed to fetch teams data", err);
      showNotification("error", "Failed to load teams data");
    } finally {
      setLoading(false);
    }
  };

  // Debounced server-side search — refetch when the search term settles.
  useEffect(() => {
    const handle = setTimeout(() => fetchData(search), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this team?")) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TEAMS.BY_ID(id));
      showNotification("success", "Team deleted successfully");
      fetchData(search);
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete team",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true, editingTeam ? "Updating team..." : "Creating team...");
    try {
      if (editingTeam) {
        await api.put(API_ROUTES.TEAMS.BY_ID(editingTeam.id), data);
        showNotification("success", "Team updated successfully");
      } else {
        await api.post(API_ROUTES.TEAMS.BASE, data);
        showNotification("success", "Team created successfully");
      }
      setIsModalOpen(false);
      setEditingTeam(null);
      fetchData(search);
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const columns: TableColumn<Team>[] = [
    {
      header: "Team Name",
      key: "name",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            className="glass-card"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(59, 130, 246, 0.1)",
            }}
          >
            <CustomIcon
              name="Users"
              size={18}
              color="var(--accent-secondary)"
            />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>
              <Highlight text={t.name} query={search} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {t.description ? (
                <Highlight text={t.description} query={search} />
              ) : (
                "Internal team"
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Team Lead",
      key: "teamLead",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {t.teamLead ? (
            <>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--bg-input)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.7rem",
                  fontWeight: 600,
                }}
              >
                {t.teamLead.image ? (
                  <img
                    src={t.teamLead.image}
                    alt={t.teamLead.fullname}
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <CustomAvatarStack
                    items={[
                      {
                        id: t.teamLead.id,
                        name: t.teamLead.fullname?.charAt(0),
                      },
                    ]}
                    limit={3}
                    size={26}
                  />
                )}
              </div>
              <span style={{ fontSize: "0.85rem" }}>{t.teamLead.fullname}</span>
            </>
          ) : (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              No Team Lead
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Members",
      key: "members",
      render: (t) => (
        <CustomAvatarStack
          items={
            t.members?.map((m) => ({
              id: m.id,
              name: m.fullname,
              image: m.image,
            })) || []
          }
          limit={3}
          size={26}
        />
      ),
    },
    {
      header: "Projects",
      key: "projects",
      render: (t) => (
        <span style={{ fontSize: "0.9rem" }}>
          {t.projects?.length || 0} Assigned
        </span>
      ),
    },
    ...(canManageTeams
      ? [
          {
            header: "Actions",
            key: "actions" as keyof Team,
            render: (t: Team) => (
              <div style={{ display: "flex", gap: 8 }}>
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(t);
                  }}
                  icon={<CustomIcon name="Edit2" size={16} />}
                />
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(t.id);
                  }}
                  icon={<CustomIcon name="Trash2" size={16} />}
                  style={{ color: "var(--accent-danger)" }}
                />
              </div>
            ),
          },
        ]
      : []),
  ];

  const handleCreateTeamClick = () => {
    setEditingTeam(null);
    fetchModalApis();
    setIsModalOpen(true);
  };

  return (
    <>
      <StandardListLayout
        header={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Teams</h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage cross-functional teams and projects
              </p>
            </div>
            {canManageTeams && (
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={handleCreateTeamClick}
              >
                Add Team
              </CustomButton>
            )}
          </div>
        }
        filters={
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CustomInput
              placeholder="Search teams..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ maxWidth: "350px" }}
            />
          </div>
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={teams}
          loading={loading}
          loadingMessage="Loading teams..."
          emptyMessage="No teams found"
          onRowClick={(t) => navigate(`/teams/${t.id}`)}
        />
      </StandardListLayout>

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        team={editingTeam}
        users={users}
      />
    </>
  );
};

export default TeamList;
