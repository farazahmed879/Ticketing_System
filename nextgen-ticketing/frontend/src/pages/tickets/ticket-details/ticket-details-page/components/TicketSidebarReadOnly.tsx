import CustomIcon from "../../../../../components/CustomIcon";
import styles from "../TicketDetail.module.css";
import tableStyles from "../../../../dashboard/Dashboard.module.css";
import { StatusName } from "../../../../../utils/constants";
import type { TicketDetailSidebarProps } from "../../../../../types";
import { ROLE_TYPE } from "../../../../roles/roleConstants";

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

const DetailRow = ({ icon, text }: { icon: string; text: string }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: "0.85rem",
      color: "var(--text-secondary)",
    }}
  >
    <CustomIcon name={icon} size={16} />
    <span>{text}</span>
  </div>
);

/**
 * Read-only sidebar shown to clients — same information as the staff sidebar
 * but presented as a static detail view (no status/assignee/priority/date
 * editors). Clients act on a ticket only via the Satisfied/Unsatisfied/Cancel
 * banner, never the sidebar.
 */
export const TicketSidebarReadOnly = ({
  ticket,
  user,
}: Pick<TicketDetailSidebarProps, "ticket" | "user">) => {
  // Clients see an "Approved" ticket presented as "Resolved" (matches the rest
  // of the client-facing UX, e.g. the board and the review banner).
  const isClient = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  const statusName =
    isClient && ticket.status?.name === StatusName.APPROVED
      ? StatusName.RESOLVED
      : isClient && ticket.status?.name === StatusName.RESOLVED
        ? StatusName.IN_PROCESS
        : ticket.status?.name;

  return (
    <>
      {/* Status / Priority / Owner / Assignee on one line (wraps as needed). */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px 20px",
          alignItems: "flex-start",
        }}
      >
        <div className={styles.sidebarItem} style={{ flex: "1 1 110px" }}>
          <span className={styles.sidebarLabel}>Status</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: ticket.status?.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "0.9rem" }}>{statusName}</span>
          </div>
        </div>

        <div className={styles.sidebarItem} style={{ flex: "1 1 110px" }}>
          <span className={styles.sidebarLabel}>Priority</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: ticket.priority?.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "0.9rem" }}>{ticket.priority?.name}</span>
          </div>
        </div>

        <div className={styles.sidebarItem} style={{ flex: "1 1 110px" }}>
          <span className={styles.sidebarLabel}>Owner</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              className={tableStyles.avatar}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CustomIcon name="User" size={14} />
            </div>
            <span
              style={{
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ticket.owner.fullname}
            </span>
          </div>
        </div>

        <div className={styles.sidebarItem} style={{ flex: "1 1 110px" }}>
          <span className={styles.sidebarLabel}>Assignee</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              className={tableStyles.avatar}
              style={{
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CustomIcon name="UserPlus" size={14} />
            </div>
            <span
              style={{
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {ticket.assignee?.fullname || "Unassigned"}
            </span>
          </div>
        </div>
      </div>

      {ticket.tags && ticket.tags.length > 0 && (
        <div className={styles.sidebarItem}>
          <span className={styles.sidebarLabel}>Labels</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ticket.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "2px 10px",
                  borderRadius: 999,
                  color: "var(--accent-secondary)",
                  background: "rgba(6, 182, 212, 0.12)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

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
          <DetailRow
            icon="Tag"
            text={`Type: ${ticket.type?.name || "Issue"}`}
          />
          <DetailRow
            icon="Layers"
            text={`Project: ${ticket.project?.name || "None"}`}
          />
          <DetailRow
            icon="Calendar"
            text={`Due Date: ${fmtDate(ticket.dueDate)}`}
          />
          <DetailRow
            icon="Clock"
            text={`Created: ${fmtDate(ticket.createdAt)}`}
          />
          <DetailRow
            icon="Clock"
            text={`Updated: ${fmtDate(ticket.updatedAt)}`}
          />
        </div>
      </div>
    </>
  );
};
