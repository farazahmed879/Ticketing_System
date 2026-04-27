import React from "react";
import Modal from "../../../components/Modal";
import RoleForm from "./RoleForm";
import type { Role, RoleFormData } from "../../../types";

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  statuses: any[];
  onSubmit: (data: RoleFormData) => Promise<void>;
}

const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  role,
  statuses,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1150px"
      title={role ? "Edit Role & Permissions" : "Create New Role"}
    >
      <RoleForm initialData={role} statuses={statuses} onSubmit={onSubmit} />
    </Modal>
  );
};

export default RoleModal;
