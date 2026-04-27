import React from "react";
import Modal from "../../../components/Modal";
import UserForm from "./UserForm";
import type { User, Role, UserFormData } from "../../../types";

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  roles: Role[];
  onSubmit: (data: UserFormData) => Promise<void>;
}

const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  user,
  roles,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? "Edit User" : "Add New User"}
    >
      <UserForm
        initialData={user}
        roles={roles}
        onSubmit={onSubmit}
      />
    </Modal>
  );
};

export default UserModal;
