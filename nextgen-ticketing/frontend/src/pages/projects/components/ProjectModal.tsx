import React from "react";
import Modal from "../../../components/Modal";
import ProjectForm from "./ProjectForm";
import type { ProjectModalProps } from "../../../types";

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  clients,
  managers,
  employees,
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
        clients={clients}
        managers={managers}
        employees={employees}
      />
    </Modal>
  );
};

export default ProjectModal;
