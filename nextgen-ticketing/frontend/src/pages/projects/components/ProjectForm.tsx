import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import CustomButton from "../../../components/CustomButton";
import type { Project, Department, Team } from "../../../types";

interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  departmentId: string;
  teamIds: string[];
}

interface ProjectFormProps {
  initialData?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  departments: Department[];
  teams: Team[];
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  departments,
  teams,
}) => {
  const { handleSubmit, control, reset } = useForm<ProjectFormData>({
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      departmentId: "",
      teamIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        status: initialData.status,
        departmentId: initialData.departmentId || "",
        teamIds: initialData.teamIds || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        status: "Active",
        departmentId: "",
        teamIds: [],
      });
    }
  }, [initialData, reset]);

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }));
  const statusOptions = [
    { value: "Active", label: "Active" },
    { value: "On Hold", label: "On Hold" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
  ];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <CustomInput
        name="name"
        control={control}
        rules={{ required: "Project name is required" }}
        label="Project Name"
        placeholder="e.g. Website Redesign, Mobile App..."
        required
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <CustomSelect
          name="departmentId"
          control={control}
          label="Department"
          placeholder="Select Department"
          options={departmentOptions}
        />
        <CustomSelect
          name="status"
          control={control}
          label="Status"
          placeholder="Select Status"
          options={statusOptions}
        />
      </div>

      <CustomMultiSelect
        name="teamIds"
        control={control}
        label="Assigned Teams"
        placeholder="Select teams..."
        options={teamOptions}
      />

      <CustomTextArea
        name="description"
        control={control}
        label="Description"
        placeholder="Project scope and details..."
        rows={3}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          marginTop: 10,
        }}
      >
        <CustomButton variant="ghost" onClick={onCancel} type="button">
          Cancel
        </CustomButton>
        <CustomButton variant="gradient" type="submit" loading={isLoading}>
          {initialData ? "Update Project" : "Create Project"}
        </CustomButton>
      </div>
    </form>
  );
};

export default ProjectForm;
