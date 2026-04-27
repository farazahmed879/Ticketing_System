import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomButton from "../../../components/CustomButton";
import { RoleName } from "../../../utils/constants";
import type { Role, RoleFormData } from "../../../types";

interface RoleFormProps {
  initialData?: Role | null;
  statuses: any[];
  onSubmit: (data: RoleFormData) => Promise<void>;
  isLoading?: boolean;
}

const RoleForm: React.FC<RoleFormProps> = ({
  initialData,
  statuses,
  onSubmit,
  isLoading = false,
}) => {
  const { handleSubmit, control, watch, setValue, reset } = useForm<RoleFormData>({
    defaultValues: {
      name: "",
      description: "",
      isAdmin: false,
      isAgent: false,
      isCustomer: false,
      isEmployee: false,
      isHR: false,
      permissions: {
        tickets: { view: false, create: false, update: false, delete: false, assign: false, priority: false },
        comments: { view: false, create: false },
        users: { view: false, create: false, update: false, delete: false },
        teams: { view: false, create: false, update: false, delete: false },
        groups: { view: false, create: false, update: false, delete: false },
        roles: { view: false, create: false, update: false, delete: false },
        departments: { view: false, create: false, update: false, delete: false },
        messages: { view: false, create: false },
        dashboard: { view: false },
        timesheets: { view: false, approve: false, report: false },
        candidates: { view: false, create: false, update: false, delete: false },
        interviews: { view: false, create: false, update: false, delete: false },
        boardStatuses: {},
      },
    },
  });

  const isAdmin = watch("isAdmin");
  const isHR = watch("isHR");
  const permissions = watch("permissions");

  const isCoreAdmin = (initialData?.name === RoleName.ADMIN);

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        isAdmin: initialData.isAdmin,
        isAgent: initialData.isAgent,
        isCustomer: initialData.isCustomer || false,
        isEmployee: initialData.isEmployee || false,
        isHR: initialData.isHR || false,
        permissions: initialData.permissions || {
          tickets: { view: false, create: false, update: false, delete: false, assign: false, priority: false },
          comments: { view: false, create: false },
          users: { view: false, create: false, update: false, delete: false },
          teams: { view: false, create: false, update: false, delete: false },
          groups: { view: false, create: false, update: false, delete: false },
          roles: { view: false, create: false, update: false, delete: false },
          departments: { view: false, create: false, update: false, delete: false },
          messages: { view: false, create: false },
          dashboard: { view: false },
          timesheets: { view: false, approve: false, report: false },
          candidates: { view: false, create: false, update: false, delete: false },
          interviews: { view: false, create: false, update: false, delete: false },
          boardStatuses: {},
        },
      });
    } else {
      reset({
        name: "",
        description: "",
        isAdmin: false,
        isAgent: false,
        isCustomer: false,
        isEmployee: false,
        isHR: false,
        permissions: {
          tickets: { view: false, create: false, update: false, delete: false, assign: false, priority: false },
          comments: { view: false, create: false },
          users: { view: false, create: false, update: false, delete: false },
          teams: { view: false, create: false, update: false, delete: false },
          groups: { view: false, create: false, update: false, delete: false },
          roles: { view: false, create: false, update: false, delete: false },
          departments: { view: false, create: false, update: false, delete: false },
          messages: { view: false, create: false },
          dashboard: { view: false },
          timesheets: { view: false, approve: false, report: false },
          candidates: { view: false, create: false, update: false, delete: false },
          interviews: { view: false, create: false, update: false, delete: false },
          boardStatuses: {},
        },
      });
    }
  }, [initialData, reset]);

  const handlePermissionChange = (module: string, action: string) => {
    if (isAdmin) return;
    const modulePerms = permissions[module] || {};
    setValue("permissions", {
      ...permissions,
      [module]: {
        ...modulePerms,
        [action]: !modulePerms[action],
      },
    });
  };

  const handleStatusPermissionChange = (statusId: string) => {
    if (isAdmin) return;
    setValue("permissions", {
      ...permissions,
      boardStatuses: {
        ...(permissions.boardStatuses || {}),
        [statusId]: !permissions.boardStatuses?.[statusId],
      },
    });
  };

  const permissionModules = [
    { id: "dashboard", label: "Dashboard", actions: ["view"] },
    { id: "tickets", label: "Tickets", actions: ["view", "create", "update", "delete", "assign", "priority"] },
    { id: "comments", label: "Comments", actions: ["view", "create"] },
    { id: "messages", label: "Messages", actions: ["view", "create"] },
    { id: "users", label: "Users", actions: ["view", "create", "update", "delete"] },
    { id: "teams", label: "Teams", actions: ["view", "create", "update", "delete"] },
    { id: "groups", label: "Projects", actions: ["view", "create", "update", "delete"] },
    { id: "departments", label: "Departments", actions: ["view", "create", "update", "delete"] },
    { id: "roles", label: "Roles", actions: ["view", "create", "update", "delete"] },
    { id: "timesheets", label: "Timesheet", actions: ["view", "approve", "report"] },
    { id: "candidates", label: "Candidates", actions: ["view", "create", "update", "delete"] },
    { id: "interviews", label: "Interviews", actions: ["view", "create", "update", "delete"] },
  ];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{
        display: "grid",
        gridTemplateColumns: "400px 1fr",
        gap: 0,
        height: "70vh",
        margin: "-24px", /* Offset modal content padding */
      }}
    >
      {/* Left Column: Basic Info & Role Type */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          overflowY: "auto",
          padding: "24px 30px 24px 24px",
          height: "100%",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <CustomInput
            name="name"
            control={control}
            rules={{ required: "Role name is required" }}
            label="Role Name"
            placeholder="e.g. Support Manager"
            disabled={isCoreAdmin}
          />
          <CustomTextArea
            name="description"
            control={control}
            label="Description"
            placeholder="Briefly describe the role's purpose"
            rows={3}
            disabled={isCoreAdmin}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {[
            { id: "isAdmin", label: "Administrator", icon: "ShieldAlert", color: "#f44336", activeBg: "rgba(244, 67, 54, 0.05)" },
            { id: "isAgent", label: "Agent", icon: "ShieldCheck", color: "#2196f3", activeBg: "rgba(33, 150, 243, 0.05)" },
            { id: "isCustomer", label: "Customer", icon: "User", color: "#4caf50", activeBg: "rgba(76, 175, 80, 0.05)" },
            { id: "isEmployee", label: "Employee", icon: "Briefcase", color: "#ff9800", activeBg: "rgba(255, 152, 0, 0.05)" },
          ].map((type) => {
            const isActive = watch(type.id as any);
            return (
              <div
                key={type.id}
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  cursor: isCoreAdmin ? "not-allowed" : "pointer",
                  border: isActive ? `1px solid ${type.color}` : "1px solid var(--border-glass)",
                  background: isActive ? type.activeBg : "rgba(255,255,255,0.02)",
                  opacity: isCoreAdmin ? 0.7 : 1,
                  transition: "all 0.2s ease",
                }}
                onClick={() => !isCoreAdmin && setValue(type.id as any, !isActive)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CustomIcon name={type.icon as any} size={18} color={isActive ? type.color : "var(--text-muted)"} />
                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>{type.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="glass-card"
          style={{
            padding: "10px 12px",
            cursor: isCoreAdmin ? "not-allowed" : "pointer",
            border: isHR ? "1px solid #9c27b0" : "1px solid var(--border-glass)",
            background: isHR ? "rgba(156, 39, 176, 0.05)" : "rgba(255,255,255,0.02)",
            opacity: isCoreAdmin ? 0.7 : 1,
            transition: "all 0.2s ease",
          }}
          onClick={() => !isCoreAdmin && setValue("isHR", !isHR)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CustomIcon name="UserCheck" size={18} color={isHR ? "#9c27b0" : "var(--text-muted)"} />
            <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>HR</div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginLeft: "auto" }}>Candidates & Interviews</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ borderBottom: "1px solid var(--border-glass)", paddingBottom: 8 }}>
            <label style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>Board Transitions</label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, opacity: isAdmin ? 0.6 : 1 }}>
            {statuses.map((status) => (
              <div
                key={status.id}
                className="glass-card"
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  border: permissions.boardStatuses?.[status.id] ? `1px solid ${status.color}50` : "1px solid var(--border-glass)",
                  background: permissions.boardStatuses?.[status.id] ? `${status.color}08` : "rgba(255,255,255,0.01)",
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
                <span style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: permissions.boardStatuses?.[status.id] ? "var(--text-primary)" : "var(--text-muted)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                }}>
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
          loading={isLoading}
          disabled={isCoreAdmin}
          style={{ marginTop: "auto" }}
          title={isCoreAdmin ? "The system Admin role cannot be modified" : ""}
        >
          {initialData ? "Update Role" : "Create Role"}
        </CustomButton>
      </div>

      {/* Right Column: Permissions Matrix */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 20,
          borderLeft: "1px solid var(--border-glass)",
          padding: "24px 24px 24px 30px",
          overflowY: "auto",
          height: "100%",
        }}
      >
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: "1px solid var(--border-glass)", paddingBottom: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CustomIcon name="Shield" size={20} color="var(--accent-primary)" />
            <label style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>Permissions Matrix</label>
          </div>
          {isAdmin && (
            <span style={{ fontSize: "0.75rem", color: "var(--accent-danger)", fontWeight: 700, letterSpacing: "0.5px" }}>
              ADMIN OVERRIDE ACTIVE
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, opacity: isAdmin ? 0.6 : 1 }}>
          {permissionModules.map((module) => (
            <div key={module.id} className="glass-card" style={{ padding: "16px 20px", background: "rgba(255,255,255,0.01)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>{module.label}</span>
                <div style={{ display: "flex", gap: 20 }}>
                  {module.actions.map((action) => (
                    <label key={action} style={{ display: "flex", alignItems: "center", gap: 8, cursor: isAdmin ? "not-allowed" : "pointer", fontSize: "0.85rem" }}>
                      <input
                        type="checkbox"
                        checked={permissions[module.id]?.[action] || false}
                        onChange={() => handlePermissionChange(module.id, action)}
                        disabled={isAdmin}
                        style={{ width: 18, height: 18, accentColor: "var(--accent-primary)", cursor: isAdmin ? "not-allowed" : "pointer" }}
                      />
                      <span style={{
                        textTransform: "capitalize", fontWeight: 500,
                        color: permissions[module.id]?.[action] ? "var(--text-primary)" : "var(--text-muted)"
                      }}>
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
  );
};

export default RoleForm;
