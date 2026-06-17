import CustomIcon from "../../../../../components/CustomIcon";
import styles from "../TicketDetail.module.css";
import type { TicketDetailSidebarProps } from "../../../../../types";

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

const Row = ({
  icon,
  dot,
  text,
}: {
  icon?: string;
  dot?: string;
  text: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: "0.85rem",
      color: "var(--text-secondary)",
    }}
  >
    {dot ? (
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: dot,
          flexShrink: 0,
        }}
      />
    ) : (
      <CustomIcon name={icon || "Tag"} size={16} />
    )}
    <span>{text}</span>
  </div>
);

/**
 * The "Details" block. Beyond the static meta (type/project/created/updated)
 * it also renders any attribute the current user can NOT edit (owner, and
 * status / priority / assignee / QA / labels when not editable) as a plain
 * one-line row instead of a box. The due date is an editor when editable,
 * otherwise a one-line row.
 */
export const TicketSidebarDetails = ({
  ticket,
  statusEditable,
  priorityEditable,
  assigneeEditable,
  qaEditable,
  labelsEditable,
  dueDateEditable,
}: Pick<TicketDetailSidebarProps, "ticket" | "user"> & {
  statusEditable: boolean;
  priorityEditable: boolean;
  assigneeEditable: boolean;
  qaEditable: boolean;
  labelsEditable: boolean;
  dueDateEditable: boolean;
}) => {
  return (
    <div className={styles.sidebarItem}>
      <span className={styles.sidebarLabel}>Details</span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 4,
        }}
      >
        {/* Non-editable attributes shown as one-line rows. */}
        {!statusEditable && (
          <Row dot={ticket.status?.color} text={`Status: ${ticket.status?.name}`} />
        )}
        {!priorityEditable && (
          <Row
            dot={ticket.priority?.color}
            text={`Priority: ${ticket.priority?.name}`}
          />
        )}
        <Row icon="User" text={`Owner: ${ticket.owner.fullname}`} />
        {!assigneeEditable && (
          <Row
            icon="UserPlus"
            text={`Assignee: ${ticket.assignee?.fullname || "Unassigned"}`}
          />
        )}
        {!qaEditable && (
          <Row
            icon="UserCheck"
            text={`QA: ${ticket.qa?.fullname || "Unassigned"}`}
          />
        )}
        {!labelsEditable && (
          <Row icon="Tag" text={`Labels: ${ticket.tags?.join(", ") || "None"}`} />
        )}

        <Row icon="Tag" text={`Type: ${ticket.type?.name || "Issue"}`} />
        <Row icon="Layers" text={`Project: ${ticket.project?.name || "None"}`} />

        {/* Editable due date is shown as its own editor outside this section. */}
        {!dueDateEditable && (
          <Row icon="Calendar" text={`Due Date: ${fmtDate(ticket.dueDate)}`} />
        )}

        <Row icon="Clock" text={`Created: ${fmtDate(ticket.createdAt)}`} />
        <Row icon="Clock" text={`Updated: ${fmtDate(ticket.updatedAt)}`} />
      </div>
    </div>
  );
};
