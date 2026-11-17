import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import CustomInput from "../../../components/CustomInput";
import CustomSelect from "../../../components/CustomSelect";
import CustomMultiSelect from "../../../components/CustomMultiSelect";
import { TaskDescriptionEditor } from "../../timesheet/components/TaskDescriptionEditor";
import type { Team, User } from "../../../types";
import { ROLE_TYPE } from "../../roles/roleConstants";

const TEAM_TYPE_OPTIONS = [
  { value: "TECHNICAL", label: "Technical Team" },
  { value: "ORGANIZATIONAL", label: "Organizational Team" },
];

interface TeamFormData {
  name: string;
  teamType: string;
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
  const { handleSubmit, control, reset, watch, setValue } =
    useForm<TeamFormData>({
      defaultValues: {
        name: "",
        teamType: "",
        description: "",
        teamLeadId: "",
        memberIds: [],
      },
    });

  const selectedTeamLeadId = watch("teamLeadId");
  const selectedTeamType = watch("teamType");
  // Technical teams have a Team Lead; organizational teams have a Manager.
  const leadLabel =
    selectedTeamType === "ORGANIZATIONAL" ? "Manager" : "Team Lead";
  const selectedMemberIds = watch("memberIds");

  useEffect(() => {
    if (initialData) {
      const leadId =
        initialData.teamLeadId || (initialData as any).teamLead?.id || "";
      const members =
        initialData.memberIds ||
        (initialData as any).members?.map((m: any) => m.id) ||
        [];
      reset({
        name: initialData.name,
        teamType: initialData.teamType || "",
        description: initialData.description || "",
        // The list/my-team APIs return lean objects without the scalar IDs,
        // so fall back to deriving them from the relation objects.
        teamLeadId: leadId,
        memberIds: members.filter((id: string) => id !== leadId),
      });
    } else {
      reset({
        name: "",
        teamType: "",
        description: "",
        teamLeadId: "",
        memberIds: [],
      });
    }
  }, [initialData, reset]);

  // If a user is selected as Team Lead, automatically remove them from Team Members
  useEffect(() => {
    if (
      selectedTeamLeadId &&
      Array.isArray(selectedMemberIds) &&
      selectedMemberIds.includes(selectedTeamLeadId)
    ) {
      setValue(
        "memberIds",
        selectedMemberIds.filter((id) => id !== selectedTeamLeadId),
      );
    }
  }, [selectedTeamLeadId, selectedMemberIds, setValue]);

  // Clients and super admins cannot be added to a team (managers are allowed).
  const userOptions = users
    .filter(
      (u) =>
        u.role?.roleType !== ROLE_TYPE.CUSTOMER &&
        u.role?.roleType !== ROLE_TYPE.ADMIN &&
        !u.role?.isAdmin,
    )
    .map((u) => ({
      value: u.id,
      label: u.fullname,
      sublabel: u.email,
      image: u.image,
    }));

  // Organizational teams are headed by a Manager (agent role type) only.
  const managerIds = new Set(
    users
      .filter((u) => u.role?.roleType === ROLE_TYPE.AGENT)
      .map((u) => u.id),
  );
  const leadOptions =
    selectedTeamType === "ORGANIZATIONAL"
      ? userOptions.filter((opt) => managerIds.has(opt.value))
      : userOptions;

  // Drop a lead who isn't a manager when switching to Organizational.
  useEffect(() => {
    if (
      selectedTeamType === "ORGANIZATIONAL" &&
      selectedTeamLeadId &&
      users.length > 0 &&
      !managerIds.has(selectedTeamLeadId)
    ) {
      setValue("teamLeadId", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamType, selectedTeamLeadId, users, setValue]);

  const memberOptions = userOptions.filter(
    (opt) => opt.value !== selectedTeamLeadId,
  );

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
        name="teamType"
        control={control}
        rules={{ required: "Team type is required" }}
        label="Team Type"
        placeholder="Select Team Type"
        options={TEAM_TYPE_OPTIONS}
        required
      />

      {selectedTeamType && (
        <CustomSelect
          key={selectedTeamType}
          name="teamLeadId"
          control={control}
          label={leadLabel}
          placeholder={`Select ${leadLabel}`}
          options={leadOptions}
        />
      )}

      <CustomMultiSelect
        name="memberIds"
        control={control}
        label="Team Members"
        placeholder="Select members..."
        options={memberOptions}
      />

      <TaskDescriptionEditor
        name="description"
        control={control}
        label="Description"
        placeholder="Team purpose or goals..."
      />
    </form>
  );
};

export default TeamForm;
