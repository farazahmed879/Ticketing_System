import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages, ProjectStatus } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import CustomInput from "../../components/CustomInput";
import type { Project } from "../../types";
import type { TableColumn } from "../../components/types";
import ProjectModal from "./components/ProjectModal";

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
  const { showNotification, setIsLoading } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projectsRes, clientsRes] = await Promise.all([
        api.get(API_ROUTES.PROJECTS.BASE),
        api.get(API_ROUTES.USERS.BASE, {
          params: { type: "clients", limit: -1 },
        }),
      ]);
      setProjects(projectsRes.data.projects);
      setClients(clientsRes.data.accounts);
    } catch (err) {
      console.error("Failed to fetch projects data", err);
      showNotification("error", "Failed to load projects data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.status.toLowerCase().includes(search.toLowerCase()) ||
        p.clients?.some((c) =>
          c.fullname.toLowerCase().includes(search.toLowerCase()),
        ),
    );
  }, [projects, search]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project?"))
      return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.PROJECTS.BY_ID(id));
      showNotification("success", "Project deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete project",
      );
    } finally {
      setIsLoading(false, "");
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
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const columns: TableColumn<Project>[] = [
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
            <div style={{ fontWeight: 600 }}>{p.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {p.description || "Company project"}
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
    {
      header: "Actions",
      key: "actions",
      render: (p) => (
        <div style={{ display: "flex", gap: 8 }}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEdit(p);
            }}
            icon={<CustomIcon name="Edit2" size={16} />}
          />
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleDelete(p.id);
            }}
            icon={<CustomIcon name="Trash2" size={16} />}
            style={{ color: "var(--accent-danger)" }}
          />
        </div>
      ),
    },
  ];

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
            <CustomButton
              variant="gradient"
              icon={<CustomIcon name="Plus" size={20} />}
              onClick={() => {
                setEditingProject(null);
                setIsModalOpen(true);
              }}
            >
              Add Project
            </CustomButton>
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
          data={filteredProjects}
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
      />
    </>
  );
};

export default ProjectList;
