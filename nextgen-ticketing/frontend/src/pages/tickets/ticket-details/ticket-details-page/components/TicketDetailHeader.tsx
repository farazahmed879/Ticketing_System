import React from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomButton from "../../../../../components/CustomButton";
import CustomDropdownMenu from "../../../../../components/CustomDropdownMenu";
import { useNotification } from "../../../../../context/NotificationContext";
import styles from "../TicketDetail.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../../types";

interface TicketDetailHeaderProps {
  ticket: ITicketDetail;
  canEditContent: boolean;
  subjectDraft: string;
  setSubjectDraft: (val: string) => void;
}

const TicketDetailHeader: React.FC<TicketDetailHeaderProps> = ({
  ticket,
  canEditContent,
  subjectDraft,
  setSubjectDraft,
}) => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  return (
    <>
      <div className={styles.ticketHeader}>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <CustomButton
            variant="ghost"
            onClick={() => navigate(-1)}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{
              width: 40,
              height: 40,
              padding: 0,
              flexShrink: 0,
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-glass)",
            }}
          />
          {canEditContent ? (
            <input
              type="text"
              value={subjectDraft}
              onChange={(e) => setSubjectDraft(e.target.value)}
              className={styles.titleInput}
              style={{ marginBottom: 0, flex: 1, minWidth: 200 }}
            />
          ) : (
            <h1 className={styles.title} style={{ marginBottom: 0 }}>
              {ticket.subject}
            </h1>
          )}
          <span className={styles.uid} style={{ marginBottom: 0 }}>
            Ticket #{ticket.uid}
          </span>
          {ticket.wasFailed && (
            <span
              title="This ticket was marked as Failed/Returned at some point"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--accent-danger)",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
              }}
            >
              <CustomIcon name="Flag" size={12} />
              Returned
            </span>
          )}
        </div>
        <CustomDropdownMenu
          items={[
            {
              label: "Copy Ticket ID",
              icon: "Hash",
              onClick: () => {
                navigator.clipboard.writeText(String(ticket.uid));
                showNotification("success", "Ticket ID copied to clipboard");
              },
            },
            {
              label: "Copy Ticket URL",
              icon: "Link",
              onClick: () => {
                navigator.clipboard.writeText(window.location.href);
                showNotification("success", "Ticket URL copied to clipboard");
              },
            },
          ]}
        />
      </div>
    </>
  );
};

export default TicketDetailHeader;
