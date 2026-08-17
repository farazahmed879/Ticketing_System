import React from "react";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomSelect from "../../../../../components/CustomSelect";
import CustomButton from "../../../../../components/CustomButton";
import CustomBadge from "../../../../../components/CustomBadge";
import CustomTextArea from "../../../../../components/CustomTextArea";
import CustomDatePicker from "../../../../../components/CustomDatePicker";
import { StatusName } from "../../../../../utils/constants";
import type { TicketDetail, TicketUpdateFormData } from "../../../../../types";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import TicketAssignments from "./TicketAssignments";
import SelectWithLabel from "../../../../../components/SelectWithLabel";
import { ROLE_TYPE } from "../../../../roles/roleConstants";
import {
  canEditDueDate,
  statusDisplayName,
  statusOptionsForUser,
} from "../../../shared/ticketDecisions";

interface ModalDetailsFormProps {
  control: Control<TicketUpdateFormData>;
  setValue: UseFormSetValue<TicketUpdateFormData>;
  watch: UseFormWatch<TicketUpdateFormData>;
  formState: any;
  displayTicket: TicketDetail | any;
  users: any[];
  qaList: any[];
  priorities: any[];
  statuses: any[];
  isDisbaledMode: boolean;
  canEditContent: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canAssignQA: boolean;
  isClient: boolean;
  isQA: boolean;
  isTicketOwner: boolean;
  user: any;
  handleStartChat: (userId: string) => void;
  onClose: () => void;
  navigate: (path: string) => void;
}

const ModalDetailsForm: React.FC<ModalDetailsFormProps> = ({
  control,
  setValue,
  watch,
  displayTicket,
  users,
  qaList,
  priorities,
  statuses,
  isDisbaledMode,
  canEditContent,
  canUpdate,
  canAssign,
  canAssignQA,
  isClient,
  user,
  onClose,
  navigate,
}) => {
  const getStatusOptions = (columns: any[]) => {
    return columns.map((s: any) => ({
      value: s.id,
      label: statusDisplayName(s.name, user),
      icon: <CustomIcon name="Clock" size={14} color={s.color} />,
      disabled: !(
        user?.role?.roleType === ROLE_TYPE.ADMIN ||
        user?.role?.permissions?.boardStatuses?.[s.id] === true ||
        // The ticket's team lead may approve it; QA may approve too.
        ((displayTicket?.teamLeadIds?.includes(user?.id) ||
          user?.role?.roleType === ROLE_TYPE.QA) &&
          s.name === StatusName.APPROVED) ||
        (displayTicket.owner.id === user?.id &&
          (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
            s.name.toLowerCase() === StatusName.TRASH.toLowerCase() ||
            s.name.toLowerCase() === StatusName.FAILED.toLowerCase()))
      ),
    }));
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
        }}
      >
        <CustomIcon
          name="FolderKanban"
          size={16}
          color="var(--accent-primary)"
        />
        <span style={{ fontWeight: 600 }}>Project:</span>
        <span style={{ color: "var(--text-primary)" }}>
          {displayTicket.project?.name || "None"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {/* Header Badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "nowrap",
            alignItems: "center",
          }}
        >
          {user?.role?.roleType !== ROLE_TYPE.CUSTOMER ? (
            <CustomSelect
              name="priorityId"
              control={control}
              options={priorities.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <CustomIcon name="Tag" size={14} color={p.color} />,
              }))}
              style={{
                minWidth: 140,
                fontSize: "0.8rem",
              }}
              disabled={isDisbaledMode}
            />
          ) : (
            <CustomBadge
              color={displayTicket.priority.color}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
              }}
            >
              <CustomIcon name="Tag" size={16} /> {displayTicket.priority.name}
            </CustomBadge>
          )}
          {user?.role?.roleType !== ROLE_TYPE.CUSTOMER &&
            !(
              user?.role?.roleType === ROLE_TYPE.EMPLOYEE &&
              displayTicket?.status?.name === StatusName.APPROVED
            ) ? (
            <CustomSelect
              name="statusId"
              control={control}
              options={getStatusOptions(
                statusOptionsForUser(user, displayTicket?.status),
              )}
              style={{
                minWidth: 180,
                fontSize: "0.8rem",
              }}
              disabled={isDisbaledMode || displayTicket?.status?.name === StatusName.NEW}
            />
          ) : (
            <CustomBadge
              color={displayTicket.status.color}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
              }}
            >
              <CustomIcon name="Status" size={16} />{" "}
              {isClient && displayTicket.status.name === StatusName.RESOLVED
                ? StatusName.IN_PROCESS
                : statusDisplayName(displayTicket.status.name, user)}
            </CustomBadge>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CustomButton
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/tickets/${displayTicket.id}`);
            }}
            icon={<CustomIcon name="Maximize2" size={16} />}
            style={{
              color: "var(--accent-primary)",
              border: "1px solid var(--accent-primary)30",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <CustomTextArea
          name="issue"
          control={control}
          label={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CustomIcon name="Info" size={16} color="var(--accent-primary)" />
              <span>Description</span>
            </div>
          }
          disabled={!canEditContent || isDisbaledMode}
          placeholder={
            canEditContent ? "Add a description..." : "No description provided"
          }
          rows={6}
          containerStyle={{ height: "100%" }}
          style={{
            background: "rgba(255,255,255,0.02)",
            fontSize: "0.95rem",
            cursor: !canEditContent ? "not-allowed" : "text",
            resize: !canEditContent ? "none" : "vertical",
            height: "100%",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <SelectWithLabel
            label="Reporter"
            name="ownerId"
            icon="User"
            iconColor="var(--accent-primary)"
            control={control}
            disabled={!canAssign}
            onChange={() => { }}
            canAssign={false}
            multiple={false}
            dummyLabel={displayTicket?.owner?.fullname}
          />

          <CustomDatePicker
            name="dueDate"
            control={control}
            label={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CustomIcon
                  name="Clock"
                  size={18}
                  color="var(--accent-primary)"
                />
                <span>Due Date</span>
              </div>
            }
            min={new Date().toISOString().split("T")[0]}
            disabled={!canEditDueDate(user, displayTicket)}
          />

          <TicketAssignments
            control={control}
            setValue={setValue}
            watch={watch}
            displayTicket={displayTicket}
            users={users}
            qaList={qaList}
            statuses={statuses}
            isDisbaledMode={isDisbaledMode}
            canUpdate={canUpdate}
            canAssign={canAssign}
            canAssignQA={canAssignQA}
            isClient={isClient}
          />
        </div>
      </div>
    </>
  );
};

export default ModalDetailsForm;
