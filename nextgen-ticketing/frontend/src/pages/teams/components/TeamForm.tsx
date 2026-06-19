import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import { RoleName } from "../../../utils/constants";
import type { Team, User } from "../../../types";

interface TeamFormData {
  name: string;
  description: string;
  teamLeadId: string;
  memberIds: string[];
}

interface TeamFormProps {
  initialData?: Team | null;
  onSubmit: (data: TeamFormData) => Promise<void>;
  users: User[];
}

const TeamForm: React.FC<TeamFormProps> = ({
  initialData,
  onSubmit,
  users,
}) => {
  const { handleSubmit, control, reset } = useForm<TeamFormData>({
    defaultValues: {
      name: "",
      description: "",
      teamLeadId: "",
      memberIds: [],
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || "",
        // The list/my-team APIs return lean objects without the scalar IDs,
        // so fall back to deriving them from the relation objects.
        teamLeadId:
          initialData.teamLeadId || (initialData as any).teamLead?.id || "",
        memberIds:
          initialData.memberIds ||
          (initialData as any).members?.map((m: any) => m.id) ||
          [],
      });
    } else {
      reset({
        name: "",
        description: "",
        teamLeadId: "",
        memberIds: [],
      });
    }
  }, [initialData, reset]);

  // Managers cannot be added to a team (neither as members nor as lead).
  const userOptions = users
    .filter((u) => u.role?.name !== RoleName.AGENT)
    .map((u) => ({
      value: u.id,
      label: u.fullname,
      sublabel: u.email,
      image: u.image,
    }));

  return (
    <form
      id="team-form"
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
        name="teamLeadId"
        control={control}
        label="Team Lead"
        placeholder="Select Team Lead"
        options={userOptions}
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
    </form>
  );
};

export default TeamForm;
