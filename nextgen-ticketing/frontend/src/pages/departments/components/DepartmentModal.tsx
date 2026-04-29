import React from "react";
import Modal from "../../../components/Modal";
import DepartmentForm from "./DepartmentForm";
import type { Department } from "../../../types";

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  department?: Department | null;
}

const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  department,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? "Edit Department" : "Add New Department"}
    >
      <DepartmentForm
        initialData={department}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default DepartmentModal;
