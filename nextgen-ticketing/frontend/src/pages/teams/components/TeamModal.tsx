import React from "react";
import Modal from "../../../components/Modal";
import TeamForm from "./TeamForm";
import type { Team, User, Department, Project } from "../../../types";

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  team?: Team | null;
  departments: Department[];
  projects: Project[];
  users: User[];
}

const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  team,
  departments,
  projects,
  users,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={team ? "Edit Team" : "Add New Team"}
    >
      <TeamForm
        initialData={team}
        onSubmit={onSubmit}
        onCancel={onClose}
        departments={departments}
        projects={projects}
        users={users}
      />
    </Modal>
  );
};

export default TeamModal;
