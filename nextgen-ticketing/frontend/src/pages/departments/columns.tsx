import type { TableColumn } from "../../components/types";
import type { Department } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import { truncateString } from "../../utils/helpers";
import type { NavigateFunction } from "react-router-dom";

export const getDepartmentColumns = (
  navigate: NavigateFunction,
  handleEdit: (dept: Department) => void,
  handleDelete: (id: string) => void,
): TableColumn<Department>[] => [
  {
    header: "Department",
    key: "name",
    render: (d) => (
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
            background: "rgba(124, 58, 237, 0.1)",
          }}
        >
          <CustomIcon
            name="Building2"
            size={18}
            color="var(--accent-primary)"
          />
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/departments/${d.id}`);
          }}
          style={{ cursor: "pointer" }}
        >
          <div
            style={{
              fontWeight: 600,
              color: "var(--accent-primary)",
            }}
          >
            {d.name}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {d.description
              ? truncateString(d.description, 60)
              : "No description"}
          </div>
        </div>
      </div>
    ),
  },
  {
    header: "Teams",
    key: "teams",
    render: (d) => (
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {d.teams?.length ? (
          d.teams.map((t) => (
            <span
              key={t.id}
              style={{
                fontSize: "0.75rem",
                background: "rgba(255,255,255,0.05)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              {t.name}
            </span>
          ))
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            No teams
          </span>
        )}
      </div>
    ),
  },
  {
    header: "Projects",
    key: "projects",
    render: (d) => (
      <span style={{ fontSize: "0.9rem" }}>
        {d.projects?.length || 0} Projects
      </span>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (d) => (
      <div style={{ display: "flex", gap: 8 }}>
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(d)}
          icon={<CustomIcon name="Edit2" size={16} />}
        />
        <CustomButton
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(d.id)}
          icon={<CustomIcon name="Trash2" size={16} />}
          style={{ color: "var(--accent-danger)" }}
        />
      </div>
    ),
  },
];
