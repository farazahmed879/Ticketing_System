import React from "react";
import Modal from "../../../components/Modal";
import ProjectForm from "./ProjectForm";
import type { Project, Department, Team } from "../../../types";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  project?: Project | null;
  departments: Department[];
  teams: Team[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  departments,
  teams,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? "Edit Project" : "Add New Project"}
    >
      <ProjectForm
        initialData={project}
        onSubmit={onSubmit}
        onCancel={onClose}
        departments={departments}
        teams={teams}
      />
    </Modal>
  );
};

export default ProjectModal;
