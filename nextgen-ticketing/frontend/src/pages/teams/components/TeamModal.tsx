import React from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import TeamForm from "./TeamForm";
import type { Team, User } from "../../../types";

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  team?: Team | null;
  users: User[];
}

const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  team,
  users,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={team ? "Edit Team" : "Add New Team"}
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            width: "100%",
          }}
        >
          <CustomButton variant="ghost" type="button" onClick={onClose}>
            Cancel
          </CustomButton>
          {/* Linked to the form via the `form` attribute so it submits even
              though it lives in the modal footer (outside the <form>). */}
          <CustomButton variant="gradient" type="submit" form="team-form">
            {team ? "Update Team" : "Create Team"}
          </CustomButton>
        </div>
      }
    >
      <TeamForm initialData={team} onSubmit={onSubmit} users={users} />
    </Modal>
  );
};

export default TeamModal;
