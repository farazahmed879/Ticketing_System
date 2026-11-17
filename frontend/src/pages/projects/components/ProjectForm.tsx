import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import CustomIcon from "../../../components/CustomIcon";
import { TaskDescriptionEditor } from "../../timesheet/components/TaskDescriptionEditor";
import type { ProjectFormData, ProjectFormProps, ProjectLink } from "../../../types";
import ProjectLinksField from "./ProjectLinksField";
import { PROJECT_STATUS_OPTIONS } from "../../../utils/constants";
import styles from "./ProjectForm.module.css";

/** Saved links -> editable rows (labels as plain strings). */
const toRows = (links?: ProjectLink[]) =>
  (links || []).map((l) => ({ label: l.label || "", url: l.url }));

/** Editable rows -> payload: trimmed, empty rows dropped (blank label = none). */
const toLinks = (rows: { label: string; url: string }[]) =>
  rows
    .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
    .filter((r) => r.url);

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
      gitRepos: [],
      siteUrls: [],
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
        gitRepos: toRows(initialData.gitRepos),
        siteUrls: toRows(initialData.siteUrls),
      });
    } else {
      reset({
        name: "",
        description: "",
        status: "Active",
        clientIds: [],
        managerId: "",
        teamIds: [],
        gitRepos: [],
        siteUrls: [],
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = (data: ProjectFormData) => {
    // Project Manager is optional — send null (not "") so the backend
    // clears the relation instead of choking on an invalid ObjectId.
    return onSubmit({
      ...data,
      managerId: data.managerId || null,
      gitRepos: toLinks(data.gitRepos),
      siteUrls: toLinks(data.siteUrls),
    });
  };

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.fullname,
    sublabel: c.email,
    image: c.image,
  }));

  const managerOptions = managers.map((m) => ({
    value: m.id,
    label: m.fullname,
    sublabel: m.email,
    image: m.image,
  }));

  const teamOptions = teams.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  return (
    <form
      id="project-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className={styles.form}
    >
      {/* Left: what the project is */}
      <section className={styles.panel}>
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

        <TaskDescriptionEditor
          name="description"
          control={control}
          label="Description"
          placeholder="Project scope, goals, important details..."
          minHeight={260}
        />
      </section>

      {/* Right: who works on it + where it lives */}
      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <CustomIcon name="Users" size={14} />
          <span>Team & Clients</span>
        </div>

        <CustomSelect
          name="managerId"
          control={control}
          label="Project Manager"
          placeholder="Select Project Manager..."
          options={managerOptions}
          isClearable
        />

        <div className={styles.twoColumnRow}>
          <CustomMultiSelect
            name="clientIds"
            control={control}
            label="Clients"
            placeholder="Select Clients..."
            options={clientOptions}
          />

          <CustomMultiSelect
            name="teamIds"
            control={control}
            label="Teams"
            placeholder="Select Teams..."
            options={teamOptions}
          />
        </div>

        <div className={styles.sectionHeader}>
          <CustomIcon name="Link" size={14} />
          <span>Links</span>
        </div>

        <div className={styles.linkGroup}>
          <span className={styles.linkGroupTitle}>
            <CustomIcon name="Globe" size={14} />
            Site URLs
            <span className={styles.linkGroupHint}>e.g. Production, Staging</span>
          </span>
          <ProjectLinksField
            control={control}
            name="siteUrls"
            icon="Globe"
            addText="Add site URL"
            labelPlaceholder="Label (e.g. Production)"
            urlPlaceholder="https://example.com"
          />
        </div>

        <div className={styles.linkGroup}>
          <span className={styles.linkGroupTitle}>
            <CustomIcon name="GitBranch" size={14} />
            Git Repositories
            <span className={styles.linkGroupHint}>Not visible to clients</span>
          </span>
          <ProjectLinksField
            control={control}
            name="gitRepos"
            icon="GitBranch"
            addText="Add repository"
            labelPlaceholder="Label (e.g. Frontend)"
            urlPlaceholder="https://github.com/org/repo"
          />
        </div>
      </section>
    </form>
  );
};

export default ProjectForm;
