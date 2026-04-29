import React, { useEffect, useState, useCallback } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import styles from "./TicketBoard.module.css";
import { RoleName, StatusName, UIMessages } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import CustomSelect from "../../components/CustomSelect";
import type { Column, Ticket } from "../../types";
import { BoardSkeleton } from "../../components/CustomSkeleton";
import CustomButton from "../../components/CustomButton";
import TicketDetailModal from "./components/TicketDetailModal";
import { isTomorrow, isToday, parseISO, format } from "date-fns";

const TicketBoard: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [selectedPriorityNames, setSelectedPriorityNames] = useState<string[]>(
    [],
  );
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId],
    );
  };

  const toggleAllColumns = () => {
    if (collapsedColumns.length === columns.length) {
      setCollapsedColumns([]);
    } else {
      setCollapsedColumns(columns.map((col) => col.id));
    }
  };

  const fetchBoardData = useCallback(async () => {
    try {
      const [
        ticketsRes,
        statusRes,
        agentsRes,
        priorityRes,
        groupsRes,
        customersRes,
      ] = await Promise.all([
        api.get(API_ROUTES.TICKETS.BASE, {
          params: {
            limit: -1,
            assignee:
              selectedAgentIds.length > 0
                ? selectedAgentIds.join(",")
                : undefined,
            priority:
              selectedPriorityNames.length > 0
                ? selectedPriorityNames.join(",")
                : undefined,
            group:
              selectedProjectIds.length > 0
                ? selectedProjectIds.join(",")
                : undefined,
            owner:
              selectedCustomerIds.length > 0
                ? selectedCustomerIds.join(",")
                : undefined,
          },
        }),
        api.get(API_ROUTES.COMMON.STATUSES),
        api.get(API_ROUTES.USERS.BASE, {
          params: { type: "agents", limit: -1 },
        }),
        api.get(API_ROUTES.COMMON.PRIORITIES),
        api.get(API_ROUTES.COMMON.GROUPS, { params: { limit: -1 } }),
        api.get(API_ROUTES.USERS.BASE, {
          params: { type: "customers", limit: -1 },
        }),
      ]);

      const allTickets = ticketsRes.data.tickets;
      const allStatuses = statusRes.data.statuses;
      setAgents(agentsRes.data.accounts);
      setPriorities(priorityRes.data.priorities);
      setProjects(groupsRes.data.groups);
      setCustomers(customersRes.data.accounts);

      const boardColumns: Column[] = allStatuses.map((s: any) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        tickets: allTickets.filter((t: Ticket) => t.status.id === s.id),
      }));

      setColumns(boardColumns);
    } catch (err) {
      console.error("Failed to fetch board data", err);
      showNotification("error", UIMessages.BOARD.LOAD_FAILED);
    } finally {
      setLoading(false);
      setIsLoading(false, "");
    }
  }, [
    selectedAgentIds,
    selectedPriorityNames,
    selectedProjectIds,
    selectedCustomerIds,
    showNotification,
    setIsLoading,
  ]);

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  useEffect(() => {
    fetchBoardData();

    // Listen for real-time updates
    socket.on("ticket:updated", () => {
      fetchBoardData();
    });

    return () => {
      socket.off("ticket:updated");
    };
  }, [fetchBoardData]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, statusId: string) => {
    const ticketId = e.dataTransfer.getData("ticketId");
    if (!ticketId) return;

    let ticket: Ticket | undefined;
    for (const col of columns) {
      ticket = col.tickets.find((t) => t.id === ticketId);
      if (ticket) break;
    }

    const isOwner = ticket?.owner?.id === user?.id;
    // const canUpdate =
    //   user?.role?.name === RoleName.ADMIN ||
    //   user?.role?.permissions?.tickets?.update ||
    //   isOwner;

    const targetColumn = columns.find((c) => c.id === statusId);
    const statusName = targetColumn?.name.toLowerCase();
    const isBasicAction =
      statusName === StatusName.OPEN.toLowerCase() ||
      statusName === StatusName.CANCELLED.toLowerCase() ||
      statusName === StatusName.FAILED.toLowerCase();

    const isStatusAllowed =
      user?.role?.name === RoleName.ADMIN ||
      user?.role?.permissions?.boardStatuses?.[statusId] === true ||
      (isOwner && isBasicAction);

    // if (!canUpdate) {
    //   showNotification("error", UIMessages.BOARD.PERMISSION_DENIED);
    //   return;
    // }

    if (!isStatusAllowed) {
      showNotification(
        "error",
        UIMessages.BOARD.ACCESS_DENIED(targetColumn?.name || "this status"),
      );
      return;
    }

    handleUpdateStatus(ticketId, statusId);
  };

  const handleUpdateStatus = async (ticketId: string, statusId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_STATUS);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticketId), { statusId });
      showNotification("success", "Ticket status updated");
      fetchBoardData();
    } catch (err) {
      console.error("Failed to update status", err);
      showNotification("error", "Failed to update ticket status");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  return (
    <div className={styles.boardContainer}>
      {loading ? (
        <BoardSkeleton />
      ) : (
        <>
          <div className={styles.header}>
            <div className={styles.titleInfo}>
              <h1>Ticketing Board</h1>
              <p>Drag and drop tickets to manage workflow</p>
            </div>

            <div className={styles.headerActions}>
              <CustomButton
                variant="gradient"
                size="sm"
                onClick={toggleAllColumns}
                title={
                  collapsedColumns.length === columns.length
                    ? "Expand All"
                    : "Collapse All"
                }
                icon={
                  <CustomIcon
                    name={
                      collapsedColumns.length === columns.length
                        ? "Maximize2"
                        : "Minimize2"
                    }
                    size={18}
                  />
                }
                style={{ minHeight: 48, borderRadius: 12 }}
              >
                {collapsedColumns.length === columns.length
                  ? "Expand All"
                  : "Collapse All"}
              </CustomButton>

              <div className={styles.filterGroup}>
                <CustomSelect
                  isMulti
                  placeholder="Agents"
                  options={agents.map((a) => ({
                    value: a.id,
                    label: a.fullname,
                    image: a.image,
                  }))}
                  value={selectedAgentIds}
                  onChange={setSelectedAgentIds}
                  icon={<CustomIcon name="User" size={18} />}
                  style={{ width: 200 }}
                />

                <CustomSelect
                  isMulti
                  placeholder="Priorities"
                  options={priorities.map((p) => ({
                    value: p.name,
                    label: p.name,
                    icon: (
                      <div
                        className={styles.priorityDot}
                        style={{ background: p.color }}
                      ></div>
                    ),
                  }))}
                  value={selectedPriorityNames}
                  onChange={setSelectedPriorityNames}
                  icon={<CustomIcon name="Layers" size={18} />}
                  style={{ width: 200 }}
                />

                <CustomSelect
                  isMulti
                  placeholder="Projects"
                  options={projects.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  value={selectedProjectIds}
                  onChange={setSelectedProjectIds}
                  icon={<CustomIcon name="Users" size={18} />}
                  style={{ width: 200 }}
                />

                <CustomSelect
                  isMulti
                  placeholder="Customers"
                  options={customers.map((c) => ({
                    value: c.id,
                    label: c.fullname,
                    image: c.image,
                  }))}
                  value={selectedCustomerIds}
                  onChange={setSelectedCustomerIds}
                  icon={<CustomIcon name="UserCheck" size={18} />}
                  style={{ width: 200 }}
                />
              </div>
            </div>
          </div>

          <div className={styles.kanbanBoard}>
            {columns.map((column) => {
              const isCollapsed = collapsedColumns.includes(column.id);
              const isStatusAllowed =
                user?.role?.name === RoleName.ADMIN ||
                user?.role?.permissions?.boardStatuses?.[column.id] === true;

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
                        <span className={styles.count}>
                          {column.tickets.length}
                        </span>
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
                    {column.tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className={`${styles.card} ${isCollapsed ? styles.miniCard : "glass-card"} ${
                          ticket.dueDate &&
                          (isToday(parseISO(ticket.dueDate)) ||
                            isTomorrow(parseISO(ticket.dueDate)))
                            ? "due-tomorrow-card"
                            : ""
                        }`}
                        draggable={!isCollapsed}
                        onDragStart={(e) =>
                          !isCollapsed && handleDragStart(e, ticket.id)
                        }
                        onClick={() => openTicketDetail(ticket)}
                      >
                        {isCollapsed ? (
                          <div
                            className={styles.miniCardContent}
                            title={ticket.subject}
                          >
                            <div
                              className={styles.miniPriorityDot}
                              style={{ background: ticket.priority.color }}
                            ></div>
                            <span className={styles.miniUid}>
                              #{ticket.uid}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div
                              className={styles.cardPriority}
                              style={{
                                background: `${ticket.priority.color}20`,
                                color: ticket.priority.color,
                              }}
                            >
                              {ticket.priority.name}
                            </div>
                            <div className={styles.cardUid}>#{ticket.uid}</div>
                            <div className={styles.cardSubject}>
                              {ticket.subject}
                            </div>

                            <div className={styles.cardMeta}>
                              {ticket.group && (
                                <div
                                  className={styles.metaItem}
                                  title="Project"
                                >
                                  <CustomIcon name="Folder" size={12} />
                                  <span>{ticket.group.name}</span>
                                </div>
                              )}
                              {ticket.dueDate && (
                                <div
                                  className={styles.metaItem}
                                  title="Due Date"
                                >
                                  <CustomIcon name="Calendar" size={12} />
                                  <span>
                                    {format(parseISO(ticket.dueDate), "MMM dd")}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className={styles.cardFooter}>
                              <div className={styles.owner}>
                                <div className={styles.miniAvatar}>
                                  {ticket.owner.fullname.charAt(0)}
                                </div>
                                <span>
                                  {ticket.owner.fullname.split(" ")[0]}
                                </span>
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
                                  <span>
                                    {ticket.assignee.fullname.split(" ")[0]}
                                  </span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                    {column.tickets.length === 0 && !isCollapsed && (
                      <div className={styles.emptyColumn}>No tickets</div>
                    )}
                  </div>

                  {isCollapsed && (
                    <div className={styles.collapsedActions}>
                      <span className={styles.count}>
                        {column.tickets.length}
                      </span>
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
            })}
          </div>
        </>
      )}

      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        ticket={selectedTicket}
        agents={agents}
        priorities={priorities}
        columns={columns}
        onTicketUpdate={fetchBoardData}
      />
    </div>
  );
};

export default TicketBoard;
