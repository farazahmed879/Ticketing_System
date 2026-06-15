import React from "react";
import { format } from "date-fns";
import CustomIcon from "../../../../../components/CustomIcon";
import type { TicketDetail } from "../../../../../types";

interface ModalTimestampsProps {
  displayTicket: TicketDetail | any;
}

const ModalTimestamps: React.FC<ModalTimestampsProps> = ({ displayTicket }) => {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        marginTop: -16,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <CustomIcon name="Calendar" size={13} />
        Created {format(new Date(displayTicket.createdAt), "MMM dd, yyyy")}
      </span>
      {displayTicket.updatedAt && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CustomIcon name="RefreshCw" size={13} />
          Updated {format(new Date(displayTicket.updatedAt), "MMM dd, yyyy")}
        </span>
      )}
    </div>
  );
};

export default ModalTimestamps;
