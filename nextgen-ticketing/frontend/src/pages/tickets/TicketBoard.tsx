import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import { format, formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import Modal from "../../components/Modal.tsx";
import { useNotification } from "../../context/NotificationContext";
import styles from "./TicketBoard.module.css";
import { RoleName, StatusName, UIMessages } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import { socket } from "../../services/socket";
import CustomSelect from "../../components/CustomSelect";
import type { Ticket } from "../../types";

interface Column {
  id: string;
  name: string;
  color: string;
  tickets: Ticket[];
}

const TicketBoard: React.FC = () => {
  const [columns, setColumns] = useState<Column[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [selectedPriorityNames, setSelectedPriorityNames] = useState<string[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [fullTicketData, setFullTicketData] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleStartChat = (userId: string) => {
    navigate(`/messages?userId=${userId}`);
  };

  const canAssign =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.assign;
  const canUpdatePriority =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.priority;
  const canCreateComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.create;
  const canViewComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.view;

  const toggleColumnCollapse = (columnId: string) => {
    setCollapsedColumns((prev) =>
      prev.includes(columnId)
        ? prev.filter((id) => id !== columnId)
        : [...prev, columnId],
    );
  };

  const openTicketDetail = async (ticket: any) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
    setFullTicketData(null); // Reset

    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(ticket.id));
      setFullTicketData(res.data.ticket);
    } catch (err) {
      console.error("Failed to fetch full ticket details", err);
      showNotification("error", "Failed to load full ticket details");
    }
  };

  const handleUpdatePriority = async (priorityId: string) => {
    if (!selectedTicket) return;
    try {
      setIsLoading(true);
      await api.put(API_ROUTES.TICKETS.BY_ID(selectedTicket.id), { priorityId });
      showNotification("success", "Priority updated successfully");

      const priority = priorities.find((p) => p.id === priorityId);
      const updated = { ...selectedTicket, priority };
      setSelectedTicket(updated);
      if (fullTicketData) setFullTicketData({ ...fullTicketData, priority });

      fetchBoardData();
    } catch (err) {
      console.error("Failed to update priority", err);
      showNotification("error", "Failed to update priority");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTicket = async (assigneeId: string) => {
    if (!selectedTicket) return;
    try {
      setIsLoading(true);
      await api.put(API_ROUTES.TICKETS.BY_ID(selectedTicket.id), { assigneeId });
      showNotification("success", "Ticket assigned successfully");

      // Update local state
      const agent = agents.find((a) => a.id === assigneeId);
      const updated = { ...selectedTicket, assignee: agent || null };
      setSelectedTicket(updated);
      if (fullTicketData)
        setFullTicketData({ ...fullTicketData, assignee: agent || null });

      fetchBoardData();
    } catch (err) {
      console.error("Failed to assign ticket", err);
      showNotification("error", "Failed to assign ticket");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTicket) return;

    try {
      setIsLoading(true);
      await api.post(API_ROUTES.TICKETS.COMMENTS(selectedTicket.id), {
        comment: newComment,
        authorId: user?.id,
        ticketId: selectedTicket.id,
      });
      setNewComment("");

      // Refresh full ticket data to show new comment
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(selectedTicket.id));
      setFullTicketData(res.data.ticket);
      showNotification("success", "Comment added");
    } catch (err) {
      console.error("Failed to add comment", err);
      showNotification("error", "Failed to add comment");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBoardData = useCallback(async () => {
    try {
      const [ticketsRes, statusRes, agentsRes, priorityRes] = await Promise.all(
        [
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
            },
          }),
          api.get(API_ROUTES.COMMON.STATUSES),
          api.get(API_ROUTES.USERS.BASE, { params: { type: "agents", limit: -1 } }),
          api.get(API_ROUTES.COMMON.PRIORITIES),
        ],
      );

      const allTickets = ticketsRes.data.tickets;
      const allStatuses = statusRes.data.statuses;
      setAgents(agentsRes.data.accounts);
      setPriorities(priorityRes.data.priorities);

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
      setIsLoading(false);
    }
  }, [selectedAgentIds, selectedPriorityNames, showNotification, setIsLoading]);

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
    const canUpdate =
      user?.role?.name === RoleName.ADMIN ||
      user?.role?.permissions?.tickets?.update ||
      isOwner;

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

    if (!canUpdate) {
      showNotification("error", UIMessages.BOARD.PERMISSION_DENIED);
      return;
    }

    if (!isStatusAllowed) {
      showNotification(
        "error",
        UIMessages.BOARD.ACCESS_DENIED(targetColumn?.name || "this status"),
      );
      return;
    }

    try {
      setIsLoading(true);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticketId), { statusId });
      showNotification("success", "Ticket status updated");
      fetchBoardData();
    } catch (err) {
      console.error("Failed to update status", err);
      showNotification("error", "Failed to update ticket status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const togglePriority = (name: string) => {
    setSelectedPriorityNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  return (
    <div className={styles.boardContainer}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h1>Ticketing Board</h1>
          <p>Drag and drop tickets to manage workflow</p>
        </div>

        <div className={styles.filterGroup}>
          {/* Agent Filter Custom Dropdown */}
          <div className={styles.customDropdown}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsAgentOpen(!isAgentOpen)}
            >
              <div className={styles.triggerContent}>
                <CustomIcon name="User" size={18} />
                <span>
                  {selectedAgentIds.length === 0
                    ? "All Agents"
                    : selectedAgentIds.length === 1
                      ? agents.find((a) => a.id === selectedAgentIds[0])
                          ?.fullname
                      : `${selectedAgentIds.length} Agents Selected`}
                </span>
              </div>
              <CustomIcon
                name="ChevronRight"
                size={16}
                style={{
                  transform: isAgentOpen ? "rotate(90deg)" : "rotate(0)",
                  transition: "0.2s",
                }}
              />
            </button>

            {isAgentOpen && (
              <>
                <div
                  className={styles.dropdownOverlay}
                  onClick={() => setIsAgentOpen(false)}
                />
                <div className={styles.dropdownMenu}>
                  <div
                    className={`${styles.dropdownItem} ${selectedAgentIds.length === 0 ? styles.activeItem : ""}`}
                    onClick={() => setSelectedAgentIds([])}
                  >
                    <CustomIcon name="User" size={16} />
                    <span>All Agents</span>
                    {selectedAgentIds.length === 0 && (
                      <CustomIcon name="Check" size={14} className={styles.checkIcon} />
                    )}
                  </div>
                  <div className={styles.divider} />
                  {agents.map((agent) => {
                    const isSelected = selectedAgentIds.includes(agent.id);
                    return (
                      <div
                        key={agent.id}
                        className={`${styles.dropdownItem} ${isSelected ? styles.activeItem : ""}`}
                        onClick={() => toggleAgent(agent.id)}
                      >
                        {agent.image ? (
                          <img
                            src={agent.image}
                            alt=""
                            className={styles.filterAvatar}
                          />
                        ) : (
                          <div className={styles.filterInitials}>
                            {agent.fullname.charAt(0)}
                          </div>
                        )}
                        <span>{agent.fullname}</span>
                        {isSelected && (
                          <CustomIcon name="Check" size={14} className={styles.checkIcon} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Priority Filter Custom Dropdown */}
          <div className={styles.customDropdown}>
            <button
              className={styles.dropdownTrigger}
              onClick={() => setIsPriorityOpen(!isPriorityOpen)}
            >
              <div className={styles.triggerContent}>
                <CustomIcon name="Layers" size={18} />
                <span>
                  {selectedPriorityNames.length === 0
                    ? "All Priorities"
                    : selectedPriorityNames.length === 1
                      ? selectedPriorityNames[0]
                      : `${selectedPriorityNames.length} Selected`}
                </span>
              </div>
              <CustomIcon
                name="ChevronRight"
                size={16}
                style={{
                  transform: isPriorityOpen ? "rotate(90deg)" : "rotate(0)",
                  transition: "0.2s",
                }}
              />
            </button>

            {isPriorityOpen && (
              <>
                <div
                  className={styles.dropdownOverlay}
                  onClick={() => setIsPriorityOpen(false)}
                />
                <div className={styles.dropdownMenu}>
                  <div
                    className={`${styles.dropdownItem} ${selectedPriorityNames.length === 0 ? styles.activeItem : ""}`}
                    onClick={() => setSelectedPriorityNames([])}
                  >
                    <CustomIcon name="Layers" size={16} />
                    <span>All Priorities</span>
                    {selectedPriorityNames.length === 0 && (
                      <CustomIcon name="Check" size={14} className={styles.checkIcon} />
                    )}
                  </div>
                  <div className={styles.divider} />
                  {priorities.map((priority) => {
                    const isSelected = selectedPriorityNames.includes(
                      priority.name,
                    );
                    return (
                      <div
                        key={priority.id}
                        className={`${styles.dropdownItem} ${isSelected ? styles.activeItem : ""}`}
                        onClick={() => togglePriority(priority.name)}
                      >
                        <div
                          className={styles.priorityDot}
                          style={{ background: priority.color }}
                        ></div>
                        <span>{priority.name}</span>
                        {isSelected && (
                          <CustomIcon name="Check" size={14} className={styles.checkIcon} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.boardLoading}>Loading Workflow...</div>
      ) : (
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
                      className={`${styles.card} ${isCollapsed ? styles.miniCard : "glass-card"}`}
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
                          <span className={styles.miniUid}>#{ticket.uid}</span>
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
      )}

      {/* Ticket Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        maxWidth="950px"
        title={
          selectedTicket
            ? `Ticket #${selectedTicket.uid}: ${selectedTicket.subject}`
            : "Ticket Details"
        }
      >
        {selectedTicket && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr",
              gap: 30,
              padding: "10px 0",
              maxHeight: "80vh",
            }}
          >
            {/* Left Column: Details */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 24,
                overflowY: "auto",
                paddingRight: 10,
              }}
            >
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
                  <span
                    className="badge"
                    style={{
                      background: `${selectedTicket.status.color}15`,
                      color: selectedTicket.status.color,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    <CustomIcon name="Clock" size={16} /> {selectedTicket.status.name}
                  </span>
                  {canUpdatePriority ? (
                    <CustomSelect
                      options={priorities.map((p) => ({
                        value: p.id,
                        label: p.name,
                        icon: <CustomIcon name="Tag" size={14} color={p.color} />,
                      }))}
                      value={selectedTicket.priority.id}
                      onChange={handleUpdatePriority}
                      style={{
                        minWidth: 140,
                        height: 32,
                        fontSize: "0.8rem",
                      }}
                    />
                  ) : (
                    <span
                      className="badge"
                      style={{
                        background: `${selectedTicket.priority.color}15`,
                        color: selectedTicket.priority.color,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      <CustomIcon name="Tag" size={16} /> {selectedTicket.priority.name}
                    </span>
                  )}
                  <span
                    className="badge"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    <CustomIcon name="Calendar" size={16} />{" "}
                    {format(new Date(selectedTicket.createdAt), "MMM dd, yyyy")}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate(`/tickets/${selectedTicket.id}`);
                    }}
                    className="glass-card"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      fontSize: "0.85rem",
                      color: "var(--accent-primary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      border: "1px solid var(--accent-primary)30",
                    }}
                  >
                    <CustomIcon name="Maximize2" size={16} />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <label
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CustomIcon name="Info" size={16} color="var(--accent-primary)" /> Description
                </label>
                <div
                  className="glass-card"
                  style={{
                    padding: 16,
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 12,
                  }}
                >
                  {selectedTicket.issue}
                </div>
              </div>

              {/* Reporter and Assignment Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                {/* Reporter */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CustomIcon name="User" size={18} color="var(--accent-primary)" /> Reporter
                  </label>
                  <div
                    className="glass-card"
                    style={{
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 64,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid var(--border-glass)",
                      borderRadius: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(124, 58, 237, 0.1)",
                        color: "var(--accent-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "1rem",
                        flexShrink: 0,
                      }}
                    >
                      {selectedTicket.owner.fullname.charAt(0)}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {selectedTicket.owner.fullname}
                        {selectedTicket.owner.id !== user?.id &&
                          (selectedTicket.status.name.toLowerCase() ===
                            StatusName.OPEN.toLowerCase() ||
                            selectedTicket.status.name.toLowerCase() ===
                              StatusName.CANCELLED.toLowerCase()) && (
                            <button
                              onClick={() =>
                                handleStartChat(selectedTicket.owner.id)
                              }
                              style={{
                                background: "transparent",
                                color: "var(--accent-primary)",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                              }}
                              title="Chat with Reporter"
                            >
                              <CustomIcon name="MessageSquare" size={14} />
                            </button>
                          )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {fullTicketData?.owner?.title || "Staff Member"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  <label
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CustomIcon name="UserPlus" size={18} color="var(--accent-secondary)" />{" "}
                    Assignee
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {canAssign && (
                      <CustomSelect
                        options={[
                          {
                            value: "",
                            label: "Unassigned",
                            icon: <CustomIcon name="UserPlus" size={14} />,
                          },
                          ...agents.map((agent) => ({
                            value: agent.id,
                            label: agent.fullname,
                            image: agent.image,
                          })),
                        ]}
                        value={selectedTicket.assignee?.id || ""}
                        onChange={handleAssignTicket}
                        disabled={!canAssign}
                        placeholder="Assign ticket..."
                      />
                    )}

                    {!canAssign && (
                      <div
                        className="glass-card"
                        style={{
                          padding: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minHeight: 64,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-glass)",
                          borderRadius: 12,
                        }}
                      >
                        {selectedTicket.assignee ? (
                          <>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "rgba(6, 182, 212, 0.1)",
                                color: "var(--accent-secondary)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "1rem",
                                flexShrink: 0,
                              }}
                            >
                              {selectedTicket.assignee.fullname.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "0.85rem",
                                  color: "var(--text-primary)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                {selectedTicket.assignee.fullname}
                                {selectedTicket.assignee.id !== user?.id && (
                                  <button
                                    onClick={() =>
                                      handleStartChat(
                                        selectedTicket.assignee.id,
                                      )
                                    }
                                    style={{
                                      background: "transparent",
                                      color: "var(--accent-secondary)",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                    title="Chat with Assignee"
                                  >
                                    <CustomIcon name="MessageSquare" size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                              fontStyle: "italic",
                            }}
                          >
                            Unassigned
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Comments */}
            {canViewComments && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  borderLeft: "1px solid var(--border-glass)",
                  paddingLeft: 24,
                  maxHeight: "100%",
                }}
              >
                <label
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <CustomIcon name="MessageCircle" size={20} color="var(--accent-primary)" />
                  Comments{" "}
                  {fullTicketData?.comments?.length
                    ? `(${fullTicketData.comments.length})`
                    : ""}
                </label>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    flex: 1,
                    minHeight: 0,
                  }}
                >
                  {fullTicketData ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                          flex: 1,
                          maxHeight: "450px",
                          overflowY: "auto",
                          paddingRight: 8,
                        }}
                      >
                        {fullTicketData.comments?.length > 0 ? (
                          fullTicketData.comments.map((comment: any) => (
                            <div
                              key={comment.id}
                              className="glass-card"
                              style={{
                                padding: 12,
                                background:
                                  comment.authorId === user?.id
                                    ? "rgba(33, 150, 243, 0.05)"
                                    : "rgba(255,255,255,0.02)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  marginBottom: 6,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.8rem",
                                    color: "var(--accent-primary)",
                                  }}
                                >
                                  {comment.author.fullname}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {formatDistanceToNow(
                                    new Date(comment.createdAt),
                                    { addSuffix: true },
                                  )}
                                </span>
                              </div>
                              <div
                                style={{ fontSize: "0.85rem", lineHeight: 1.5 }}
                              >
                                {comment.comment}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "40px 20px",
                              color: "var(--text-muted)",
                              fontSize: "0.9rem",
                              border: "1px dashed var(--border-glass)",
                              borderRadius: 12,
                            }}
                          >
                            No comments yet.
                          </div>
                        )}
                      </div>

                      {canCreateComments && (
                        <form
                          onSubmit={handleAddComment}
                          style={{
                            display: "flex",
                            gap: 10,
                            marginTop: "auto",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid var(--border-glass)",
                              color: "var(--text-primary)",
                              fontSize: "0.9rem",
                            }}
                          />
                          <button
                            type="submit"
                            className="bg-gradient"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                            }}
                            disabled={!newComment.trim()}
                          >
                            <CustomIcon name="Send" size={18} />
                          </button>
                        </form>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Loading comments...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TicketBoard;
