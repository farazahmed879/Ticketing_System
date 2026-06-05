import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import CustomButton from "../../../components/CustomButton";
import type { ProjectFormData, ProjectFormProps } from "../../../types";
import { PROJECT_STATUS_OPTIONS } from "../../../utils/constants";

const ProjectForm: React.FC<ProjectFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  clients,
}) => {
  const { handleSubmit, control, reset } = useForm<ProjectFormData>({
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
      clientIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        status: initialData.status,
        clientIds: initialData.clientIds || [],
      });
    } else {
      reset({
        name: "",
        description: "",
        status: "Active",
        clientIds: [],
      });
    }
  }, [initialData, reset]);

  const clientOptions = clients.map((c) => ({
    value: c.id,
    label: c.fullname,
  }));

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

      <CustomSelect
        name="status"
        control={control}
        label="Status"
        placeholder="Select Status"
        options={PROJECT_STATUS_OPTIONS}
      />

      <CustomMultiSelect
        name="clientIds"
        control={control}
        label="Clients"
        placeholder="Select Clients..."
        options={clientOptions}
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
