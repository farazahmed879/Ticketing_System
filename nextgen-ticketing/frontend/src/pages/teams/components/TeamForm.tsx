import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import CustomButton from "../../../components/CustomButton";
import type { Team, User, Department, Project } from "../../../types";

interface TeamFormData {
  name: string;
  description: string;
  departmentId: string;
  projectIds: string[];
  memberIds: string[];
}

interface TeamFormProps {
  initialData?: Team | null;
  onSubmit: (data: TeamFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  departments: Department[];
  projects: Project[];
  users: User[];
}

const TeamForm: React.FC<TeamFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  departments,
  projects,
  users,
}) => {
  const { handleSubmit, control, reset } = useForm<TeamFormData>({
    defaultValues: {
      name: "",
      description: "",
      departmentId: "",
      projectIds: [],
      memberIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        departmentId: initialData.departmentId || "",
        projectIds: initialData.projectIds || [],
        memberIds: initialData.memberIds || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        departmentId: "",
        projectIds: [],
        memberIds: [],
      });
    }
  }, [initialData, reset]);

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOptions = users.map((u) => ({
    value: u.id,
    label: u.fullname,
    sublabel: u.email,
    image: u.image,
  }));

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <CustomInput
        name="name"
        control={control}
        rules={{ required: "Team name is required" }}
        label="Team Name"
        placeholder="e.g. Frontend Squad, Backend Core..."
        required
      />

      <CustomSelect
        name="departmentId"
        control={control}
        label="Department"
        placeholder="Select Department"
        options={departmentOptions}
      />

      <CustomMultiSelect
        name="projectIds"
        control={control}
        label="Assigned Projects"
        placeholder="Select projects..."
        options={projectOptions}
      />

      <CustomMultiSelect
        name="memberIds"
        control={control}
        label="Team Members"
        placeholder="Select members..."
        options={userOptions}
      />

      <CustomTextArea
        name="description"
        control={control}
        label="Description"
        placeholder="Team purpose or goals..."
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
          {initialData ? "Update Team" : "Create Team"}
        </CustomButton>
      </div>
    </form>
  );
};

export default TeamForm;
