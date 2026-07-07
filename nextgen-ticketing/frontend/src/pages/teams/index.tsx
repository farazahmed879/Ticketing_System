import React, { useEffect, useState } from "react";
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

import StandardListLayout from "../../components/StandardListLayout";
import { getTeamColumns } from "./columns";
import { ROLE_TYPE } from "../roles/roleConstants";

const TeamList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

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

  // Debounced server-side search — refetch when the search term settles.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const { data: teamsData, isLoading: loading } = useQuery({
    queryKey: ["teams", isManagerOrAdmin, debouncedSearch],
    queryFn: async () => {
      const endpoint = isManagerOrAdmin
        ? API_ROUTES.TEAMS.BASE
        : API_ROUTES.TEAMS.MY_TEAM;

      const config = isManagerOrAdmin
        ? { params: { search: debouncedSearch || undefined } }
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
