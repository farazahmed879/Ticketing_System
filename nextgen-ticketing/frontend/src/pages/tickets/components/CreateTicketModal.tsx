import React from "react";
import Modal from "../../../components/Modal";
import TicketForm from "./TicketForm";
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Ticket">
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
      />
    </Modal>
  );
};

export default CreateTicketModal;
