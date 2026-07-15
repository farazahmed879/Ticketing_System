import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import type { Team, User } from "../../types";
import TeamModal from "./components/TeamModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";
import styles from "./MyTeam.module.css";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import CustomImage from "../../components/CustomImage";

import StandardListLayout from "../../components/StandardListLayout";
import { getTeamColumns } from "./columns";
import { ROLE_TYPE } from "../roles/roleConstants";

const TeamList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );

  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const canManageTeams =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.HR ||
    user?.role?.permissions?.teams?.create === true;

  const isManagerOrAdmin =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.HR ||
    user?.role?.roleType === ROLE_TYPE.AGENT;

  const { data: teamsData, isLoading: loading } = useQuery({
    queryKey: ["teams", isManagerOrAdmin, search],
    queryFn: async () => {
      const endpoint = isManagerOrAdmin
        ? API_ROUTES.TEAMS.BASE
        : API_ROUTES.TEAMS.MY_TEAM;

      const config = isManagerOrAdmin
        ? { params: { search: search || undefined } }
        : undefined;

      const teamsRes = await api.get(endpoint, config);
      return teamsRes.data.teams || teamsRes.data.accounts || [];
    },
  });

  const teams: Team[] = teamsData || [];

  const { data: usersData } = useQuery({
    queryKey: ["users", "internal-team-modal"],
    queryFn: async () => {
      const usersRes = await api.get(API_ROUTES.USERS.BASE + "?limit=1000");
      const allUsers = usersRes.data.accounts || [];
      return allUsers.filter(
        (u: any) => u.role?.roleType !== ROLE_TYPE.CUSTOMER,
      );
    },
    enabled: isModalOpen,
  });

  const users: User[] = usersData || [];

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTeamToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.TEAMS.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.DELETING),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      showNotification("success", "Team deleted successfully");
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete team",
      );
    },
  });

  const confirmDelete = async () => {
    if (!teamToDelete) return;
    deleteMutation.mutate(teamToDelete);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingTeam) {
        return api.put(API_ROUTES.TEAMS.BY_ID(editingTeam.id), data);
      } else {
        return api.post(API_ROUTES.TEAMS.BASE, data);
      }
    },
    onMutate: () =>
      setIsLoading(true, editingTeam ? "Updating team..." : "Creating team..."),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      showNotification(
        "success",
        `Team ${editingTeam ? "updated" : "created"} successfully`,
      );
      setIsModalOpen(false);
      setEditingTeam(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    },
  });

  const handleSubmit = async (data: any) => {
    submitMutation.mutate(data);
  };

  const columns = getTeamColumns(
    search,
    canManageTeams,
    handleEdit,
    handleDeleteClick,
  );

  const handleCreateTeamClick = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  return (
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Teams</h1>
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
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              width: "100%",
            }}
          >
            <CustomInput
              placeholder="Search teams..."
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === "") {
                  setSearch("");
                }
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                }
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ width: "350px" }}
            />
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--border-glass)",
                background: "rgba(255,255,255,0.03)",
                marginLeft: "auto",
              }}
            >
              <CustomButton
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                icon={<CustomIcon name="List" size={16} />}
                title="List view"
                style={{ padding: "6px 10px" }}
              />
              <CustomButton
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                icon={<CustomIcon name="LayoutGrid" size={16} />}
                title="Grid view"
                style={{ padding: "6px 10px" }}
              />
            </div>
          </div>
        }
      >
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={teams}
            loading={loading}
            loadingMessage="Loading teams..."
            emptyMessage="No teams found"
            onRowClick={(t) => navigate(`/teams/${t.id}`)}
          />
        ) : loading ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              flex: 1,
            }}
          >
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              color: "var(--text-muted)",
              flex: 1,
            }}
          >
            No teams found
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              padding: "4px 0",
              alignContent: "start",
            }}
          >
            {teams.map((t: Team) => (
              <div
                key={t.id}
                onClick={() => navigate(`/teams/${t.id}`)}
                className="glass-card"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  cursor: "pointer",
                  transition: "var(--transition-normal)",
                  position: "relative",
                  border: "1px solid var(--border-glass)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "start",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: 12, alignItems: "center" }}
                  >
                    <div
                      className="icon-box"
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: "rgba(33,150,243,0.1)",
                        color: "var(--accent-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CustomIcon name="Users" size={20} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "1.05rem",
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        {t.name}
                      </h3>
                      <span
                        className="text-xs-muted"
                        style={{ display: "block", marginTop: 2 }}
                      >
                        {t.projects?.length || 0} Assigned Projects
                      </span>
                    </div>
                  </div>
                  {canManageTeams && (
                    <div
                      style={{ display: "flex", gap: 4 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(t)}
                        icon={<CustomIcon name="Edit2" size={14} />}
                        style={{ padding: 6, minHeight: "auto" }}
                      />
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(t.id)}
                        icon={<CustomIcon name="Trash2" size={14} />}
                        style={{
                          padding: 6,
                          minHeight: "auto",
                          color: "var(--accent-danger)",
                        }}
                      />
                    </div>
                  )}
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.description ? t.description : "No description provided."}
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--border-glass)",
                    paddingTop: 12,
                  }}
                >
                  <div>
                    <span
                      className="text-xs-muted"
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 600,
                      }}
                    >
                      Team Lead
                    </span>
                    {t.teamLead ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            overflow: "hidden",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {t.teamLead.image ? (
                            <CustomImage
                              src={t.teamLead.image}
                              alt={t.teamLead.fullname}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                background: "var(--bg-glass)",
                                color: "var(--text-primary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {t.teamLead.fullname?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {t.teamLead.fullname}
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        None
                      </span>
                    )}
                  </div>

                  <div>
                    <span
                      className="text-xs-muted"
                      style={{
                        display: "block",
                        marginBottom: 4,
                        fontWeight: 600,
                        textAlign: "right",
                      }}
                    >
                      Members
                    </span>
                    <CustomAvatarStack
                      items={
                        t.members?.map((m) => ({
                          id: m.id,
                          name: m.fullname,
                          image: m.image,
                        })) || []
                      }
                      limit={3}
                      size={24}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </StandardListLayout>

      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        team={editingTeam}
        users={users}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Team"
        message="Are you sure you want to delete this team?"
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default TeamList;
