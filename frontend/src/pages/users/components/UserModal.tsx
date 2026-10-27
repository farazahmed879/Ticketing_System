import React, { useState, useRef, useEffect } from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import UserForm, { type UserFormHandle } from "./UserForm";
import type { User, Role, UserFormData } from "../../../types";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  onSubmit: (data: UserFormData) => Promise<void>;
}

const FORM_ID = "user-form";

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  user,
  roles,
  onSubmit,
}) => {
  const [step, setStep] = useState(1);
  const formRef = useRef<UserFormHandle>(null);

  // Always start the wizard on step 1 whenever the modal (re)opens.
  useEffect(() => {
    if (isOpen) setStep(1);
  }, [isOpen]);

  const footer =
    step === 1 ? (
      <CustomButton
        type="button"
        variant="gradient"
        onClick={() => formRef.current?.next()}
      >
        Next: Professional Details
      </CustomButton>
    ) : (
      <>
        <CustomButton
          type="button"
          variant="outline"
          onClick={() => setStep(1)}
        >
          Back
        </CustomButton>
        <CustomButton type="submit" variant="gradient" form={FORM_ID}>
          {user ? "Update User Account" : "Create New User Account"}
        </CustomButton>
      </>
    );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit User" : "Add New User"}
      maxWidth="850px"
      footer={footer}
    >
      <UserForm
        ref={formRef}
        initialData={user}
        roles={roles}
        onSubmit={onSubmit}
        step={step}
        onStepChange={setStep}
        formId={FORM_ID}
      />
    </Modal>
  );
};

export default UserModal;
