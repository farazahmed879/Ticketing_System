import React, { useRef } from "react";
import Modal from "../../../components/Modal";
import RoleForm from "./RoleForm";
import type { RoleModalProps } from "../types";
import CustomButton from "../../../components/CustomButton";
import { RoleName } from "../../../utils/constants";

const RoleModal: React.FC<RoleModalProps> = ({
  isOpen,
  onClose,
  role,
  statuses,
  onSubmit,
  isLoading = false,
}) => {
  const formRef = useRef<any>(null);
  const isCoreAdmin = role?.name === RoleName.ADMIN;

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
        disabled={isLoading || isCoreAdmin}
      >
        Reset
      </CustomButton>
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <CustomButton variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </CustomButton>
        <CustomButton
          type="submit"
          form="role-form"
          variant={isCoreAdmin ? "secondary" : "gradient"}
          loading={isLoading}
          title={isCoreAdmin ? "The system Admin role cannot be modified" : ""}
        >
          {role ? "Update Role" : "Create Role"}
        </CustomButton>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1150px"
      title={role ? "Edit Role & Permissions" : "Create New Role"}
      footer={footer}
    >
      <RoleForm
        ref={formRef}
        initialData={role}
        statuses={statuses}
        onSubmit={onSubmit}
      />
    </Modal>
  );
};

export default RoleModal;
