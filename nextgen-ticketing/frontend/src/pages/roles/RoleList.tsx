import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import Modal from "../../components/Modal.tsx";
import { useNotification } from "../../context/NotificationContext";
import { RoleName, StatusName } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { Role } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import type { TableColumn } from "../../components/types";

const RoleList: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const { showNotification, setIsLoading } = useNotification();

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAgent, setIsAgent] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [permissions, setPermissions] = useState<any>({
    tickets: {
      view: false,
      create: false,
      update: false,
      delete: false,
      assign: false,
      priority: false,
    },
    comments: { view: false, create: false },
    users: { view: false, create: false, update: false, delete: false },
    teams: { view: false, create: false, update: false, delete: false },
    groups: { view: false, create: false, update: false, delete: false },
    roles: { view: false, create: false, update: false, delete: false },
    departments: { view: false, create: false, update: false, delete: false },
    messages: { view: false, create: false },
    dashboard: { view: false },
    boardStatuses: {}, // { statusId: true/false }
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [rolesRes, statusRes] = await Promise.all([
        api.get(API_ROUTES.ROLES.BASE),
        api.get(API_ROUTES.COMMON.STATUSES),
      ]);
      setRoles(rolesRes.data.roles);
      setStatuses(statusRes.data.statuses);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showNotification("error", "Failed to load roles/statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        name,
        description,
        isAdmin,
        isAgent,
        isCustomer,
        isEmployee,
        permissions,
      };
      if (editingId) {
        await api.put(API_ROUTES.ROLES.BY_ID(editingId), payload);
        showNotification("success", "Role updated successfully");
      } else {
        await api.post(API_ROUTES.ROLES.BASE, payload);
        showNotification("success", "Role created successfully");
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Operation failed",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setIsAdmin(false);
    setIsAgent(false);
    setIsCustomer(false);
    setIsEmployee(false);
    setPermissions({
      tickets: {
        view: false,
        create: false,
        update: false,
        delete: false,
        assign: false,
        priority: false,
      },
      comments: { view: false, create: false },
      users: { view: false, create: false, update: false, delete: false },
      teams: { view: false, create: false, update: false, delete: false },
      groups: { view: false, create: false, update: false, delete: false },
      roles: { view: false, create: false, update: false, delete: false },
      departments: { view: false, create: false, update: false, delete: false },
      messages: { view: false, create: false },
      dashboard: { view: false },
      boardStatuses: {},
    });
    setEditingId(null);
  };

  const handleEdit = (role: any) => {
    setName(role.name);
    setDescription(role.description || "");
    setIsAdmin(role.isAdmin);
    setIsAgent(role.isAgent);
    setIsCustomer(role.isCustomer || false);
    setIsEmployee(role.isEmployee || false);
    setPermissions(
      role.permissions || {
        tickets: {
          view: false,
          create: false,
          update: false,
          delete: false,
          assign: false,
          priority: false,
        },
        comments: { view: false, create: false },
        users: { view: false, create: false, update: false, delete: false },
        teams: { view: false, create: false, update: false, delete: false },
        groups: { view: false, create: false, update: false, delete: false },
        roles: { view: false, create: false, update: false, delete: false },
        departments: {
          view: false,
          create: false,
          update: false,
          delete: false,
        },
        messages: { view: false, create: false },
        dashboard: { view: false },
        boardStatuses: {},
      },
    );
    setEditingId(role.id);
    setIsModalOpen(true);
  };

  const handlePermissionChange = (module: string, action: string) => {
    if (isAdmin) return; // Prevent change if admin
    setPermissions((prev: any) => {
      const modulePerms = prev[module] || {};
      return {
        ...prev,
        [module]: {
          ...modulePerms,
          [action]: !modulePerms[action],
        },
      };
    });
  };

  const handleStatusPermissionChange = (statusId: string) => {
    if (isAdmin) return;
    setPermissions((prev: any) => ({
      ...prev,
      boardStatuses: {
        ...(prev.boardStatuses || {}),
        [statusId]: !prev.boardStatuses?.[statusId],
      },
    }));
  };

  const toggleAdmin = () => {
    if (isCoreAdmin) return;
    if (isAdmin) {
      setIsAdmin(false);
      resetPermissions();
      return;
    }
    setIsAdmin(true);
    setIsAgent(false);
    setIsCustomer(false);
    setIsEmployee(false);

    const allPerms = { ...permissions };
    permissionModules.forEach((module) => {
      module.actions.forEach((action) => {
        if (!allPerms[module.id]) allPerms[module.id] = {};
        allPerms[module.id][action] = true;
      });
    });

    allPerms.boardStatuses = {};
    statuses.forEach((s) => {
      allPerms.boardStatuses[s.id] = true;
    });

    setPermissions(allPerms);
  };

  const toggleAgent = () => {
    if (isCoreAdmin) return;
    if (isAgent) {
      setIsAgent(false);
      resetPermissions();
      return;
    }
    setIsAdmin(false);
    setIsAgent(true);
    setIsCustomer(false);
    setIsEmployee(false);

    const agentPerms = {
      ...permissions,
      dashboard: { view: true },
      tickets: {
        view: true,
        create: true,
        update: true,
        delete: false,
        assign: true,
        priority: true,
      },
      comments: { view: true, create: true },
      messages: { view: true, create: true },
    };
    setPermissions(agentPerms);
  };

  const toggleCustomer = () => {
    if (isCoreAdmin) return;
    if (isCustomer) {
      setIsCustomer(false);
      resetPermissions();
      return;
    }
    setIsAdmin(false);
    setIsAgent(false);
    setIsCustomer(true);
    setIsEmployee(false);

    const custPerms = {
      ...permissions,
      dashboard: { view: true },
      tickets: {
        view: true,
        create: true,
        update: true,
        delete: true,
        assign: true,
        priority: true,
      },
      comments: { view: true, create: true },
      messages: { view: true, create: true },
      boardStatuses: {},
    };

    const cancelledStatus = statuses.find(
      (s) => s.name === StatusName.CANCELLED,
    );
    if (cancelledStatus) {
      custPerms.boardStatuses[cancelledStatus.id] = true;
    }

    setPermissions(custPerms);
  };

  const toggleEmployee = () => {
    if (isCoreAdmin) return;
    if (isEmployee) {
      setIsEmployee(false);
      resetPermissions();
      return;
    }
    setIsAdmin(false);
    setIsAgent(false);
    setIsCustomer(false);
    setIsEmployee(true);

    const empPerms = {
      ...permissions,
      tickets: {
        view: true,
        create: false,
        update: false,
        delete: false,
        assign: false,
        priority: true,
      },
      comments: { view: true, create: true },
      messages: { view: true, create: true },
      teams: { view: true, create: false, update: false, delete: false },
      groups: { view: true, create: false, update: false, delete: false },
      boardStatuses: {},
    };

    const allowedStatusNames = [
      StatusName.OPEN,
      StatusName.IN_PROCESS,
      StatusName.RESOLVED,
    ];
    statuses.forEach((s) => {
      if (allowedStatusNames.includes(s.name)) {
        empPerms.boardStatuses[s.id] = true;
      }
    });

    setPermissions(empPerms);
  };

  const resetPermissions = () => {
    setPermissions({
      tickets: {
        view: false,
        create: false,
        update: false,
        delete: false,
        assign: false,
        priority: false,
      },
      comments: { view: false, create: false },
      users: { view: false, create: false, update: false, delete: false },
      teams: { view: false, create: false, update: false, delete: false },
      groups: { view: false, create: false, update: false, delete: false },
      roles: { view: false, create: false, update: false, delete: false },
      departments: { view: false, create: false, update: false, delete: false },
      messages: { view: false, create: false },
      dashboard: { view: false },
      boardStatuses: {},
    });
  };

  const isCoreAdmin =
    (editingId &&
      roles.find((r) => r.id === editingId)?.name === RoleName.ADMIN) ||
    false;

  const permissionModules = [
    { id: "dashboard", label: "Dashboard", actions: ["view"] },
    {
      id: "tickets",
      label: "Tickets",
      actions: ["view", "create", "update", "delete", "assign", "priority"],
    },
    { id: "comments", label: "Comments", actions: ["view", "create"] },
    { id: "messages", label: "Messages", actions: ["view", "create"] },
    {
      id: "users",
      label: "Users",
      actions: ["view", "create", "update", "delete"],
    },
    {
      id: "teams",
      label: "Teams",
      actions: ["view", "create", "update", "delete"],
    },
    {
      id: "groups",
      label: "Groups",
      actions: ["view", "create", "update", "delete"],
    },
    {
      id: "departments",
      label: "Departments",
      actions: ["view", "create", "update", "delete"],
    },
    {
      id: "roles",
      label: "Roles",
      actions: ["view", "create", "update", "delete"],
    },
  ];

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this role?")) return;
    setIsLoading(true);
    try {
      await api.delete(API_ROUTES.ROLES.BY_ID(id));
      showNotification("success", "Role deleted successfully");
      fetchData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete role",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const columns: TableColumn<Role>[] = [
    {
      header: "Role Name",
      key: "name",
      render: (role) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600 }}>
          <CustomIcon name="Shield" size={18} color={role.isAdmin ? "var(--accent-danger)" : "var(--accent-primary)"} />
          {role.name}
        </div>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (role) => (
        <span style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {role.description || "-"}
        </span>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (role) => (
        <div style={{ display: "flex", gap: 8 }}>
          {role.isAdmin && (
            <CustomBadge variant="danger">
              {RoleName.ADMIN}
            </CustomBadge>
          )}
          {role.isAgent && (
            <CustomBadge variant="info">
              {RoleName.AGENT}
            </CustomBadge>
          )}
          {role.isCustomer && (
            <CustomBadge variant="success">
              {RoleName.CUSTOMER}
            </CustomBadge>
          )}
          {role.isEmployee && (
            <CustomBadge variant="warning">
              {RoleName.EMPLOYEE}
            </CustomBadge>
          )}
          {!role.isAdmin && !role.isAgent && !role.isCustomer && !role.isEmployee && (
            <CustomBadge variant="neutral">
              Other
            </CustomBadge>
          )}
        </div>
      ),
    },
    {
      header: "Users",
      key: "users",
      render: (role) => `${role._count?.users || 0} users`,
    },
    {
      header: "Actions",
      key: "actions",
      render: (role) => (
        <div style={{ display: "flex", gap: 12 }}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(role)}
            title="Edit Role"
            icon={<CustomIcon name="Edit2" size={18} />}
          />
          <CustomButton
            variant="danger"
            size="sm"
            onClick={() => handleDelete(role.id)}
            title="Delete Role"
            icon={<CustomIcon name="Trash2" size={18} />}
            style={{ background: 'transparent' }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
            Roles & Permissions
          </h1>
          <p style={{ color: "var(--text-muted)" }}>
            Manage system access levels and permissions
          </p>
        </div>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Plus" size={20} />}
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          Create Role
        </CustomButton>
      </div>

      <CustomTable
        columns={columns}
        data={roles}
        loading={loading}
        loadingMessage="Loading roles..."
        emptyMessage="No roles found"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="1150px"
        title={editingId ? "Edit Role & Permissions" : "Create New Role"}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "400px 1fr",
            gap: 30,
            maxHeight: "80vh",
            padding: "10px 0",
          }}
        >
          {/* Left Column: Basic Info & Kanban */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              overflowY: "auto",
              paddingRight: 10,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Role Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Support Manager"
                  required
                  disabled={isCoreAdmin}
                  style={{ width: "100%" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                  }}
                >
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the role's purpose"
                  rows={3}
                  style={{ resize: "none", width: "100%" }}
                  disabled={isCoreAdmin}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 10,
              }}
            >
              <div
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  cursor: isCoreAdmin ? "not-allowed" : "pointer",
                  border: isAdmin
                    ? "1px solid var(--accent-danger)"
                    : "1px solid var(--border-glass)",
                  background: isAdmin
                    ? "rgba(244, 67, 54, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  opacity: isCoreAdmin ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onClick={() => toggleAdmin()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CustomIcon
                    name="ShieldAlert"
                    size={18}
                    color={isAdmin ? "#f44336" : "var(--text-muted)"}
                  />
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                    Administrator
                  </div>
                </div>
              </div>

              <div
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  cursor: isCoreAdmin ? "not-allowed" : "pointer",
                  border: isAgent
                    ? "1px solid var(--accent-primary)"
                    : "1px solid var(--border-glass)",
                  background: isAgent
                    ? "rgba(33, 150, 243, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  opacity: isCoreAdmin ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onClick={() => toggleAgent()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CustomIcon
                    name="ShieldCheck"
                    size={18}
                    color={isAgent ? "#2196f3" : "var(--text-muted)"}
                  />
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                    Agent
                  </div>
                </div>
              </div>

              <div
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  cursor: isCoreAdmin ? "not-allowed" : "pointer",
                  border: isCustomer
                    ? "1px solid var(--accent-success)"
                    : "1px solid var(--border-glass)",
                  background: isCustomer
                    ? "rgba(76, 175, 80, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  opacity: isCoreAdmin ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onClick={() => toggleCustomer()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CustomIcon
                    name="User"
                    size={18}
                    color={isCustomer ? "#4caf50" : "var(--text-muted)"}
                  />
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                    Customer
                  </div>
                </div>
              </div>

              <div
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  cursor: isCoreAdmin ? "not-allowed" : "pointer",
                  border: isEmployee
                    ? "1px solid #ff9800"
                    : "1px solid var(--border-glass)",
                  background: isEmployee
                    ? "rgba(255, 152, 0, 0.05)"
                    : "rgba(255,255,255,0.02)",
                  opacity: isCoreAdmin ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onClick={() => toggleEmployee()}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CustomIcon
                    name="Briefcase"
                    size={18}
                    color={isEmployee ? "#ff9800" : "var(--text-muted)"}
                  />
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                    Employee
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  borderBottom: "1px solid var(--border-glass)",
                  paddingBottom: 8,
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Board Transitions
                </label>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 10,
                  opacity: isAdmin ? 0.6 : 1,
                }}
              >
                {statuses.map((status) => (
                  <div
                    key={status.id}
                    className="glass-card"
                    style={{
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: permissions.boardStatuses?.[status.id]
                        ? `1px solid ${status.color}50`
                        : "1px solid var(--border-glass)",
                      background: permissions.boardStatuses?.[status.id]
                        ? `${status.color}08`
                        : "rgba(255,255,255,0.01)",
                      cursor: isAdmin ? "not-allowed" : "pointer",
                    }}
                    onClick={() => handleStatusPermissionChange(status.id)}
                  >
                    <input
                      type="checkbox"
                      checked={permissions.boardStatuses?.[status.id] || false}
                      onChange={() => {}}
                      disabled={isAdmin}
                      style={{ accentColor: status.color }}
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: permissions.boardStatuses?.[status.id]
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {status.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <CustomButton
              type="submit"
              variant={isCoreAdmin ? "secondary" : "gradient"}
              fullWidth
              disabled={isCoreAdmin}
              style={{
                marginTop: "auto",
                boxShadow: isCoreAdmin ? "none" : "0 10px 20px rgba(0,0,0,0.2)",
              }}
              title={isCoreAdmin ? "The system Admin role cannot be modified" : ""}
            >
              {editingId ? "Update Role" : "Create Role"}
            </CustomButton>
          </div>

          {/* Right Column: Permissions Matrix */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              borderLeft: "1px solid var(--border-glass)",
              paddingLeft: 30,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid var(--border-glass)",
                paddingBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CustomIcon name="Shield" size={20} color="var(--accent-primary)" />
                <label
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  Permissions Matrix
                </label>
              </div>
              {isAdmin && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--accent-danger)",
                    fontWeight: 700,
                    letterSpacing: "0.5px",
                  }}
                >
                  ADMIN OVERRIDE ACTIVE
                </span>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                opacity: isAdmin ? 0.6 : 1,
              }}
            >
              {permissionModules.map((module) => (
                <div
                  key={module.id}
                  className="glass-card"
                  style={{
                    padding: "16px 20px",
                    background: "rgba(255,255,255,0.01)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "0.95rem",
                        color: "var(--text-primary)",
                      }}
                    >
                      {module.label}
                    </span>
                    <div style={{ display: "flex", gap: 20 }}>
                      {module.actions.map((action) => (
                        <label
                          key={action}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: isAdmin ? "not-allowed" : "pointer",
                            fontSize: "0.85rem",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={permissions[module.id]?.[action] || false}
                            onChange={() =>
                              handlePermissionChange(module.id, action)
                            }
                            disabled={isAdmin}
                            style={{
                              width: 18,
                              height: 18,
                              accentColor: "var(--accent-primary)",
                              cursor: isAdmin ? "not-allowed" : "pointer",
                            }}
                          />
                          <span
                            style={{
                              textTransform: "capitalize",
                              fontWeight: 500,
                              color: permissions[module.id]?.[action]
                                ? "var(--text-primary)"
                                : "var(--text-muted)",
                            }}
                          >
                            {action}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RoleList;
