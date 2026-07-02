/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import {
  RoleName,
  PROJECT_STATUS_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import type { Project } from "../../types";
import type { TableColumn } from "../../components/types";
import ProjectModal from "./components/ProjectModal";
import { useAuth } from "../../context/AuthContext";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomPagination from "../../components/CustomPagination";

import StandardListLayout from "../../components/StandardListLayout";
import { getProjectColumns } from "./columns";
import { ROLE_TYPE } from "../roles/roleConstants";

const ProjectList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedStatus, setDebouncedStatus] = useState("");

  const canCreate =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.groups?.create === true;
  const canUpdate =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.groups?.update === true;
  const canDelete =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.groups?.delete === true;

  const { data: projectsData, isLoading: loading } = useQuery({
    queryKey: [
      "projects",
      debouncedSearch,
      debouncedStatus,
      currentPage,
      itemsPerPage,
      user?.id,
    ],
    queryFn: async () => {
      const projectsRes = await api.get(API_ROUTES.PROJECTS.BASE, {
        params: {
          role: user?.role?.name,
          userId: user?.id,
          search: debouncedSearch || undefined,
          status: debouncedStatus || undefined,
          page: currentPage,
          limit: itemsPerPage,
        },
      });
      return {
        projects: projectsRes.data.projects,
        total: projectsRes.data.total || 0,
      };
    },
    enabled: !!user,
  });

  const projects = projectsData?.projects || [];
  const totalItems = projectsData?.total || 0;

  const { data: modalData } = useQuery({
    queryKey: ["projects", "modal-data"],
    queryFn: async () => {
      const [clientsRes, teamsRes] = await Promise.all([
        api.get(API_ROUTES.USERS.GET_BY_ROLES, {
          params: { roles: [RoleName.CUSTOMER, RoleName.AGENT], limit: -1 },
        }),
        api.get(API_ROUTES.TEAMS.BASE, {
          params: { limit: -1 },
        }),
      ]);
      const accounts = clientsRes.data.accounts || [];
      return {
        clients: accounts.filter(
          (u: any) => u.role?.roleType === ROLE_TYPE.CUSTOMER,
        ),
        managers: accounts.filter(
          (u: any) => u.role?.roleType === ROLE_TYPE.AGENT,
        ),
        teams: teamsRes.data.teams || [],
      };
    },
    enabled: isModalOpen,
  });

  const clients = modalData?.clients || [];
  const managers = modalData?.managers || [];
  const teams = modalData?.teams || [];

  // Debounce search/filter inputs and reset page to 0 when they change
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(search);
      setDebouncedStatus(statusFilter);
      setCurrentPage(0);
    }, 300);
    return () => clearTimeout(handle);
  }, [search, statusFilter]);

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setProjectToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.PROJECTS.BY_ID(id));
    },
    onMutate: () => setConfirmLoading(true),
    onSettled: () => setConfirmLoading(false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showNotification("success", "Project deleted successfully");
      setIsDeleteModalOpen(false);
      setProjectToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete project",
      );
    },
  });

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;
    deleteMutation.mutate(projectToDelete);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingProject) {
        return api.put(API_ROUTES.PROJECTS.BY_ID(editingProject.id), data);
      } else {
        return api.post(API_ROUTES.PROJECTS.BASE, data);
      }
    },
    onMutate: () =>
      setIsLoading(
        true,
        editingProject ? "Updating project..." : "Creating project...",
      ),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      showNotification(
        "success",
        `Project ${editingProject ? "updated" : "created"} successfully`,
      );
      setIsModalOpen(false);
      setEditingProject(null);
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

  const handleCreateButtonClick = () => {
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
        pagination={
          <CustomPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(0);
            }}
          />
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
