import CustomIcon from "../../../components/CustomIcon";
import { isToday, isTomorrow, isBefore, startOfDay, parseISO } from "date-fns";
import styles from "./TicketBoard.module.css";
import TicketCard from "./ticketCard";
import { RoleName, StatusName } from "../../../utils/constants";
import { ROLE_TYPE } from "../../roles/roleConstants";

const ColumnStatus = ({
  column,
  handleDragStart,
  handleDragOver,
  handleDrop,
  toggleColumnCollapse,
  openTicketDetail,
  isCollapsed,
  isStatusAllowed,
  setTicketToDelete,
  setIsDeleteModalOpen,
  showNotification,
  user,
}: any) => {
  const handleCheckTomorrow = (ticket: any) => {
    return (
      ticket.dueDate &&
      [StatusName.IN_PROCESS, StatusName.NEW, StatusName.OPEN].includes(
        column.name,
      ) &&
      (isToday(parseISO(ticket.dueDate)) ||
        isTomorrow(parseISO(ticket.dueDate)))
    );
  };

  // Due date has passed (before today) — keep the ticket highlighted red until
  // it is Approved by the client (Closed / Cancelled are terminal too). Checks
  // the ticket's real status so it's correct regardless of how columns are
  // relabelled per role (e.g. Resolved shown as "Done"/"Resolved").
  const handleCheckOverdue = (ticket: any) => {
    const stopHighlightStatuses = [StatusName.CLOSED, StatusName.TRASH];
    return (
      ticket.dueDate &&
      !stopHighlightStatuses.includes(ticket.status?.name) &&
      isBefore(startOfDay(parseISO(ticket.dueDate)), startOfDay(new Date()))
    );
  };

  return (
    <div
      key={column.id}
      className={`${styles.column} ${isCollapsed ? styles.columnCollapsed : ""} ${!isStatusAllowed ? styles.columnDisabled : ""}`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, column.id, column.name)}
    >
      {!isStatusAllowed && !isCollapsed && (
        <CustomIcon name="Lock" className={styles.bgLockIcon} />
      )}
      <div className={styles.columnHeader}>
        {isCollapsed && (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              paddingBottom: "16px",
              borderBottom: "1px solid var(--border-glass)",
              width: "100%",
              marginBottom: "8px",
            }}
          >
            <span className={styles.count}>{column.tickets.length}</span>
            <button
              className={styles.columnToggle}
              onClick={() => toggleColumnCollapse(column.id)}
              title="Expand Column"
            >
              <CustomIcon name="ChevronRight" size={20} />
            </button>
          </div>
        )}
        <div
          className={styles.statusInfo}
          style={
            isCollapsed
              ? {
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }
              : {}
          }
        >
          <div
            className={styles.statusDot}
            style={{ background: column.color }}
          ></div>
          <h3>
            {user.role.roleType !== ROLE_TYPE.CUSTOMER &&
            column.name == StatusName.RESOLVED
              ? "Done"
              : column.name}
          </h3>
          {!isStatusAllowed && (
            <CustomIcon
              name="Lock"
              size={14}
              style={{ marginLeft: 8, color: "var(--text-muted)" }}
            />
          )}
        </div>
        {!isCollapsed && (
          <div className={styles.columnActions}>
            <span className={styles.count}>{column.tickets.length}</span>
            <button
              className={styles.columnToggle}
              onClick={() => toggleColumnCollapse(column.id)}
              title="Collapse Column"
            >
              <CustomIcon name="ChevronLeft" size={20} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.cardList}>
        {column.tickets.map((ticket: any) => (
          <div
            key={ticket.id}
            className={`${styles.card} ${isCollapsed ? styles.miniCard : "glass-card"} ${
              handleCheckOverdue(ticket)
                ? "overdue-card"
                : handleCheckTomorrow(ticket)
                  ? "due-tomorrow-card"
                  : ""
            }`}
            draggable={!isCollapsed}
            onDragStart={(e) => !isCollapsed && handleDragStart(e, ticket.id)}
            onClick={() => openTicketDetail(ticket)}
          >
            {isCollapsed ? (
              <div className={styles.miniCardContent} title={ticket.subject}>
                <div
                  className={styles.miniPriorityDot}
                  style={{ background: ticket.priority.color }}
                ></div>
                <span className={styles.miniUid}>#{ticket.uid}</span>
                {user?.role?.roleType !== ROLE_TYPE.CUSTOMER && (
                  <span
                    style={{ marginLeft: "auto", display: "inline-flex" }}
                    title={
                      ticket.qa
                        ? `QA assigned: ${ticket.qa.fullname}`
                        : "QA not assigned"
                    }
                  >
                    <CustomIcon
                      name={ticket.qa ? "ShieldCheck" : "ShieldOff"}
                      size={12}
                      color={
                        ticket.qa
                          ? "var(--accent-success, #10b981)"
                          : "var(--text-muted)"
                      }
                    />
                  </span>
                )}
              </div>
            ) : (
              <TicketCard
                ticket={ticket}
                setTicketToDelete={setTicketToDelete}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                user={user}
                showNotification={showNotification}
                styles={styles}
              />
            )}
          </div>
        ))}
        {column.tickets.length === 0 && !isCollapsed && (
          <div className={styles.emptyColumn}>No tickets</div>
        )}
      </div>
    </div>
  );
};
export default ColumnStatus;
