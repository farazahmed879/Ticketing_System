import React from "react";
import { formatDistanceToNow } from "date-fns";
import styles from "../TicketDetail.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../types";

interface TicketDetailHistoryProps {
  ticket: ITicketDetail;
}

const TicketDetailHistory: React.FC<TicketDetailHistoryProps> = ({
  ticket,
}) => {
  return (
    <div className={styles.historyList}>
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
              {formatDistanceToNow(new Date(item.createdAt), {
                addSuffix: true,
              })}{" "}
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
