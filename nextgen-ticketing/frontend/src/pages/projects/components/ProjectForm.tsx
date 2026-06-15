import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import CustomIcon from "../../../components/CustomIcon";
import type { ProjectFormData, ProjectFormProps } from "../../../types";
import { PROJECT_STATUS_OPTIONS } from "../../../utils/constants";
import styles from "./ProjectForm.module.css";

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  clients,
  managers,
  teams,
}) => {
  const { handleSubmit, control, reset } = useForm<ProjectFormData>({
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      clientIds: [],
      managerId: "",
      teamIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        status: initialData.status,
        clientIds: initialData.clientIds || [],
        managerId: initialData.managerId || "",
        teamIds: initialData.teamIds || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        status: "Active",
        clientIds: [],
        managerId: "",
        teamIds: [],
      });
    }
  }, [initialData, reset]);

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.fullname,
  }));

  const managerOptions = managers.map((m) => ({
    value: m.id,
    label: m.fullname,
  }));

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <form
      id="project-form"
      onSubmit={handleSubmit(onSubmit)}
      className={styles.form}
    >
      {/* Section 1: Project Details */}
      <div className={styles.sectionHeader}>
        <CustomIcon name="FileText" size={14} />
        <span>Project Details</span>
      </div>

      <div className={styles.row}>
        <CustomInput
          name="name"
          control={control}
          rules={{ required: "Project name is required" }}
          label="Project Name"
          placeholder="e.g. Website Redesign, Mobile App..."
          required
        />

        <CustomSelect
          name="status"
          control={control}
          label="Status"
          placeholder="Select Status"
          options={PROJECT_STATUS_OPTIONS}
        />
      </div>

      <CustomTextArea
        name="description"
        control={control}
        label="Description"
        placeholder="Project scope and details..."
        rows={3}
      />

      {/* Section 2: Team & Assignment */}
      <div className={styles.sectionHeader}>
        <CustomIcon name="Users" size={14} />
        <span>Team & Clients</span>
      </div>

      <div className={styles.twoColumnRow}>
        <CustomMultiSelect
          name="clientIds"
          control={control}
          label="Clients"
          placeholder="Select Clients..."
          options={clientOptions}
        />

        <CustomSelect
          name="managerId"
          control={control}
          label="Project Manager"
          placeholder="Select Project Manager..."
          options={managerOptions}
        />
      </div>

      <div className={styles.twoColumnRow}>
        <CustomMultiSelect
          name="teamIds"
          control={control}
          label="Teams"
          placeholder="Select Teams..."
          options={teamOptions}
        />
      </div>
    </form>
  );
};

export default ProjectForm;
