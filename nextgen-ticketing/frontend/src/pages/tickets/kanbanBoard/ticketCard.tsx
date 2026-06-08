import { format, parseISO, isBefore, startOfDay } from "date-fns";
import CustomDropdownMenu from "../../../components/CustomDropdownMenu";
import CustomIcon from "../../../components/CustomIcon";
import { RoleName } from "../../../utils/constants";

const TicketCard = ({
  ticket,
  setTicketToDelete,
  setIsDeleteModalOpen,
  user,
  showNotification,
  styles,
}: any) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          className={styles.cardPriority}
          style={{
            background: `${ticket.priority.color}20`,
            color: ticket.priority.color,
          }}
        >
          {ticket.priority.name}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <CustomDropdownMenu
            items={[
              {
                label: "Copy Ticket ID",
                icon: "Hash",
                onClick: () => {
                  navigator.clipboard.writeText(String(ticket.uid));
                  showNotification("success", "Ticket ID copied");
                },
              },
              {
                label: "Copy Ticket URL",
                icon: "Link",
                onClick: () => {
                  const url = `${window.location.origin}/tickets/${ticket.id}`;
                  navigator.clipboard.writeText(url);
                  showNotification("success", "Ticket URL copied");
                },
              },
              ...(user?.role?.name === RoleName.ADMIN
                ? [
                    {
                      label: "Delete Ticket",
                      icon: "Trash2",
                      onClick: () => {
                        setTicketToDelete(ticket.id);
                        setIsDeleteModalOpen(true);
                      },
                      danger: true,
                    },
                  ]
                : []),
            ]}
            triggerSize={16}
          />
        </div>
      </div>
      <div className={styles.cardUid}>#{ticket.uid}</div>
      <div className={styles.cardSubject}>{ticket.subject}</div>

      <div className={styles.cardMeta}>
        {ticket.project && (
          <div className={styles.metaItem} title="Project">
            <CustomIcon name="FolderKanban" size={12} />
            <span>{ticket.project.name}</span>
          </div>
        )}
        {ticket.dueDate && (
          <div
            className={styles.metaItem}
            title="Due Date"
            style={
              isBefore(startOfDay(parseISO(ticket.dueDate)), startOfDay(new Date()))
                ? { color: "var(--error-color, #ef4444)", fontWeight: "bold" }
                : {}
            }
          >
            <CustomIcon name="Calendar" size={12} />
            <span>Due: {format(parseISO(ticket.dueDate), "MMM dd")}</span>
          </div>
        )}
        <div
          className={styles.metaItem}
          title={`Created ${format(new Date(ticket.createdAt), "MMM dd, yyyy")}`}
        >
          <CustomIcon name="Clock" size={12} />
          <span>Created: {format(new Date(ticket.createdAt), "MMM dd")}</span>
        </div>
        {ticket.updatedAt && ticket.updatedAt !== ticket.createdAt && (
          <div
            className={styles.metaItem}
            title={`Last updated ${format(new Date(ticket.updatedAt), "MMM dd, yyyy")}`}
          >
            <CustomIcon name="RefreshCw" size={12} />
            <span>Updated: {format(new Date(ticket.updatedAt), "MMM dd")}</span>
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.owner}>
          <div className={styles.miniAvatar}>
            {ticket.owner.fullname.charAt(0)}
          </div>
          <span>{ticket.owner.fullname.split(" ")[0]}</span>
        </div>

        {ticket.assignee && (
          <div
            className={styles.assignee}
            title={`Assigned to ${ticket.assignee.fullname}`}
          >
            <CustomIcon
              name="UserPlus"
              size={14}
              color="var(--accent-secondary)"
            />
            <span>{ticket.assignee.fullname.split(" ")[0]}</span>
          </div>
        )}
      </div>
    </>
  );
};
export default TicketCard;
