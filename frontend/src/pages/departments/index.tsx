import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { UIMessages } from "../../utils/constants";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import type { Department } from "../../types";
import DepartmentModal from "./components/DepartmentModal";
import StandardListLayout from "../../components/StandardListLayout";
import CustomPagination from "../../components/CustomPagination";
import { useNavigate } from "react-router-dom";
import { getDepartmentColumns } from "./columns";
import ConfirmationModal from "../../components/ConfirmationModal";
import styles from "./DepartmentList.module.css";

const DepartmentList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { showNotification, setIsLoading } = useNotification();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );

  const { data: departmentData, isLoading: loading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.DEPARTMENTS.BASE);
      return res.data.departments;
    },
  });

  const departments: Department[] = departmentData || [];

  const filteredDepartments = useMemo(() => {
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [departments, search]);

  const paginatedDepartments = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return filteredDepartments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDepartments, currentPage, itemsPerPage]);

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeptToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.DEPARTMENTS.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.DELETING),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      showNotification("success", "Department deleted successfully");
      setIsDeleteModalOpen(false);
      setDeptToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete department",
      );
    },
  });

  const confirmDelete = async () => {
    if (!deptToDelete) return;
    deleteMutation.mutate(deptToDelete);
  };

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingDept) {
        return api.put(API_ROUTES.DEPARTMENTS.BY_ID(editingDept.id), data);
      } else {
        return api.post(API_ROUTES.DEPARTMENTS.BASE, data);
      }
    },
    onMutate: () =>
      setIsLoading(
        true,
        editingDept ? "Updating department..." : "Creating department...",
      ),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      showNotification(
        "success",
        `Department ${editingDept ? "updated" : "created"} successfully`,
      );
      setIsModalOpen(false);
      setEditingDept(null);
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

  const columns = getDepartmentColumns(navigate, handleEdit, handleDeleteClick);

  return (
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                Departments
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage organizational departments
              </p>
            </div>
            <CustomButton
              variant="gradient"
              icon={<CustomIcon name="Plus" size={20} />}
              onClick={() => {
                setEditingDept(null);
                setIsModalOpen(true);
              }}
            >
              Add Department
            </CustomButton>
          </div>
        }
        filters={
          <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
            <CustomInput
              placeholder="Search departments..."
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === "") {
                  setSearch("");
                  setCurrentPage(0);
                }
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setCurrentPage(0);
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
            data={paginatedDepartments}
            loading={loading}
            loadingMessage="Loading departments..."
            emptyMessage="No departments found"
            onRowClick={(d) => navigate(`/departments/${d.id}`)}
          />
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            Loading departments...
          </div>
        ) : paginatedDepartments.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            No departments found
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
            {paginatedDepartments.map((d: Department) => (
              <div
                key={d.id}
                onClick={() => navigate(`/departments/${d.id}`)}
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
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div
                      className="icon-box"
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        background: "rgba(124,58,237,0.1)",
                        color: "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CustomIcon name="Building2" size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
                        {d.name}
                      </h3>
                      <span className="text-xs-muted" style={{ display: "block", marginTop: 2 }}>
                        {d.projects?.length || 0} Projects
                      </span>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 4 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(d)}
                      icon={<CustomIcon name="Edit2" size={14} />}
                      style={{ padding: 6, minHeight: "auto" }}
                    />
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(d.id)}
                      icon={<CustomIcon name="Trash2" size={14} />}
                      style={{ padding: 6, minHeight: "auto", color: "var(--accent-danger)" }}
                    />
                  </div>
                </div>

                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                  {d.description ? d.description : "No description provided."}
                </p>

                <div style={{ borderTop: "1px solid var(--border-glass)", paddingTop: 12 }}>
                  <span className="text-xs-muted" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
                    Teams
                  </span>
                  <div className="flex-wrap-4" style={{ gap: 6 }}>
                    {d.teams?.length ? (
                      d.teams.map((t) => (
                        <span key={t.id} className="chip" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                          {t.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs-muted" style={{ fontSize: "0.75rem" }}>
                        No teams
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {filteredDepartments.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <CustomPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredDepartments.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={filteredDepartments.length}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
      </StandardListLayout>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        department={editingDept}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Department"
        message="Are you sure you want to delete this department?"
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default DepartmentList;
