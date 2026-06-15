import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { ProjectStatus, RoleName } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import CustomInput from "../../components/CustomInput";
import Highlight from "../../components/Highlight";
import type { Project } from "../../types";
import type { TableColumn } from "../../components/types";
import ProjectModal from "./components/ProjectModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case ProjectStatus.ACTIVE:
      return "success";
    case ProjectStatus.COMPLETED:
      return "info";
    case ProjectStatus.ON_HOLD:
      return "warning";
    case ProjectStatus.CANCELLED:
      return "danger";
    default:
      return "neutral";
  }
};

import StandardListLayout from "../../components/StandardListLayout";

const ProjectList: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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

  const fetchData = async (searchTerm = "") => {
    try {
      setLoading(true);
      const projectsRes = await api.get(API_ROUTES.PROJECTS.BASE, {
        params: {
          role: user?.role?.name,
          userId: user?.id,
          search: searchTerm || undefined,
        },
      });
      setProjects(projectsRes.data.projects);
    } catch (err) {
      console.error("Failed to fetch projects data", err);
      showNotification("error", "Failed to load projects data");
    } finally {
      setLoading(false);
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

  // Debounced server-side search — refetch when the search term settles.
  useEffect(() => {
    const handle = setTimeout(() => fetchData(search), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

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
      fetchData(search);
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

  const handleCreateButtonClick = () => {
    projectModal();
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const columns: TableColumn<Project>[] = useMemo(() => {
    const cols: TableColumn<Project>[] = [
      {
        header: "Project",
        key: "name",
        render: (p) => (
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
                background: "rgba(16, 185, 129, 0.1)",
              }}
            >
              <CustomIcon
                name="FolderKanban"
                size={18}
                color="var(--accent-success)"
              />
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>
                <Highlight text={p.name} query={search} />
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>
                  {p.description ? (
                    <Highlight text={p.description} query={search} />
                  ) : (
                    "Company project"
                  )}
                </span>
                {p.manager && (
                  <>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CustomIcon
                        name="User"
                        size={12}
                        color="var(--text-muted)"
                      />
                      Manager: {p.manager.fullname}
                    </span>
                  </>
                )}
                {p.teams && p.teams.length > 0 && (
                  <>
                    <span style={{ opacity: 0.5 }}>•</span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CustomIcon
                        name="Users"
                        size={12}
                        color="var(--text-muted)"
                      />
                      {p.teams.map((t) => t.name).join(", ")}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        ),
      },

      {
        header: "Clients",
        key: "clients",
        render: (p) => (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {p.clients?.length ? (
              p.clients.map((c) => (
                <span
                  key={c.id}
                  style={{
                    fontSize: "0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 8px",
                    borderRadius: 4,
                  }}
                >
                  {c.fullname}
                </span>
              ))
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                No clients assigned
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Status",
        key: "status",
        render: (p) => (
          <CustomBadge variant={statusBadgeVariant(p.status) as any}>
            {p.status}
          </CustomBadge>
        ),
      },
    ];

    if (canUpdate || canDelete) {
      cols.push({
        header: "Actions",
        key: "actions",
        render: (p) => (
          <div style={{ display: "flex", gap: 8 }}>
            {canUpdate && (
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleEdit(p);
                }}
                icon={<CustomIcon name="Edit2" size={16} />}
              />
            )}
            {canDelete && (
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleDeleteClick(p.id);
                }}
                icon={<CustomIcon name="Trash2" size={16} />}
                style={{ color: "var(--accent-danger)" }}
              />
            )}
          </div>
        ),
      });
    }

    return cols;
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
