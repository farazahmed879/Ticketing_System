import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import { RoleName } from "../../../utils/constants";
import type { RoleFormData } from "../../../types";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_MODULES,
  ROLE_TYPES,
  ADMIN_PERMISSIONS,
  AGENT_PERMISSIONS,
  EMPLOYEE_PERMISSIONS,
  CUSTOMER_PERMISSIONS,
  HR_PERMISSIONS,
  QA_PERMISSIONS,
} from "../roleConstants";
import type { RoleFormProps } from "../types";

const RoleForm = forwardRef<any, RoleFormProps>(
  ({ initialData, statuses, onSubmit }, ref) => {
    const [formData, setFormData] = useState<RoleFormData>({
      name: "",
      description: "",
      isAdmin: false,
      isAgent: false,
      isCustomer: false,
      isEmployee: false,
      isHR: false,
      permissions: DEFAULT_PERMISSIONS,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const isCoreAdmin = initialData?.name === RoleName.ADMIN;

    const resetToInitial = () => {
      if (initialData) {
        setFormData({
          name: initialData.name,
          description: initialData.description || "",
          isAdmin: initialData.isAdmin,
          isAgent: initialData.isAgent,
          isCustomer: initialData.isCustomer || false,
          isEmployee: initialData.isEmployee || false,
          isHR: initialData.isHR || false,
          permissions: initialData.permissions || DEFAULT_PERMISSIONS,
        });
      } else {
        setFormData({
          name: "",
          description: "",
          isAdmin: false,
          isAgent: false,
          isCustomer: false,
          isEmployee: false,
          isHR: false,
          permissions: DEFAULT_PERMISSIONS,
        });
      }
      setErrors({});
    };

    useImperativeHandle(ref, () => ({
      reset: resetToInitial,
    }));

    useEffect(() => {
      resetToInitial();
    }, [initialData]);

    const handleInputChange = (field: keyof RoleFormData, value: any) => {
      if (isCoreAdmin && (field === "name" || field === "description")) return;
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error when user types
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    };

    const handlePermissionChange = (module: string, action: string) => {
      if (formData.isAdmin) return;
      const modulePerms = formData.permissions[module] || {};
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          [module]: {
            ...modulePerms,
            [action]: !modulePerms[action],
          },
        },
      }));
    };

    const handleRoleTypeChange = (selectedId: string) => {
      // Radio button logic: first set all role types to false
      const updatedData: any = {
        isAdmin: false,
        isAgent: false,
        isCustomer: false,
        isEmployee: false,
        isHR: false,
        isQA: false,
        permissions: DEFAULT_PERMISSIONS,
      };

      // Always set the selected one to true (cannot deselect)
      (updatedData as any)[selectedId] = true;

      // Apply default permissions based on role type
      switch (selectedId) {
        case "isAdmin":
          updatedData.permissions = ADMIN_PERMISSIONS;
          break;
        case "isAgent":
          updatedData.permissions = AGENT_PERMISSIONS;
          break;
        case "isEmployee":
          updatedData.permissions = EMPLOYEE_PERMISSIONS;
          break;
        case "isCustomer":
          updatedData.permissions = CUSTOMER_PERMISSIONS;
          break;
        case "isHR":
          updatedData.permissions = HR_PERMISSIONS;
          break;
        case "isQA":
          updatedData.permissions = QA_PERMISSIONS;
          break;
        default:
          updatedData.permissions = DEFAULT_PERMISSIONS;
      }

      setFormData((prev) => ({ ...prev, ...updatedData }));
    };

    const handleStatusPermissionChange = (statusId: string) => {
      if (formData.isAdmin) return;
      setFormData((prev) => ({
        ...prev,
        permissions: {
          ...prev.permissions,
          boardStatuses: {
            ...(prev.permissions.boardStatuses || {}),
            [statusId]: !prev.permissions.boardStatuses?.[statusId],
          },
        },
      }));
    };

    const validate = () => {
      const newErrors: Record<string, string> = {};
      if (!formData.name || !formData.name.trim())
        newErrors.name = "Role name is required";
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const onLocalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (validate()) {
        onSubmit(formData);
      }
    };

    return (
      <form
        id="role-form"
        onSubmit={onLocalSubmit}
        style={{
          display: "grid",
          gridTemplateColumns: "400px 1fr",
          gap: 0,
          height: "70vh",
          margin: "-24px" /* Offset modal content padding */,
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
              value={formData.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleInputChange("name", e.target.value)
              }
              error={errors.name}
              label="Role Name"
              placeholder="e.g. Support Manager"
              disabled={isCoreAdmin}
            />
            <CustomTextArea
              name="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                handleInputChange("description", e.target.value)
              }
              label="Description"
              placeholder="Briefly describe the role's purpose"
              rows={3}
              disabled={isCoreAdmin}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
            }}
          >
            {ROLE_TYPES.map((type) => {
              const isActive = (formData as any)[type.id];
              return (
                <div
                  key={type.id}
                  className="glass-card"
                  style={{
                    padding: "10px 12px",
                    cursor: isCoreAdmin ? "not-allowed" : "pointer",
                    border: isActive
                      ? `1px solid ${type.color}`
                      : "1px solid var(--border-glass)",
                    background: isActive
                      ? type.activeBg
                      : "rgba(255,255,255,0.02)",
                    opacity: isCoreAdmin ? 0.7 : 1,
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => handleRoleTypeChange(type.id)}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <CustomIcon
                      name={type.icon as any}
                      size={18}
                      color={isActive ? type.color : "var(--text-muted)"}
                    />
                    <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                      {type.label}
                    </div>
                    {/* {type.subLabel && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        marginLeft: "auto",
                      }}
                    >
                      {type.subLabel}
                    </span>
                  )} */}
                  </div>
                </div>
              );
            })}
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
                opacity: formData.isAdmin ? 0.6 : 1,
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
                    border: formData.permissions.boardStatuses?.[status.id]
                      ? `1px solid ${status.color}50`
                      : "1px solid var(--border-glass)",
                    background: formData.permissions.boardStatuses?.[status.id]
                      ? `${status.color}08`
                      : "rgba(255,255,255,0.01)",
                    cursor: formData.isAdmin ? "not-allowed" : "pointer",
                  }}
                  onClick={() => handleStatusPermissionChange(status.id)}
                >
                  <input
                    type="checkbox"
                    checked={
                      formData.permissions.boardStatuses?.[status.id] || false
                    }
                    onChange={() => {}}
                    disabled={formData.isAdmin}
                    style={{ accentColor: status.color }}
                  />
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: formData.permissions.boardStatuses?.[status.id]
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
              <CustomIcon
                name="Shield"
                size={20}
                color="var(--accent-primary)"
              />
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
            {formData.isAdmin && (
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
              opacity: formData.isAdmin ? 0.6 : 1,
            }}
          >
            {PERMISSION_MODULES.map((module) => (
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
                          cursor: formData.isAdmin ? "not-allowed" : "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={
                            formData.permissions[module.id]?.[action] || false
                          }
                          onChange={() =>
                            handlePermissionChange(module.id, action)
                          }
                          disabled={formData.isAdmin}
                          style={{
                            width: 18,
                            height: 18,
                            accentColor: "var(--accent-primary)",
                            cursor: formData.isAdmin
                              ? "not-allowed"
                              : "pointer",
                          }}
                        />
                        <span
                          style={{
                            textTransform: "capitalize",
                            fontWeight: 500,
                            color: formData.permissions[module.id]?.[action]
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
    );
  },
);

export default RoleForm;
