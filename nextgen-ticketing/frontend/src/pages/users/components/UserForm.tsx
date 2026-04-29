import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
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
  const [step, setStep] = useState(1);
  const { handleSubmit, control, reset, watch, trigger } = useForm<UserFormData>({
    defaultValues: {
      fullname: "",
      email: "",
      username: "",
      password: "",
      title: "",
      roleId: "",
      primaryContact: "",
      secondaryContact: "",
      cnic: "",
      linkedInUrl: "",
      gitUrl: "",
      address: "",
      emergencyContact: "",
      primaryResumeUrl: "",
      jpPatternResumeUrl: "",
      nationality: "",
      location: "",
      employeeType: "Onsite",
      branch: "",
    },
  });

  const employeeType = watch("employeeType");

  useEffect(() => {
    if (initialData) {
      reset({
        fullname: initialData.fullname,
        email: initialData.email,
        username: initialData.username || "",
        password: "",
        title: initialData.title || "",
        roleId: initialData.role.id,
        primaryContact: initialData.primaryContact || "",
        secondaryContact: initialData.secondaryContact || "",
        cnic: initialData.cnic || "",
        linkedInUrl: initialData.linkedInUrl || "",
        gitUrl: initialData.gitUrl || "",
        address: initialData.address || "",
        emergencyContact: initialData.emergencyContact || "",
        primaryResumeUrl: initialData.primaryResumeUrl || "",
        jpPatternResumeUrl: initialData.jpPatternResumeUrl || "",
        nationality: initialData.nationality || "",
        location: initialData.location || "",
        employeeType: initialData.employeeType || "Onsite",
        branch: initialData.branch || "",
      });
    } else {
      reset({
        fullname: "",
        email: "",
        username: "",
        password: "",
        title: "",
        roleId: "",
        primaryContact: "",
        secondaryContact: "",
        cnic: "",
        linkedInUrl: "",
        gitUrl: "",
        address: "",
        emergencyContact: "",
        primaryResumeUrl: "",
        jpPatternResumeUrl: "",
        nationality: "",
        location: "",
        employeeType: "Onsite",
        branch: "",
      });
    }
  }, [initialData, reset]);

  const handleNext = async () => {
    const isStepValid = await trigger([
      "fullname",
      "email",
      "password",
      "username",
      "cnic"
    ]);
    if (isStepValid) setStep(2);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "10px 0" }}>
      {/* STEPPER INDICATOR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 40, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: "50%", background: step >= 1 ? "var(--primary-gradient)" : "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center", color: step >= 1 ? "#fff" : "var(--text-muted)",
            fontWeight: 700, border: step === 1 ? "2px solid var(--primary-color)" : "none",
            boxShadow: step === 1 ? "0 0 15px rgba(var(--primary-rgb), 0.3)" : "none"
          }}>
            1
          </div>
          <span style={{ fontWeight: 600, color: step === 1 ? "var(--primary-color)" : "var(--text-muted)" }}>Account Info</span>
        </div>
        <div style={{ flex: 1, maxWidth: 60, height: 2, background: step === 2 ? "var(--primary-gradient)" : "var(--border-color)" }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: "50%", background: step >= 2 ? "var(--primary-gradient)" : "var(--bg-card)",
            display: "flex", alignItems: "center", justifyContent: "center", color: step >= 2 ? "#fff" : "var(--text-muted)",
            fontWeight: 700, border: step === 2 ? "2px solid var(--primary-color)" : "none",
            boxShadow: step === 2 ? "0 0 15px rgba(var(--primary-rgb), 0.3)" : "none"
          }}>
            2
          </div>
          <span style={{ fontWeight: 600, color: step === 2 ? "var(--primary-color)" : "var(--text-muted)" }}>Professional Details</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {step === 1 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <CustomIcon name="User" size={20} style={{ color: "var(--primary-color)" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)" }}>Step 1: Primary Information</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
              <CustomInput
                name="fullname"
                control={control}
                rules={{ required: "Full name is required" }}
                label="Full Name"
                placeholder="John Doe"
                required
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <CustomInput name="username" control={control} label="Username" placeholder="johndoe" />
                <CustomInput name="cnic" control={control} label="CNIC" placeholder="42101-XXXXXXX-X" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <CustomInput
                  name="email"
                  control={control}
                  rules={{ 
                    required: "Email is required",
                    pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: "Invalid email" }
                  }}
                  label="Email Address"
                  type="email"
                  placeholder="email@example.com"
                  required
                />
                <CustomInput
                  name="password"
                  control={control}
                  rules={!initialData ? { required: "Password is required" } : {}}
                  label={`Password ${initialData ? "(Optional)" : ""}`}
                  type="password"
                  placeholder="••••••••"
                  required={!initialData}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <CustomInput name="primaryContact" control={control} label="Primary Contact" placeholder="+92 3XX XXXXXXX" />
                <CustomInput name="secondaryContact" control={control} label="Secondary Contact" placeholder="+92 3XX XXXXXXX" />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <CustomButton type="button" variant="gradient" fullWidth onClick={handleNext}>
                Next: Professional Details
              </CustomButton>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <CustomIcon name="Briefcase" size={20} style={{ color: "var(--primary-color)" }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-main)" }}>Step 2: Professional & Additional Details</h3>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Professional info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <CustomInput name="title" control={control} label="Job Title" placeholder="Software Engineer" />
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
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <CustomInput name="nationality" control={control} label="Nationality" placeholder="Pakistani" />
                  <CustomInput name="location" control={control} label="Current City" placeholder="Karachi" />
                </div>
                <CustomInput name="address" control={control} label="Residential Address" placeholder="Full Address" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <CustomSelect
                    name="employeeType"
                    control={control}
                    label="Employee Type"
                    options={[{ value: "Onsite", label: "Onsite" }, { value: "Remote", label: "Remote" }]}
                  />
                  {employeeType === "Onsite" && <CustomInput name="branch" control={control} label="Branch" placeholder="Main Branch" />}
                </div>
              </div>

              {/* Other info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <CustomInput name="emergencyContact" control={control} label="Emergency Contact" placeholder="Name - Phone" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <CustomInput name="linkedInUrl" control={control} label="LinkedIn" placeholder="linkedin.com/..." />
                  <CustomInput name="gitUrl" control={control} label="Portfolio/Git" placeholder="github.com/..." />
                </div>
                <CustomInput name="primaryResumeUrl" control={control} label="Primary Resume" placeholder="Link to PDF" />
                <CustomInput name="jpPatternResumeUrl" control={control} label="JP Pattern Resume" placeholder="Link to PDF" />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
              <CustomButton type="button" variant="outline" onClick={() => setStep(1)} style={{ flex: 1 }}>
                Back
              </CustomButton>
              <CustomButton type="submit" variant="gradient" style={{ flex: 2 }} loading={isLoading}>
                {initialData ? "Update User Account" : "Create New User Account"}
              </CustomButton>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default UserForm;
