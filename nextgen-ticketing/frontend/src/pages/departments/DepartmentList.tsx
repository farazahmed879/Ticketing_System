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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { showNotification, setIsLoading } = useNotification();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

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
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
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
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CustomInput
              placeholder="Search departments..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setCurrentPage(0);
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ maxWidth: "350px" }}
            />
          </div>
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={paginatedDepartments}
          loading={loading}
          loadingMessage="Loading departments..."
          emptyMessage="No departments found"
          onRowClick={(d) => navigate(`/departments/${d.id}`)}
        />
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
