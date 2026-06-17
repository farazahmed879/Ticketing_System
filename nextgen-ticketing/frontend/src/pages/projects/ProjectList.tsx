/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { RoleName, PROJECT_STATUS_OPTIONS } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import type { Project } from "../../types";
import type { TableColumn } from "../../components/types";
import ProjectModal from "./components/ProjectModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getProjectColumns } from "./columns";

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const canCreate =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.groups?.create === true;
  const canUpdate =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.groups?.update === true;
  const canDelete =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.groups?.delete === true;

  // Tracks the params of the request currently in flight. Prevents an
  // identical request from being fired again while one is already running
  // (e.g. React StrictMode's double-mount in dev, or rapid re-triggers).
  const inFlightKey = useRef<string | null>(null);

  const fetchData = async (searchTerm = "", status = "") => {
    const key = `${searchTerm}__${status}__${user?.id ?? ""}`;
    if (inFlightKey.current === key) return;
    inFlightKey.current = key;
    try {
      setLoading(true);
      const projectsRes = await api.get(API_ROUTES.PROJECTS.BASE, {
        params: {
          role: user?.role?.name,
          userId: user?.id,
          search: searchTerm || undefined,
          status: status || undefined,
        },
      });
      setProjects(projectsRes.data.projects);
    } catch (err) {
      console.error("Failed to fetch projects data", err);
      showNotification("error", "Failed to load projects data");
    } finally {
      setLoading(false);
      inFlightKey.current = null;
    }
  };

  const projectModal = async () => {
    try {
      setLoading(true);
      const [clientsRes, teamsRes] = await Promise.all([
        api.get(API_ROUTES.USERS.GET_BY_ROLES, {
          params: { roles: [RoleName.CUSTOMER, RoleName.AGENT], limit: -1 },
        }),
        api.get(API_ROUTES.TEAMS.BASE, {
          params: { limit: -1 },
        }),
      ]);
      setClients(
        clientsRes.data.accounts.filter(
          (u: any) => u.role?.name === RoleName.CUSTOMER,
        ),
      );
      setManagers(
        clientsRes.data.accounts.filter(
          (u: any) => u.role?.name === RoleName.AGENT,
        ),
      );
      setTeams(teamsRes.data.teams || []);
    } catch (err) {
      console.error("Failed to fetch projects data", err);
      showNotification("error", "Failed to load projects data");
    } finally {
      setLoading(false);
    }
  };

  // Debounced server-side search/filter — refetch when search or status settles.
  useEffect(() => {
    const handle = setTimeout(() => fetchData(search, statusFilter), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter]);

  const handleEdit = (project: Project) => {
    // Load the client/manager/team option lists (same as the Add flow) so the
    // edit form can show and pre-select the current assignments.
    projectModal();
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    setConfirmLoading(true);
    try {
      await api.delete(API_ROUTES.PROJECTS.BY_ID(projectToDelete));
      showNotification("success", "Project deleted successfully");
      fetchData(search, statusFilter);
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete project",
      );
    } finally {
      setConfirmLoading(false);
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(
      true,
      editingProject ? "Updating project..." : "Creating project...",
    );
    try {
      if (editingProject) {
        await api.put(API_ROUTES.PROJECTS.BY_ID(editingProject.id), data);
        showNotification("success", "Project updated successfully");
      } else {
        await api.post(API_ROUTES.PROJECTS.BASE, data);
        showNotification("success", "Project created successfully");
      }
      setIsModalOpen(false);
      setEditingProject(null);
      fetchData(search, statusFilter);
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleCreateButtonClick = () => {
    projectModal();
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const columns: TableColumn<Project>[] = useMemo(() => {
    return getProjectColumns(
      search,
      canUpdate,
      canDelete,
      handleEdit,
      handleDeleteClick,
    );
    // `search` is included so the Highlight in the render fns uses the
    // current term (the column closures would otherwise capture a stale value).
  }, [canUpdate, canDelete, search]);

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
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Projects</h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage client and internal projects
              </p>
            </div>
            {canCreate && (
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={handleCreateButtonClick}
              >
                Add Project
              </CustomButton>
            )}
          </div>
        }
        filters={
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CustomInput
              placeholder="Search projects..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ maxWidth: "350px" }}
            />
            <CustomSelect
              value={statusFilter}
              onChange={(val: string) => setStatusFilter(val)}
              placeholder="All Statuses"
              options={[
                { value: "", label: "All Statuses" },
                ...PROJECT_STATUS_OPTIONS,
              ]}
              icon={<CustomIcon name="Activity" size={18} />}
              style={{ minWidth: 200 }}
            />
          </div>
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={projects}
          loading={loading}
          loadingMessage="Loading projects..."
          emptyMessage="No projects found"
          onRowClick={(p) => navigate(`/projects/${p.id}`)}
        />
      </StandardListLayout>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        project={editingProject}
        clients={clients}
        managers={managers}
        teams={teams}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Project"
        message="Are you sure you want to permanently delete this project? This action cannot be undone."
        confirmText="Delete"
        type="danger"
        loading={confirmLoading}
      />
    </>
  );
};

export default ProjectList;
