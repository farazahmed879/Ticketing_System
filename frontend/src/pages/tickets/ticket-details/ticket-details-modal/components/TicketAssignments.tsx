import React from "react";
import SelectWithLabel from "../../../../../components/SelectWithLabel";
import CustomIcon from "../../../../../components/CustomIcon";
import { LABELS, StatusName } from "../../../../../utils/constants";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { TicketUpdateFormData, TicketDetail } from "../../../../../types";

interface TicketAssignmentsProps {
  control: Control<TicketUpdateFormData>;
  setValue: UseFormSetValue<TicketUpdateFormData>;
  watch: UseFormWatch<TicketUpdateFormData>;
  displayTicket: TicketDetail | any;
  users: any[];
  qaList: any[];
  statuses: any[];
  isDisbaledMode: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canAssignQA: boolean;
  isClient: boolean;
}

const TicketAssignments: React.FC<TicketAssignmentsProps> = ({
  control,
  setValue,
  watch,
  displayTicket,
  users,
  qaList,
  statuses,
  isDisbaledMode,
  canUpdate,
  canAssign,
  canAssignQA,
  isClient,
}) => {
  return (
    <>
      {/* Assignment */}
      <SelectWithLabel
        label="Assignee"
        name="assigneeId"
        icon="UserPlus"
        iconColor="var(--accent-secondary)"
        control={control}
        showSearch
        disabled={!canAssign}
        onChange={(val: any) => {
          setValue("assigneeId", val, {
            shouldDirty: true,
          });
          if (val) {
            const openStatus = statuses.find(
              (c: any) =>
                c.name.toLowerCase() === StatusName.OPEN.toLowerCase()
            );

            if (openStatus && watch("statusId") !== openStatus.id) {
              setValue("statusId", openStatus.id, {
                shouldDirty: true,
              });
              setValue("targetStatusName", openStatus.name, {
                shouldDirty: true,
              });
            }

          } else {
            const newStatus = statuses.find(
              (c: any) =>
                c.name.toLowerCase() === StatusName.NEW.toLowerCase()
            );

            if (newStatus && watch("statusId") !== newStatus.id) {
              setValue("statusId", newStatus.id, {
                shouldDirty: true,
              });
              setValue("targetStatusName", newStatus.name, {
                shouldDirty: true,
              });
            }
          }
        }}
        options={[
          {
            value: "",
            label: "Unassigned",
            icon: <CustomIcon name="UserPlus" size={14} />,
          },
          ...users.map((agent) => ({
            value: agent.id,
            label: agent.fullname,
            sublabel: agent.teamNames?.length
              ? agent.teamNames.join(", ")
              : undefined,
            image: agent.image,
          })),
          // Always include the current assignee so it shows even when they are
          // not in the fetched project-members list.
          ...(displayTicket?.assignee?.id &&
            !users.some((u) => u.id === displayTicket.assignee.id)
            ? [
              {
                value: displayTicket.assignee.id,
                label: displayTicket.assignee.fullname,
                image: displayTicket.assignee.image,
              },
            ]
            : []),
        ]}
        canAssign={canAssign}
        multiple={false}
        dummyLabel={(() => {
          if (!displayTicket?.assignee?.id)
            return displayTicket?.assignee?.fullname;
          const agent = users.find((u) => u.id === displayTicket.assignee.id);
          return agent?.teamNames?.length
            ? `${agent.fullname} (${agent.teamNames.join(", ")})`
            : displayTicket.assignee.fullname;
        })()}
      />

      {/* QA Assignment — hidden from clients */}
      {!isClient && (
        <SelectWithLabel
          label="QA Assignee"
          name="qaId"
          icon="UserPlus"
          iconColor="var(--accent-secondary)"
          control={control}
          showSearch
          disabled={!canUpdate || isDisbaledMode || isClient}
          onChange={(val: any) => {
            setValue("qaId", val, {
              shouldDirty: true,
            });
          }}
          options={[
            {
              value: "",
              label: "Unassigned",
              icon: <CustomIcon name="UserPlus" size={14} />,
            },
            ...qaList.map((qaUser) => ({
              value: qaUser.id,
              label: qaUser.fullname,
              sublabel: qaUser.teamNames?.length
                ? qaUser.teamNames.join(", ")
                : undefined,
              image: qaUser.image,
            })),
            // Always include the current QA so it shows even when they are not
            // in the fetched project-members list.
            ...(displayTicket?.qa?.id &&
              !qaList.some((q) => q.id === displayTicket.qa.id)
              ? [
                {
                  value: displayTicket.qa.id,
                  label: displayTicket.qa.fullname,
                  image: displayTicket.qa.image,
                },
              ]
              : []),
          ]}
          canAssign={canAssignQA}
          multiple={false}
          dummyLabel={(() => {
            if (!displayTicket?.qa?.id) return displayTicket?.qa?.fullname;
            const qa = qaList.find((q) => q.id === displayTicket.qa.id);
            return qa?.teamNames?.length
              ? `${qa.fullname} (${qa.teamNames.join(", ")})`
              : displayTicket.qa.fullname;
          })()}
        />
      )}

      {/* Labels */}
      <SelectWithLabel
        name="tags"
        label="Labels"
        options={LABELS}
        icon="Tag"
        iconColor="var(--accent-secondary)"
        control={control}
        disabled={!canUpdate || isDisbaledMode || isClient}
        onChange={(val: any) => {
          setValue("tags", val, {
            shouldDirty: true,
          });
        }}
        multiple={true}
        canAssign={canUpdate}
        dummyLabel={displayTicket?.tags?.join(", ")}
      />
    </>
  );
};

export default TicketAssignments;
