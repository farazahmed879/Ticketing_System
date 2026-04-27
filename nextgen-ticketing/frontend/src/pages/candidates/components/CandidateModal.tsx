import React from "react";
import Modal from "../../../components/Modal";
import CandidateForm from "./CandidateForm";
import type { Candidate } from "../../../types";

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null | undefined;
  onSubmit: (payload: any) => Promise<void>;
}

const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={candidate ? "Edit Candidate" : "Add New Candidate"}
      maxWidth="1000px"
    >
      <CandidateForm
        initialData={candidate}
        onSubmit={onSubmit}
        onCancel={onClose}
      />
    </Modal>
  );
};

export default CandidateModal;
