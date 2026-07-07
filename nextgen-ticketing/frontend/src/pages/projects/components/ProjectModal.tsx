import React from "react";
import Modal from "../../../components/Modal";
import ProjectForm from "./ProjectForm";
import CustomButton from "../../../components/CustomButton";
import type { ProjectModalProps } from "../../../types";

const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  clients,
  managers,
  teams,
  isLoading = false,
}) => {
  const footer = (
    <>
      <CustomButton variant="ghost" onClick={onClose} type="button">
        Cancel
      </CustomButton>
      <CustomButton
        variant="gradient"
        type="submit"
        form="project-form"
        loading={isLoading}
      >
        {project ? "Update Project" : "Create Project"}
      </CustomButton>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? "Edit Project" : "Add New Project"}
      footer={footer}
      maxWidth="750px"
    >
      <ProjectForm
        initialData={project}
        onSubmit={onSubmit}
        onCancel={onClose}
        clients={clients}
        managers={managers}
        teams={teams}
        isLoading={isLoading}
      />
    </Modal>
  );
};

export default ProjectModal;
