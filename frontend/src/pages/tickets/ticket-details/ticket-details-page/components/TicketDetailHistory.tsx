import React from "react";
import { timeAgo } from "../../../../../utils/helpers";
import styles from "../TicketDetail.module.css";
import cs from "../../../shared/commentThread.module.css";
import type { TicketDetail as ITicketDetail, User } from "../../../../../types";
import { ROLE_TYPE } from "../../../../roles/roleConstants";

interface TicketDetailHistoryProps {
  ticket: ITicketDetail;
  user?: User | null;
  /** Matches the comment area's height so History scrolls to the same size. */
  feedHeight?: number;
}

const TicketDetailHistory: React.FC<TicketDetailHistoryProps> = ({
  ticket,
  user,
  feedHeight,
}) => {
  const isClient = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  const historyList = (ticket.history || []).filter((item: any) => {
    if (isClient) {
      if (item.action === "NOTE_ADDED") return false;
      if (item.description?.toLowerCase().includes("note")) return false;
    }
    return true;
  });

  return (
    <div
      className={`${styles.historyList} ${cs.scroll}`}
      style={{
        height: feedHeight,
        maxHeight: feedHeight ? undefined : "calc(100vh - 200px)",
        overflowY: "auto",
        paddingRight: 8,
      }}
    >
      {historyList.map((item) => (
        <div key={item.id} className={styles.historyItem}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {item.action}
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
              }}
            >
              {item.description}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              By {item.actor.fullname} •{" "}
              {timeAgo(item.createdAt)}{" "}
              •{" "}
              {new Date(item.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TicketDetailHistory;
