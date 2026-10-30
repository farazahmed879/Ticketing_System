import React from "react";
import styles from "../TicketDetail.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../../types";
import {
  TaskDescriptionEditor,
  FormattedTaskDescription,
} from "../../../../timesheet/components/TaskDescriptionEditor";

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
        <TaskDescriptionEditor
          value={issueDraft}
          onChange={setIssueDraft}
          label="Description"
          placeholder="Describe the issue in detail..."
        />
      ) : (
        <FormattedTaskDescription
          content={ticket.issue}
          className={styles.issue}
        />
      )}
    </>
  );
};

export default TicketDetailDescription;
