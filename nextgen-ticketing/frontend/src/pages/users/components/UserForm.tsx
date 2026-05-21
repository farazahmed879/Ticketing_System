import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import PhoneInput from "../../../components/PhoneInput";
import { COUNTRY_CODES } from "../../../utils/constants";
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
  const [showPassword, setShowPassword] = useState(false);
  const { handleSubmit, control, reset, watch, trigger } = useForm<UserFormData>({
    defaultValues: {
      fullname: "",
      email: "",
      username: "",
      password: "",
      title: "",
      roleId: "",
      primaryContact: "",
      primaryContactCode: "+92",
      secondaryContact: "",
      secondaryContactCode: "+92",
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
      leaves: 20,
    },
  });

  const employeeType = watch("employeeType");

  useEffect(() => {
    if (initialData) {
      // Parse primary contact
      let primaryPhone = initialData.primaryContact || "";
      let primaryCode = "+92";
      const primaryMatched = COUNTRY_CODES.find(c => primaryPhone.startsWith(c.value));
      if (primaryMatched) {
        primaryCode = primaryMatched.value;
        primaryPhone = primaryPhone.replace(primaryMatched.value, "").trim();
      }

      // Parse secondary contact
      let secondaryPhone = initialData.secondaryContact || "";
      let secondaryCode = "+92";
      const secondaryMatched = COUNTRY_CODES.find(c => secondaryPhone.startsWith(c.value));
      if (secondaryMatched) {
        secondaryCode = secondaryMatched.value;
        secondaryPhone = secondaryPhone.replace(secondaryMatched.value, "").trim();
      }

      reset({
        fullname: initialData.fullname,
        email: initialData.email,
        username: initialData.username || "",
        password: "",
        title: initialData.title || "",
        roleId: initialData.role.id,
        primaryContact: primaryPhone,
        primaryContactCode: primaryCode,
        secondaryContact: secondaryPhone,
        secondaryContactCode: secondaryCode,
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
        leaves: initialData.leaves ?? 20,
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
        primaryContactCode: "+92",
        secondaryContact: "",
        secondaryContactCode: "+92",
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
        leaves: 20,
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

      <form onSubmit={handleSubmit((data) => {
        const payload = {
          ...data,
          primaryContact: data.primaryContact ? `${data.primaryContactCode} ${data.primaryContact.trim()}` : "",
          secondaryContact: data.secondaryContact ? `${data.secondaryContactCode} ${data.secondaryContact.trim()}` : "",
          leaves:
            data.leaves !== undefined && (data.leaves as any) !== ""
              ? Number(data.leaves)
              : undefined,
        };
        // Remove code fields from payload before sending
        delete payload.primaryContactCode;
        delete payload.secondaryContactCode;
        onSubmit(payload as UserFormData);
      })}>
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
                <CustomInput 
                  name="username" 
                  control={control} 
                  label="Username" 
                  placeholder="johndoe" 
                  autoComplete="username"
                />
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
                  autoComplete="email"
                />
                <CustomInput
                  name="password"
                  control={control}
                  rules={!initialData ? { required: "Password is required" } : {}}
                  label={`Password ${initialData ? "(Optional)" : ""}`}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  required={!initialData}
                  autoComplete="new-password"
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      style={{ background: "transparent", display: "flex", alignItems: "center", cursor: "pointer", border: "none", padding: "4px" }}
                    >
                      <CustomIcon 
                        name={showPassword ? "EyeOff" : "Eye"} 
                        size={18} 
                        color="var(--text-muted)" 
                      />
                    </button>
                  }
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <PhoneInput
                  name="primaryContact"
                  countryCodeName="primaryContactCode"
                  control={control}
                  label="Primary Contact"
                  placeholder="3XX XXXXXXX"
                />
                <PhoneInput
                  name="secondaryContact"
                  countryCodeName="secondaryContactCode"
                  control={control}
                  label="Secondary Contact"
                  placeholder="3XX XXXXXXX"
                />
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
                <CustomInput
                  name="leaves"
                  control={control}
                  label="Leave Balance (days)"
                  type="number"
                  placeholder="20"
                  min={0}
                  step="0.5"
                  rules={{
                    min: { value: 0, message: "Cannot be negative" },
                  }}
                />
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
