import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import styles from "./TicketBoard.module.css";
import styles1 from "../TicketList.module.css";
import { RoleName, StatusName, UIMessages } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import { socket } from "../../../services/socket";
import CustomSelect from "../../../components/CustomSelect";
import type { Column, Ticket, TicketFormData } from "../../../types";
import CustomButton from "../../../components/CustomButton";
import TicketDetailModal from "../components/TicketDetailModal";
import CreateTicketModal from "../components/CreateTicketModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { BoardSkeleton } from "../../../components/CustomSkeleton/CustomSkeleton";
import ColumnStatus from "./ColumnStatus";
import StandardListLayout from "../../../components/StandardListLayout";
import ListAndKanbanSwitcher from "../components/ListAndKanbanSwitcher";

const TicketBoard: React.FC = () => {
  const navigate = useNavigate();
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
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

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

  const hasActiveFilters =
    selectedAgentIds.length > 0 ||
    selectedPriorityNames.length > 0 ||
    selectedProjectIds.length > 0 ||
    selectedCustomerIds.length > 0;

  const handleResetFilters = () => {
    setSelectedAgentIds([]);
    setSelectedPriorityNames([]);
    setSelectedProjectIds([]);
    setSelectedCustomerIds([]);
  };

  const fetchBoardData = useCallback(async () => {
    try {
      const [
        ticketsRes,
        statusRes,
        usersRes,
        priorityRes,
        groupsRes,
        typesRes,
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
        api.get(API_ROUTES.USERS.GET_BY_ROLES, {
          params: {
            roles: [
              RoleName.AGENT,
              RoleName.CUSTOMER,
              RoleName.EMPLOYEE,
              RoleName.ADMIN,
            ],
            limit: -1,
          },
        }),
        api.get(API_ROUTES.COMMON.PRIORITIES),
        api.get(API_ROUTES.PROJECTS.BASE, {
          params: {
            role: user?.role?.name,
            userId: user?.id,
          },
        }),
        api.get(API_ROUTES.COMMON.TYPES),
      ]);

      const allTickets = ticketsRes.data.tickets;
      const allStatuses = statusRes.data.statuses;
      const allAccounts = usersRes.data.accounts;

      // Map agents (Staff) and customers separately
      setAgents(
        allAccounts.filter(
          (u: any) =>
            u.role.name === RoleName.AGENT ||
            u.role.name === RoleName.EMPLOYEE ||
            u.role.name === RoleName.HR,
        ),
      );
      setCustomers(
        allAccounts.filter((u: any) => u.role.name === RoleName.CUSTOMER),
      );

      setPriorities(priorityRes.data.priorities);
      setProjects(groupsRes.data.projects);
      setTypes(typesRes.data.types);

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

  const handleDrop = async (
    e: React.DragEvent,
    statusId: string,
    targetStatusName: string,
  ) => {
    const ticketId = e.dataTransfer.getData("ticketId");
    if (!ticketId) return;

    let ticket: Ticket | undefined;
    let currentColumn: any;
    for (const col of columns) {
      ticket = col.tickets.find((t) => t.id === ticketId);
      if (ticket) {
        currentColumn = col;
        break;
      }
    }

    const currentStatusName = currentColumn?.name || ticket?.status?.name || "";

    if (currentStatusName == targetStatusName) return;

    // Catch dragging an unassigned ticket OUT of a "starting" column
    // (New / Unassigned) and INTO any non-terminal working column.
    // Terminal moves (Cancelled / Failed) are still allowed without assignee.
    // Movement between other columns is unrestricted regardless of assignee.
    const startingNames = ["new", "unassigned"];
    const terminalNames = ["cancelled", "failed"];
    const currentIsStarting = startingNames.includes(
      currentStatusName.toLowerCase(),
    );
    const targetIsStarting = startingNames.includes(
      targetStatusName.toLowerCase(),
    );
    const targetIsTerminal = terminalNames.includes(
      targetStatusName.toLowerCase(),
    );
    if (
      ticket &&
      !ticket.assignee?.id &&
      currentIsStarting &&
      !targetIsStarting &&
      !targetIsTerminal
    ) {
      showNotification(
        "warning",
        `Please assign this ticket to a team member before moving it to "${targetStatusName}".`,
      );
      openTicketDetail(ticket);
      return;
    }

    // const isOwner = ticket?.owner?.id === user?.id;
    // const canUpdate =
    //   user?.role?.name === RoleName.ADMIN ||
    //   user?.role?.permissions?.tickets?.update ||
    //   isOwner;

    // const isBasicAction =
    //   statusName.toLowerCase() === StatusName.OPEN.toLowerCase() ||
    //   statusName.toLowerCase() === StatusName.TRASH.toLowerCase() ||
    //   statusName.toLowerCase() === StatusName.FAILED.toLowerCase();

    const isStatusAllowed =
      user?.role?.name === RoleName.ADMIN ||
      user?.role?.permissions?.boardStatuses?.[statusId] === true;

    // if (!canUpdate) {
    //   showNotification("error", UIMessages.BOARD.PERMISSION_DENIED);
    //   return;
    // }

    if (!isStatusAllowed) {
      showNotification(
        "error",
        UIMessages.BOARD.ACCESS_DENIED(targetStatusName || "this status"),
      );
      return;
    }

    handleUpdateStatus(ticketId, statusId, currentStatusName, targetStatusName);
  };

  const handleUpdateStatus = async (
    ticketId: string,
    statusId: string,
    currentStatusName: string,
    targetStatusName: string,
  ) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_STATUS);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticketId), {
        statusId,
        currentStatusName,
        targetStatusName,
      });
      showNotification("success", "Ticket status updated");
      fetchBoardData();
    } catch (err: any) {
      console.error("Failed to update status", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update ticket status",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const handleCreateTicket = async (data: TicketFormData) => {
    setIsLoading(true, UIMessages.LOADING.CREATING_TICKET);
    try {
      await api.post(API_ROUTES.TICKETS.BASE, {
        ...data,
        projectId: data.projectId || null,
        assigneeId: data.assigneeId || null,
      });
      setIsCreateModalOpen(false);
      fetchBoardData();
      showNotification("success", "Ticket created successfully!");
    } catch (err: any) {
      console.error("Failed to create ticket", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to create ticket",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TICKETS.BY_ID(ticketToDelete));
      showNotification("success", "Ticket deleted successfully!");
      setIsDeleteModalOpen(false);
      setTicketToDelete(null);
      fetchBoardData();
    } catch (err: any) {
      console.error("Failed to delete ticket", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete ticket",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  return (
    <div className={styles.boardContainer}>
      {loading ? (
        <BoardSkeleton />
      ) : (
        <StandardListLayout
          header={
            <div className={styles.header}>
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <CustomButton
                  variant="ghost"
                  onClick={() => navigate("/tickets")}
                  icon={<CustomIcon name="ArrowLeft" size={20} />}
                  style={{
                    width: 40,
                    height: 40,
                    padding: 0,
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-glass)",
                  }}
                />
                <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
                  Ticketing Board
                </h1>
              </div>
              {(user?.role?.name === RoleName.ADMIN ||
                user?.role?.permissions?.tickets?.create) && (
                <CustomButton
                  variant="gradient"
                  size="sm"
                  icon={<CustomIcon name="Plus" size={18} />}
                  onClick={() => setIsCreateModalOpen(true)}
                  style={{ minHeight: 48, borderRadius: 12 }}
                >
                  Create Ticket
                </CustomButton>
              )}
            </div>
          }
          filters={
            <div className={styles1.filters}>
              <ListAndKanbanSwitcher
                navigate={navigate}
                selectedValue="board"
              />
              <CustomButton
                variant="outline"
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
              />

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

                {hasActiveFilters && (
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    icon={<CustomIcon name="RotateCcw" size={16} />}
                    style={{ minHeight: 48, borderRadius: 12 }}
                  >
                    Reset
                  </CustomButton>
                )}
              </div>
            </div>
          }
        >
          <>
            <div className={styles.kanbanBoard}>
              {columns.map((column) => {
                const isCollapsed = collapsedColumns.includes(column.id);
                const isStatusAllowed =
                  user?.role?.name === RoleName.ADMIN ||
                  user?.role?.permissions?.boardStatuses?.[column.id] === true;

                return (
                  <ColumnStatus
                    key={column.id}
                    column={column}
                    handleDragStart={handleDragStart}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    toggleColumnCollapse={toggleColumnCollapse}
                    openTicketDetail={openTicketDetail}
                    isCollapsed={isCollapsed}
                    isStatusAllowed={
                      column?.name === StatusName.OPEN ? false : isStatusAllowed
                    }
                    setTicketToDelete={setTicketToDelete}
                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                    showNotification={showNotification}
                    user={user}
                  />
                );
              })}
            </div>
          </>
        </StandardListLayout>
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

      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        priorities={priorities}
        projects={projects}
        types={types}
        agents={agents}
        user={user}
        onSubmit={handleCreateTicket}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTicketToDelete(null);
        }}
        onConfirm={handleDeleteTicket}
        title="Delete Ticket"
        message="Are you sure you want to delete this ticket? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default TicketBoard;
