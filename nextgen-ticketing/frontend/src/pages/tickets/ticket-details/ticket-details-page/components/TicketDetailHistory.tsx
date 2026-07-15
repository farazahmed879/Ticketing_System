import React from "react";
import { timeAgo } from "../../../../../utils/helpers";
import styles from "../TicketDetail.module.css";
import cs from "../../../shared/commentThread.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../../types";

interface TicketDetailHistoryProps {
  ticket: ITicketDetail;
  /** Matches the comment area's height so History scrolls to the same size. */
  feedHeight?: number;
}

const TicketDetailHistory: React.FC<TicketDetailHistoryProps> = ({
  ticket,
  feedHeight,
}) => {
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
      {ticket.history.map((item) => (
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
