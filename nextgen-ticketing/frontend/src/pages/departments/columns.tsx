import type { TableColumn } from "../../components/types";
import type { Department } from "../../types";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomTooltip from "../../components/CustomTooltip";
import { truncateString } from "../../utils/helpers";
import type { NavigateFunction } from "react-router-dom";
import styles from "./columns.module.css";

export const getDepartmentColumns = (
  navigate: NavigateFunction,
  handleEdit: (dept: Department) => void,
  handleDelete: (id: string) => void,
): TableColumn<Department>[] => [
  {
    header: "Department",
    key: "name",
    render: (d) => (
      <div className="flex-row-12">
        <div className={`glass-card icon-box ${styles.iconBox}`}>
          <CustomIcon
            name="Building2"
            size={18}
            color="var(--accent-primary)"
          />
        </div>
        <div
          className={styles.deptName}
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/departments/${d.id}`);
          }}
        >
          <div className={styles.deptTitle}>{d.name}</div>
          <div className="text-xs-muted">
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
      <div className="flex-wrap-4">
        {d.teams?.length ? (
          d.teams.map((t) => (
            <span key={t.id} className="chip">
              {t.name}
            </span>
          ))
        ) : (
          <span className="text-xs-muted">No teams</span>
        )}
      </div>
    ),
  },
  {
    header: "Projects",
    key: "projects",
    render: (d) => (
      <span className="text-base-sm">
        {d.projects?.length || 0} Projects
      </span>
    ),
  },
  {
    header: "Actions",
    key: "actions",
    render: (d) => (
      <div className={styles.actions}>
        <CustomTooltip text="Edit">
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(d)}
            icon={<CustomIcon name="Edit2" size={16} />}
          />
        </CustomTooltip>
        <CustomTooltip text="Delete">
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(d.id)}
            icon={<CustomIcon name="Trash2" size={16} />}
            style={{ color: "var(--accent-danger)" }}
          />
        </CustomTooltip>
      </div>
    ),
  },
];
