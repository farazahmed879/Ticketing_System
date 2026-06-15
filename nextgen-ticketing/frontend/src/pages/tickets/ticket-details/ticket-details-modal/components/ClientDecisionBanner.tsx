import React from "react";
import CustomButton from "../../../../../components/CustomButton";
import CustomIcon from "../../../../../components/CustomIcon";
import { StatusName } from "../../../../../utils/constants";
import type { TicketDetail } from "../../../../../types";

interface ClientDecisionBannerProps {
  isClient: boolean;
  isTicketOwner: boolean;
  displayTicket: TicketDetail | any;
  isSaving: boolean;
  handleClientDecision: (
    decision: "satisfied" | "unsatisfied" | "cancel",
  ) => void;
}

const ClientDecisionBanner: React.FC<ClientDecisionBannerProps> = ({
  isClient,
  isTicketOwner,
  displayTicket,
  isSaving,
  handleClientDecision,
}) => {
  if (!isClient || !isTicketOwner) return null;

  const statusName = displayTicket?.status?.name;

  if (statusName === StatusName.NEW) {
    return (
      <div
        className="glass-card"
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderLeft: "4px solid var(--accent-danger)",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
            Cancel Ticket
          </h3>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Your ticket is currently unassigned. You can cancel it if it's no
            longer needed.
          </p>
        </div>
        <CustomButton
          variant="outline"
          onClick={() => handleClientDecision("cancel")}
          icon={<CustomIcon name="Trash2" size={16} />}
          style={{
            borderColor: "var(--accent-danger)",
            color: "var(--accent-danger)",
          }}
          loading={isSaving}
        >
          Cancel Ticket
        </CustomButton>
      </div>
    );
  }

  if (statusName === StatusName.APPROVED) {
    const daysLeft = (() => {
      const updatedAt = displayTicket.updatedAt;
      if (!updatedAt) return 20;
      const diffTime = Math.abs(
        new Date().getTime() - new Date(updatedAt).getTime(),
      );
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      return Math.max(0, Math.ceil(20 - diffDays));
    })();

    return (
      <div
        className="glass-card"
        style={{
          padding: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderLeft: "4px solid var(--accent-success)",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
            Review Required
          </h3>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
            }}
          >
            Your ticket has been marked as Resolved. Please let us know if you
            are satisfied with the resolution.
          </p>
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CustomIcon name="Clock" size={14} />
            <span>
              The ticket will automatically closed in 20 days if no response. (
              {daysLeft} days remaining)
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <CustomButton
            variant="outline"
            onClick={() => handleClientDecision("unsatisfied")}
            icon={<CustomIcon name="XCircle" size={16} />}
            style={{
              borderColor: "var(--accent-danger)",
              color: "var(--accent-danger)",
            }}
            loading={isSaving}
          >
            Unsatisfied
          </CustomButton>
          <CustomButton
            variant="primary"
            onClick={() => handleClientDecision("satisfied")}
            icon={<CustomIcon name="CheckCircle2" size={16} />}
            style={{ background: "var(--accent-success)" }}
            loading={isSaving}
          >
            Satisfied
          </CustomButton>
        </div>
      </div>
    );
  }

  return null;
};

export default ClientDecisionBanner;
