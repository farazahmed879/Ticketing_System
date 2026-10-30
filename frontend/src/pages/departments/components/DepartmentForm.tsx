import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";
import { TaskDescriptionEditor } from "../../timesheet/components/TaskDescriptionEditor";
import type { Department } from "../../../types";

interface DepartmentFormData {
  name: string;
  description: string;
}

interface DepartmentFormProps {
  initialData?: Department | null;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { handleSubmit, control, reset } = useForm<DepartmentFormData>({
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
      });
    } else {
      reset({
        name: "",
        description: "",
      });
    }
  }, [initialData, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <CustomInput
        name="name"
        control={control}
        rules={{ required: "Department name is required" }}
        label="Department Name"
        placeholder="e.g. Engineering, Marketing..."
        required
      />
      <TaskDescriptionEditor
        name="description"
        control={control}
        label="Description"
        placeholder="Brief description of the department..."
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
          {initialData ? "Update Department" : "Create Department"}
        </CustomButton>
      </div>
    </form>
  );
};

export default DepartmentForm;
