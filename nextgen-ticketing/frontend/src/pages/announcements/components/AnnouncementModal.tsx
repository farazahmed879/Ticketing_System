import React, { useRef } from "react";
import Modal from "../../../components/Modal";
import AnnouncementForm from "./AnnouncementForm.tsx";
import CustomButton from "../../../components/CustomButton";

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: any;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onSubmit,
  isLoading = false,
}) => {
  const formRef = useRef<any>(null);

  const handleReset = () => {
    if (formRef.current) {
      formRef.current.reset();
    }
  };

  const footer = (
    <div
      style={{
        display: "flex",
        gap: 12,
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <CustomButton
        variant="outline"
        onClick={handleReset}
        disabled={isLoading}
      >
        Reset
      </CustomButton>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <CustomButton variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </CustomButton>
        <CustomButton
          type="submit"
          form="announcement-form"
          variant="gradient"
          loading={isLoading}
        >
          {announcement ? "Update Shoutout" : "Create Shoutout"}
        </CustomButton>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement ? "Edit Shoutout" : "Create Shoutout"}
      maxWidth="600px"
      footer={footer}
    >
      <AnnouncementForm
        ref={formRef}
        initialData={announcement}
        onSubmit={onSubmit}
      />
    </Modal>
  );
};

export default AnnouncementModal;
