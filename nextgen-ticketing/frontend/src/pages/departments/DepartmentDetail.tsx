import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import CustomButton from "../../components/CustomButton";
import CustomSkeleton from "../../components/CustomSkeleton";
import CustomTable from "../../components/CustomTable";
import type { Department, Team, Project } from "../../types";
import type { TableColumn } from "../../components/types";

const DepartmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [department, setDepartment] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartment = async () => {
      try {
        setLoading(true);
        const res = await api.get(API_ROUTES.DEPARTMENTS.BY_ID(id!));
        setDepartment(res.data.department);
      } catch (err) {
        console.error("Failed to fetch department details", err);
        showNotification("error", "Failed to load department details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDepartment();
  }, [id, showNotification]);

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        <CustomSkeleton width={200} height={40} />
        <div style={{ marginTop: 20 }}>
          <CustomSkeleton width="100%" height={200} borderRadius={16} />
        </div>
      </div>
    );
  }

  if (!department) {
    return <div style={{ padding: 40 }}>Department not found</div>;
  }

  const teamColumns: TableColumn<Team>[] = [
    {
      header: "Team Name",
      key: "name",
      render: (t) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(124, 58, 237, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomIcon
              name="Users"
              size={16}
              color="var(--accent-primary)"
            />
          </div>
          <span style={{ fontWeight: 500 }}>{t.name}</span>
        </div>
      ),
    },
    {
      header: "Lead",
      key: "lead",
      render: (t) => (
        <span style={{ fontSize: "0.9rem" }}>
          {t.manager?.fullname || "Unassigned"}
        </span>
      ),
    },
    {
      header: "Members",
      key: "members",
      render: (t) => (
        <span style={{ fontSize: "0.9rem" }}>{t.members?.length || 0} Members</span>
      ),
    },
  ];

  const projectColumns: TableColumn<Project>[] = [
    {
      header: "Project Name",
      key: "name",
      render: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomIcon
              name="Briefcase"
              size={16}
              color="#10b981"
            />
          </div>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
        </div>
      ),
    },
    {
      header: "Client",
      key: "client",
      render: (p) => (
        <span style={{ fontSize: "0.9rem" }}>{p.clients?.[0]?.fullname || "N/A"}</span>
      ),
    },
    {
      header: "Status",
      key: "status",
      render: (p) => (
        <span
          style={{
            fontSize: "0.8rem",
            padding: "4px 10px",
            borderRadius: 6,
            background: p.status === "ACTIVE" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: p.status === "ACTIVE" ? "#10b981" : "#ef4444",
          }}
        >
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "20px 40px", display: "flex", flexDirection: "column", gap: 30 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/departments")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{ 
              width: 40, 
              height: 40, 
              padding: 0, 
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}
          />
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
              {department.name}
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: '0.9rem' }}>
              Department Details & Insights
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <CustomButton
            variant="outline"
            icon={<CustomIcon name="Edit2" size={18} />}
            onClick={() => {/* handle edit */}}
          >
            Edit
          </CustomButton>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: "1.2rem" }}>About Department</h3>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
          {department.description || "No description provided for this department."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Associated Teams</h3>
          <CustomTable
            columns={teamColumns}
            data={department.teams || []}
            emptyMessage="No teams associated with this department"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Associated Projects</h3>
          <CustomTable
            columns={projectColumns}
            data={department.projects || []}
            emptyMessage="No projects associated with this department"
          />
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetail;
