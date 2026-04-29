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
import type { TableColumn } from "../../components/types";
import DepartmentModal from "./components/DepartmentModal";

const DepartmentList: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const { showNotification, setIsLoading } = useNotification();

  const fetchDepts = async () => {
    try {
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
    return departments.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [departments, search]);

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.DEPARTMENTS.BY_ID(id));
      showNotification("success", "Department deleted successfully");
      fetchDepts();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to delete department");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleSubmit = async (data: any) => {
    setIsLoading(true, editingDept ? "Updating department..." : "Creating department...");
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
      showNotification("error", err.response?.data?.error || "Operation failed");
    } finally {
      setIsLoading(false, "");
    }
  };

  const columns: TableColumn<Department>[] = [
    {
      header: "Department",
      key: "name",
      render: (d) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="glass-card" style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(124, 58, 237, 0.1)' }}>
            <CustomIcon name="Building2" size={18} color="var(--accent-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{d.name}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{d.description || "No description"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Teams",
      key: "teams",
      render: (d) => (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {d.teams?.length ? d.teams.map(t => (
            <span key={t.id} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>{t.name}</span>
          )) : <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No teams</span>}
        </div>
      ),
    },
    {
      header: "Projects",
      key: "projects",
      render: (d) => (
        <span style={{ fontSize: "0.9rem" }}>{d.projects?.length || 0} Projects</span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (d) => (
        <div style={{ display: "flex", gap: 8 }}>
          <CustomButton variant="ghost" size="sm" onClick={() => handleEdit(d)} icon={<CustomIcon name="Edit2" size={16} />} />
          <CustomButton variant="ghost" size="sm" onClick={() => handleDelete(d.id)} icon={<CustomIcon name="Trash2" size={16} />} style={{ color: "var(--accent-danger)" }} />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Departments</h1>
          <p style={{ color: "var(--text-muted)" }}>Manage organizational departments</p>
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

      <div style={{ marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        <CustomInput
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<CustomIcon name="Search" size={18} />}
          containerStyle={{ maxWidth: "350px" }}
        />
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <CustomTable
          columns={columns}
          data={filteredDepartments}
          loading={loading}
          loadingMessage="Loading departments..."
          emptyMessage="No departments found"
        />
      </div>

      <DepartmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        department={editingDept}
      />
    </div>
  );
};

export default DepartmentList;
