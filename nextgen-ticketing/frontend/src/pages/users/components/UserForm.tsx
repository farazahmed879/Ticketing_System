import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import type { User, Role, UserFormData } from "../../../types";

interface UserFormProps {
  initialData?: User | null;
  roles: Role[];
  onSubmit: (data: UserFormData) => Promise<void>;
  isLoading?: boolean;
}

const UserForm: React.FC<UserFormProps> = ({
  initialData,
  roles,
  onSubmit,
  isLoading = false,
}) => {
  const { handleSubmit, control, reset } = useForm<UserFormData>({
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      title: "",
      roleId: "",
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        fullname: initialData.fullname,
        email: initialData.email,
        password: "",
        title: initialData.title || "",
        roleId: initialData.role.id,
      });
    } else {
      reset({
        fullname: "",
        email: "",
        password: "",
        title: "",
        roleId: "",
      });
    }
  }, [initialData, reset]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 20,
        minHeight: "380px" 
      }}
    >
      <CustomInput
        name="fullname"
        control={control}
        rules={{ required: "Full name is required" }}
        label="Full Name"
        type="text"
        placeholder="Full Name"
        required
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <CustomInput
          name="email"
          control={control}
          rules={{ 
            required: "Email is required",
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: "Invalid email address"
            }
          }}
          label="Email"
          type="email"
          placeholder="email@example.com"
          required
        />
        <CustomInput
          name="password"
          control={control}
          rules={!initialData ? { required: "Password is required" } : {}}
          label={`Password ${initialData ? "(Leave blank to keep current)" : ""}`}
          type="password"
          placeholder="Password"
          required={!initialData}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        <CustomInput
          name="title"
          control={control}
          label="Job Title / Company"
          type="text"
          placeholder="e.g. Senior Agent"
        />
        <CustomSelect
          name="roleId"
          control={control}
          rules={{ required: "Role is required" }}
          label="System Role"
          placeholder="Select Role"
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          required={true}
        />
      </div>

      <CustomButton
        type="submit"
        variant="gradient"
        fullWidth
        loading={isLoading}
        style={{ marginTop: 10 }}
      >
        {initialData ? "Update User" : "Create User"}
      </CustomButton>
    </form>
  );
};

export default UserForm;
