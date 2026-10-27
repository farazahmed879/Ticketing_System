import React, { useState, useEffect } from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import CandidateForm from "./CandidateForm";
import FullScreenLoader from "../../../components/FullScreenLoader/FullScreenLoader";
import type { Candidate } from "../../../types";

interface CandidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null | undefined;
  onSubmit: (payload: any) => Promise<void>;
  isSubmitting?: boolean;
}

const CandidateModal: React.FC<CandidateModalProps> = ({
  isOpen,
  onClose,
  candidate,
  onSubmit,
  isSubmitting = false,
}) => {
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsUploadingResume(false);
    }
  }, [isOpen]);

  return (
    <>
      {isSubmitting && (
        <FullScreenLoader
          subMessage={candidate ? "Updating Candidate..." : "Creating Candidate..."}
        />
      )}
      <Modal
        isOpen={isOpen}
      onClose={onClose}
      title={candidate ? "Edit Candidate" : "Add New Candidate"}
      maxWidth="1400px"
      footer={
        <>
          <div style={{ marginRight: "auto" }}>
            <CustomButton
              variant="outline"
              type="reset"
              form="candidate-form"
              disabled={isSubmitting}
            >
              Reset Form
            </CustomButton>
          </div>
          <CustomButton
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </CustomButton>
          <CustomButton
            variant="gradient"
            type="submit"
            form="candidate-form"
            loading={isSubmitting || isUploadingResume}
            disabled={isUploadingResume}
          >
            {candidate ? "Update Candidate" : "Create Candidate"}
          </CustomButton>
        </>
      }
    >
      <CandidateForm
        initialData={candidate}
        onSubmit={onSubmit}
        onCancel={onClose}
        onUploadStateChange={setIsUploadingResume}
      />
    </Modal>
    </>
  );
};

export default CandidateModal;
