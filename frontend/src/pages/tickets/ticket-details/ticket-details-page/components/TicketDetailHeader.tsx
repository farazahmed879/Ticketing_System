import React from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomButton from "../../../../../components/CustomButton";
import CustomDropdownMenu from "../../../../../components/CustomDropdownMenu";
import { useNotification } from "../../../../../context/NotificationContext";
import { copyToClipboard } from "../../../../../utils/helpers";
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
        <div className={styles.headerMain}>
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
              style={{ marginBottom: 0 }}
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
              className={styles.returnedBadge}
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
              onClick: async () => {
                const ok = await copyToClipboard(String(ticket.uid));
                showNotification(
                  ok ? "success" : "error",
                  ok
                    ? "Ticket ID copied to clipboard"
                    : "Failed to copy ticket ID",
                );
              },
            },
            {
              label: "Copy Ticket URL",
              icon: "Link",
              onClick: async () => {
                const ok = await copyToClipboard(window.location.href);
                showNotification(
                  ok ? "success" : "error",
                  ok
                    ? "Ticket URL copied to clipboard"
                    : "Failed to copy ticket URL",
                );
              },
            },
          ]}
        />
      </div>
    </>
  );
};

export default TicketDetailHeader;
