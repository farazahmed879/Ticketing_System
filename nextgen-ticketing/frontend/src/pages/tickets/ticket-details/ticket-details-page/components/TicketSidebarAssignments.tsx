import CustomIcon from "../../../../../components/CustomIcon";
import SelectWithLabel from "../../../../../components/SelectWithLabel";
import styles from "../TicketDetail.module.css";
import tableStyles from "../../../../dashboard/Dashboard.module.css";
import { LABELS, RoleName } from "../../../../../utils/constants";
import type { TicketDetailSidebarProps } from "../../../../../types";

export const TicketSidebarAssignments = ({
  ticket,
  user,
  agents,
  qaList,
  canAssign,
  canAssignQA,
  sidebarDraft,
  onSidebarDraftChange,
}: Pick<
  TicketDetailSidebarProps,
  | "ticket"
  | "user"
  | "agents"
  | "qaList"
  | "canAssign"
  | "sidebarDraft"
  | "onSidebarDraftChange"
> & { canAssignQA: boolean }) => {
  return (
    <>
      <div className={styles.sidebarItem}>
        <span className={styles.sidebarLabel}>Owner</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            className={tableStyles.avatar}
            style={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomIcon name="User" size={16} />
          </div>
          <span style={{ fontSize: "0.9rem" }}>{ticket.owner.fullname}</span>
        </div>
      </div>

      <SelectWithLabel
        label="Assignee"
        name="assigneeId"
        icon="UserPlus"
        iconColor="var(--accent-secondary)"
        value={sidebarDraft.assigneeId}
        onChange={(val: any) => onSidebarDraftChange("assigneeId", val)}
        options={[
          {
            value: "",
            label: "Unassigned",
            icon: <CustomIcon name="UserPlus" size={14} />,
          },
          ...agents.map((agent: any) => ({
            value: agent.id,
            label: agent.teamNames?.length
              ? `${agent.fullname} (${agent.teamNames.join(", ")})`
              : agent.fullname,
            image: agent.image,
          })),
        ]}
        canAssign={canAssign}
        multiple={false}
        dummyLabel={(() => {
          if (!ticket?.assignee?.id) return "Unassigned";
          const agent = agents.find((a: any) => a.id === ticket.assignee?.id);
          return agent?.teamNames?.length
            ? `${ticket.assignee.fullname} (${agent.teamNames.join(", ")})`
            : ticket.assignee.fullname;
        })()}
      />

      {/* QA Assignee — hidden from clients */}
      {user?.role?.name !== RoleName.CUSTOMER && (
        <SelectWithLabel
          label="QA Assignee"
          name="qaId"
          icon="UserPlus"
          iconColor="var(--accent-secondary)"
          value={sidebarDraft.qaId}
          onChange={(val: any) => onSidebarDraftChange("qaId", val)}
          options={[
            {
              value: "",
              label: "Unassigned",
              icon: <CustomIcon name="UserPlus" size={14} />,
            },
            ...qaList.map((qaUser: any) => ({
              value: qaUser.id,
              label: qaUser.teamNames?.length
                ? `${qaUser.fullname} (${qaUser.teamNames.join(", ")})`
                : qaUser.fullname,
              image: qaUser.image,
            })),
          ]}
          canAssign={canAssignQA}
          multiple={false}
          dummyLabel={(() => {
            if (!ticket?.qa?.id) return "Unassigned";
            const qaUser = qaList.find((q: any) => q.id === ticket.qa?.id);
            return qaUser?.teamNames?.length
              ? `${ticket.qa.fullname} (${qaUser.teamNames.join(", ")})`
              : ticket.qa.fullname;
          })()}
        />
      )}

      <SelectWithLabel
        label="Labels"
        name="tags"
        icon="Tag"
        iconColor="var(--accent-secondary)"
        value={sidebarDraft.tags}
        onChange={(val: any) => onSidebarDraftChange("tags", val as any)}
        options={LABELS}
        canAssign={
          user?.role?.name === RoleName.ADMIN ||
          user?.role?.name === RoleName.AGENT ||
          ticket.assignee?.id === user?.id
        }
        multiple={true}
        dummyLabel={ticket.tags?.join(", ") || ""}
      />
    </>
  );
};
