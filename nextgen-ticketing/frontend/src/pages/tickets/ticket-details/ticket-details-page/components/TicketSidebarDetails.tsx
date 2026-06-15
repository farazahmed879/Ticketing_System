import CustomIcon from "../../../../../components/CustomIcon";
import CustomDatePicker from "../../../../../components/CustomDatePicker";
import styles from "../TicketDetail.module.css";
import { RoleName } from "../../../../../utils/constants";
import { canEmployeeEditDueDate } from "../../../shared/ticketDecisions";
import type { TicketDetailSidebarProps } from "../../../../../types";

export const TicketSidebarDetails = ({
  ticket,
  user,
  sidebarDraft,
  onSidebarDraftChange,
}: Pick<TicketDetailSidebarProps, "ticket" | "user" | "sidebarDraft" | "onSidebarDraftChange">) => {
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <CustomIcon name="Tag" size={16} />
          <span>Type: {ticket.type?.name || "Issue"}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <CustomIcon name="Layers" size={16} />
          <span>Project: {ticket.project?.name || "None"}</span>
        </div>
        {user?.role?.name === RoleName.CUSTOMER ||
        user?.role?.name === RoleName.QA ||
        (user?.role?.name === RoleName.EMPLOYEE &&
          !canEmployeeEditDueDate(ticket.status?.name)) ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
            }}
          >
            <CustomIcon name="Calendar" size={16} />
            <span>
              Due Date:{" "}
              {ticket.dueDate
                ? new Date(ticket.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Not set"}
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <CustomDatePicker
              label={
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CustomIcon name="Calendar" size={16} />
                  <span>Due Date</span>
                </div>
              }
              value={sidebarDraft.dueDate}
              onChange={(val: string) => onSidebarDraftChange("dueDate", val)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <CustomIcon name="Clock" size={16} />
          <span>
            Created:{" "}
            {new Date(ticket.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
          }}
        >
          <CustomIcon name="Clock" size={16} />
          <span>
            Updated:{" "}
            {new Date(ticket.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};
