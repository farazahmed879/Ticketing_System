/* eslint-disable @typescript-eslint/no-explicit-any */
import CustomIcon from "../../../../../components/CustomIcon";
import SelectWithLabel from "../../../../../components/SelectWithLabel";
import { LABELS } from "../../../../../utils/constants";
import type { TicketDetailSidebarProps } from "../../../../../types";

/**
 * Renders the Assignee / QA / Labels editors — but only the ones the current
 * user can edit. Non-editable values (and the always read-only Owner) are shown
 * by TicketSidebarDetails as plain one-line rows instead of a box.
 */
export const TicketSidebarAssignments = ({
  ticket,
  agents,
  qaList,
  canAssign,
  canAssignQA,
  sidebarDraft,
  onSidebarDraftChange,
  labelsEditable,
}: Pick<
  TicketDetailSidebarProps,
  | "ticket"
  | "user"
  | "agents"
  | "qaList"
  | "canAssign"
  | "sidebarDraft"
  | "onSidebarDraftChange"
> & { canAssignQA: boolean; labelsEditable: boolean }) => {
  return (
    <>
      {canAssign && (
        <SelectWithLabel
          label="Assignee"
          name="assigneeId"
          icon="UserPlus"
          iconColor="var(--accent-secondary)"
          value={sidebarDraft.assigneeId}
          onChange={(val: string) => onSidebarDraftChange("assigneeId", val)}
          options={[
            {
              value: "",
              label: "Unassigned",
              icon: <CustomIcon name="UserPlus" size={14} />,
            },
            ...agents.map((agent) => ({
              value: agent.id,
              label: agent.fullname,
              sublabel: agent.teamNames?.length
                ? agent.teamNames.join(", ")
                : undefined,
              image: agent.image,
            })),
            // Always include the current assignee so it shows even when they
            // are not in the fetched project-members list.
            ...(ticket.assignee?.id &&
            !agents.some((a) => a.id === ticket.assignee?.id)
              ? [
                  {
                    value: ticket.assignee.id,
                    label: ticket.assignee.fullname,
                    image: ticket.assignee.image,
                  },
                ]
              : []),
          ]}
          canAssign={canAssign}
          multiple={false}
          dummyLabel={(() => {
            if (!ticket?.assignee?.id) return "Unassigned";
            const agent = agents.find((a) => a.id === ticket.assignee?.id);
            return agent?.teamNames?.length
              ? `${ticket.assignee.fullname} (${agent.teamNames.join(", ")})`
              : ticket.assignee.fullname;
          })()}
        />
      )}

      {canAssignQA && (
        <SelectWithLabel
          label="QA Assignee"
          name="qaId"
          icon="UserPlus"
          iconColor="var(--accent-secondary)"
          value={sidebarDraft.qaId}
          onChange={(val: string) => onSidebarDraftChange("qaId", val)}
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
            ...(ticket.qa?.id && !qaList.some((q) => q.id === ticket.qa?.id)
              ? [
                  {
                    value: ticket.qa.id,
                    label: ticket.qa.fullname,
                    image: ticket.qa.image,
                  },
                ]
              : []),
          ]}
          canAssign={canAssignQA}
          multiple={false}
          dummyLabel={(() => {
            if (!ticket?.qa?.id) return "Unassigned";
            const qaUser = qaList.find((q) => q.id === ticket.qa?.id);
            return qaUser?.teamNames?.length
              ? `${ticket.qa.fullname} (${qaUser.teamNames.join(", ")})`
              : ticket.qa.fullname;
          })()}
        />
      )}

      {labelsEditable && (
        <SelectWithLabel
          label="Labels"
          name="tags"
          icon="Tag"
          iconColor="var(--accent-secondary)"
          value={sidebarDraft.tags}
          onChange={(val: string[]) => onSidebarDraftChange("tags", val as any)}
          options={LABELS}
          canAssign={labelsEditable}
          multiple={true}
          dummyLabel={ticket.tags?.join(", ") || ""}
        />
      )}
    </>
  );
};
