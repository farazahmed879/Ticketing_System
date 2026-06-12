import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import TicketForm from "./TicketForm";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { RoleName } from "../../../utils/constants";
import type { User, TicketFormData } from "../../../types";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  priorities: any[];
  projects: any[];
  types: any[];
  agents: any[];
  user: User | null;
  onSubmit: (data: TicketFormData) => Promise<void>;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  priorities,
  projects,
  types,
  agents,
  user,
  onSubmit,
}) => {
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Reset dirty/confirm state every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen]);

  const handleCloseAttempt = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardConfirm = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCloseAttempt}
        title="Create New Ticket"
        maxWidth="800px"
        footer={
          <>
            <CustomButton variant="secondary" onClick={handleCloseAttempt}>
              Cancel
            </CustomButton>
            <CustomButton type="submit" form="ticket-form" variant="gradient">
              Create Ticket
            </CustomButton>
          </>
        }
      >
        <TicketForm
          priorities={priorities}
          projects={projects}
          types={types}
          agents={agents}
          onSubmit={onSubmit}
          showAssignee={
            user?.role?.name === RoleName.ADMIN ||
            user?.role?.name === RoleName.AGENT
          }
          onDirtyChange={setIsDirty}
        />
      </Modal>

      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleDiscardConfirm}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to discard them?"
        confirmText="Discard"
        cancelText="Keep Editing"
        type="warning"
      />
    </>
  );
};

export default CreateTicketModal;
