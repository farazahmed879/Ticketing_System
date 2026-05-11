import CustomIcon from "../../../components/CustomIcon";
import { isToday, isTomorrow, parseISO } from "date-fns";
import styles from "./TicketBoard.module.css";
import TicketCard from "./ticketCard";
import { StatusName } from "../../../utils/constants";

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

  return (
    <div
      key={column.id}
      className={`${styles.column} ${isCollapsed ? styles.columnCollapsed : ""} ${!isStatusAllowed ? styles.columnDisabled : ""}`}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, column.id)}
    >
      {!isStatusAllowed && !isCollapsed && (
        <CustomIcon name="Lock" className={styles.bgLockIcon} />
      )}
      <div className={styles.columnHeader}>
        <div className={styles.statusInfo}>
          <div
            className={styles.statusDot}
            style={{ background: column.color }}
          ></div>
          <h3>{column.name}</h3>
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
              handleCheckTomorrow(ticket) ? "due-tomorrow-card" : ""
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

      {isCollapsed && (
        <div className={styles.collapsedActions}>
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
    </div>
  );
};
export default ColumnStatus;
