import React from "react";
import styles from "../TicketDetail.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../../types";

interface TicketDetailDescriptionProps {
  ticket: ITicketDetail;
  canEditContent: boolean;
  issueDraft: string;
  setIssueDraft: (val: string) => void;
}

const TicketDetailDescription: React.FC<TicketDetailDescriptionProps> = ({
  ticket,
  canEditContent,
  issueDraft,
  setIssueDraft,
}) => {
  return (
    <>
      {canEditContent ? (
        <textarea
          value={issueDraft}
          onChange={(e) => setIssueDraft(e.target.value)}
          className={styles.issueInput}
        />
      ) : (
        <div className={styles.issue}>{ticket.issue}</div>
      )}
    </>
  );
};

export default TicketDetailDescription;
