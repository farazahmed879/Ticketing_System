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
import type { Team, User } from "../../types";
import TeamModal from "./components/TeamModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getTeamColumns } from "./columns";

const TeamList: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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

  const handleDeleteClick = (id: string) => {
    setTeamToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!teamToDelete) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TEAMS.BY_ID(teamToDelete));
      showNotification("success", "Team deleted successfully");
      fetchData(search);
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete team",
      );
    } finally {
      setIsLoading(false, "");
      setIsDeleteModalOpen(false);
      setTeamToDelete(null);
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

  const columns = getTeamColumns(
    search,
    canManageTeams,
    handleEdit,
    handleDeleteClick,
  );

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
