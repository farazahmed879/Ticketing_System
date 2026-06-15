import React, { useEffect, useState, useMemo } from "react";
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

const DepartmentList: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { showNotification, setIsLoading } = useNotification();

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(10);

  const fetchDepts = async () => {
    try {
      if (loading) return; // Prevent multiple simultaneous fetches
      setLoading(true);
      const res = await api.get(API_ROUTES.DEPARTMENTS.BASE);
      setDepartments(res.data.departments);
    } catch (err) {
      console.error("Failed to fetch departments", err);
      showNotification("error", "Failed to load departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepts();
  }, []);

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

  const confirmDelete = async () => {
    if (!deptToDelete) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.DEPARTMENTS.BY_ID(deptToDelete));
      showNotification("success", "Department deleted successfully");
      fetchDepts();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete department",
      );
    } finally {
      setIsLoading(false, "");
      setIsDeleteModalOpen(false);
      setDeptToDelete(null);
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(
      true,
      editingDept ? "Updating department..." : "Creating department...",
    );
    try {
      if (editingDept) {
        await api.put(API_ROUTES.DEPARTMENTS.BY_ID(editingDept.id), data);
        showNotification("success", "Department updated successfully");
      } else {
        await api.post(API_ROUTES.DEPARTMENTS.BASE, data);
        showNotification("success", "Department created successfully");
      }
      setIsModalOpen(false);
      setEditingDept(null);
      fetchDepts();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const columns = getDepartmentColumns(navigate, handleEdit, handleDeleteClick);

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
