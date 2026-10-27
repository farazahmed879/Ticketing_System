/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import styles from "./TicketBoard.module.css";
import styles1 from "../TicketList.module.css";
import {
  PRIORITIES,
  TICKET_STATUSES,
  StatusName,
  TICKET_TYPES,
  UIMessages,
} from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import { socket } from "../../../services/socket";
import CustomSelect from "../../../components/CustomSelect";
import type { Column, Ticket, TicketFormData } from "../../../types";
import CustomButton from "../../../components/CustomButton";
import TicketDetailModal from "../ticket-details/ticket-details-modal";
import CreateTicketModal from "../components/CreateTicketModal";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { BoardSkeleton } from "../../../components/CustomSkeleton/CustomSkeleton";
import ColumnStatus from "./ColumnStatus";
import { useScrollSnap } from "./useScrollSnap";
import StandardListLayout from "../../../components/StandardListLayout";
import ListAndKanbanSwitcher from "../components/ListAndKanbanSwitcher";
import {
  handleStatusChange,
  visibleStatusesForUser,
} from "../shared/ticketDecisions";
import { ROLE_TYPE } from "../../roles/roleConstants";

const TicketBoard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [columns, setColumns] = useState<Column[]>([]);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [selectedStatusNames, setSelectedStatusNames] = useState<string[]>([]);
  const [selectedPriorityNames, setSelectedPriorityNames] = useState<string[]>(
    [],
  );
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [myTicketsOnly, setMyTicketsOnly] = useState(false);

  // Advanced filters dropdown (draft → Apply)
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [draftAgents, setDraftAgents] = useState<string[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftPriorities, setDraftPriorities] = useState<string[]>([]);
  const [draftProjects, setDraftProjects] = useState<string[]>([]);
  const [draftCustomers, setDraftCustomers] = useState<string[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const priorities = PRIORITIES;
  const types = TICKET_TYPES;
  const { trackRef, canScrollLeft, canScrollRight, scrollByColumn } =
    useScrollSnap();

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

  // const hasActiveFilters =
  //   myTicketsOnly ||
  //   selectedAgentIds.length > 0 ||
  //   selectedStatusNames.length > 0 ||
  //   selectedPriorityNames.length > 0 ||
  //   selectedProjectIds.length > 0 ||
  //   selectedCustomerIds.length > 0;

  const activeMoreFilters = [
    selectedAgentIds,
    selectedStatusNames,
    selectedPriorityNames,
    selectedProjectIds,
    selectedCustomerIds,
  ].filter((arr) => arr.length > 0).length;

  const draftSelectedCount =
    draftAgents.length +
    draftStatuses.length +
    draftPriorities.length +
    draftProjects.length +
    draftCustomers.length;

  const toggleMoreFilters = () => {
    if (showMoreFilters) {
      setShowMoreFilters(false);
    } else {
      setDraftAgents(selectedAgentIds);
      setDraftStatuses(selectedStatusNames);
      setDraftPriorities(selectedPriorityNames);
      setDraftProjects(selectedProjectIds);
      setDraftCustomers(selectedCustomerIds);
      setShowMoreFilters(true);
    }
  };

  const applyMoreFilters = () => {
    setSelectedAgentIds(draftAgents);
    setSelectedStatusNames(draftStatuses);
    setSelectedPriorityNames(draftPriorities);
    setSelectedProjectIds(draftProjects);
    setSelectedCustomerIds(draftCustomers);
    setShowMoreFilters(false);
  };

  const clearMoreFilters = () => {
    setSelectedAgentIds([]);
    setSelectedStatusNames([]);
    setSelectedPriorityNames([]);
    setSelectedProjectIds([]);
    setSelectedCustomerIds([]);
    setDraftAgents([]);
    setDraftStatuses([]);
    setDraftPriorities([]);
    setDraftProjects([]);
    setDraftCustomers([]);
    setShowMoreFilters(false);
  };

  // const handleResetFilters = () => {
  //   setMyTicketsOnly(false);
  //   setSelectedAgentIds([]);
  //   setSelectedStatusNames([]);
  //   setSelectedPriorityNames([]);
  //   setSelectedProjectIds([]);
  //   setSelectedCustomerIds([]);
  //   setDraftAgents([]);
  //   setDraftStatuses([]);
  //   setDraftPriorities([]);
  //   setDraftProjects([]);
  //   setDraftCustomers([]);
  //   setShowMoreFilters(false);
  // };

  const getStatuses = () => visibleStatusesForUser(user);

  const { data: metadata } = useQuery({
    queryKey: ["ticket-board-metadata", user?.id],
    queryFn: async () => {
      const [usersRes, groupsRes] = await Promise.all([
        api.get(API_ROUTES.USERS.GET_BY_ROLES, {
          params: {
            roles: [
              ROLE_TYPE.AGENT,
              ROLE_TYPE.CUSTOMER,
              ROLE_TYPE.EMPLOYEE,
              ROLE_TYPE.ADMIN,
              ROLE_TYPE.QA,
            ],
            limit: -1,
          },
        }),
        api.get(API_ROUTES.PROJECTS.BASE, {
          params: {
            role: user?.role?.name,
            userId: user?.id,
          },
        }),
      ]);
      return {
        accounts: usersRes.data.accounts,
        projects: groupsRes.data.projects,
      };
    },
    enabled: !!user,
  });

  const agents =
    metadata?.accounts?.filter(
      (u: any) => u.role.roleType === ROLE_TYPE.EMPLOYEE,
    ) || [];
  const qaList =
    metadata?.accounts?.filter((u: any) => u.role.roleType === ROLE_TYPE.QA) ||
    [];
  const customers =
    metadata?.accounts?.filter(
      (u: any) => u.role.roleType === ROLE_TYPE.CUSTOMER,
    ) || [];
  const projects = metadata?.projects || [];

  const { data: boardData, isLoading: loading } = useQuery({
    queryKey: [
      "tickets",
      "board",
      user?.id,
      {
        myTicketsOnly,
        selectedAgentIds,
        selectedStatusNames,
        selectedPriorityNames,
        selectedProjectIds,
        selectedCustomerIds,
      },
    ],
    queryFn: async () => {
      const ticketsRes = await api.get(API_ROUTES.TICKETS.BASE, {
        params: {
          limit: -1,
          myTickets: myTicketsOnly ? "true" : undefined,
          status:
            selectedStatusNames.length > 0
              ? selectedStatusNames.join(",")
              : undefined,
          assignee:
            selectedAgentIds.length > 0
              ? selectedAgentIds.join(",")
              : undefined,
          priority:
            selectedPriorityNames.length > 0
              ? selectedPriorityNames.join(",")
              : undefined,
          project:
            selectedProjectIds.length > 0
              ? selectedProjectIds.join(",")
              : undefined,
          owner:
            selectedCustomerIds.length > 0
              ? selectedCustomerIds.join(",")
              : undefined,
        },
      });
      return ticketsRes.data.tickets;
    },
    // Always fetch fresh tickets when the board is opened so changes made
    // elsewhere show up without a manual page refresh (the global 5-minute
    // staleTime would otherwise serve cached data on navigation).
    refetchOnMount: "always",
    staleTime: 0,
  });

  useEffect(() => {
    if (!boardData) return;
    const allTickets = boardData;
    const allStatuses = getStatuses();

    // console.log("allStatuses:", allStatuses);

    // const coveredIds = new Set(allStatuses.map((s: any) => s.id));
    // const extraStatuses = TICKET_STATUSES.filter(
    //   (s: any) =>
    //     !coveredIds.has(s.id) &&
    //     s.name !== StatusName.TRASH &&
    //     allTickets.some((t: Ticket) => t.status.id === s.id),
    // );

    const orderedStatuses = [...allStatuses].sort(
      (a: any, b: any) => (a.order ?? 0) - (b.order ?? 0),
    );

    // console.log("Ordered Statuses:", orderedStatuses);

    const boardColumns: Column[] = orderedStatuses.map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      tickets:
        user?.role?.roleType == ROLE_TYPE.CUSTOMER &&
        s.name == StatusName.IN_PROCESS
          ? allTickets.filter(
              (t: Ticket) =>
                t.status.id === s.id || t.status.name == StatusName.RESOLVED,
            )
          : allTickets.filter((t: Ticket) => t.status.id === s.id),
    }));
    console.log("boardColumns:", boardColumns);
    setColumns(boardColumns);
  }, [boardData, user]);

  const openTicketDetail = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const isAllowedToUpdatedTheTicketStatus = (
    ticket: Ticket,
    targetStatusName: string,
  ) => {
    // Admins, managers and the ticket's team lead assign via the modal — moving
    // a ticket to Assigned/Open opens the detail modal so an assignee is picked.
    const isLeadOfTicket = !!ticket?.teamLeadIds?.includes(user?.id ?? "");
    if (
      (user?.role?.roleType === ROLE_TYPE.ADMIN ||
        user?.role.roleType === ROLE_TYPE.AGENT ||
        isLeadOfTicket) &&
      targetStatusName === StatusName.OPEN
    ) {
      showNotification(
        "warning",
        `Please assign this ticket to a team member before moving it to "${targetStatusName}".`,
      );
      openTicketDetail(ticket);
      return false;
    }
    return true;
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
    if (!ticket) return;

    const currentStatusName = currentColumn?.name || ticket?.status?.name || "";

    if (currentStatusName == targetStatusName) return;

    // For QA the board is locked except the Approved column.
    if (
      user?.role?.roleType === ROLE_TYPE.QA &&
      targetStatusName !== StatusName.APPROVED
    ) {
      showNotification("error", UIMessages.BOARD.PERMISSION_DENIED);
      return;
    }

    if (!isAllowedToUpdatedTheTicketStatus(ticket, targetStatusName)) return;

    

    handleUpdateStatus({
      ticketId,
      statusId,
      currentStatusName,
      targetStatusName,
      assigneeId: ticket.assignee?.id || null, // Ensure assigneeId is sent for the "Open" status check
      teamLeadIds: ticket?.teamLeadIds || [], // Ensure teamLeadIds is sent for the "Open" status check
      ownerId: ticket.owner?.id,
    });
  };

  const handleUpdateStatus = (body: any) =>
    handleStatusChange(body, user, {
      showNotification,
      setIsLoading,
      // Close the detail modal after a successful save (harmless for the
      // drag-drop path, where the modal is already closed) and refresh.
      onSuccess: () => {
        setIsDetailModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
    });

  const handleDragStart = (e: React.DragEvent, ticketId: string) => {
    e.dataTransfer.setData("ticketId", ticketId);
  };

  const createMutation = useMutation({
    mutationFn: async (data: TicketFormData) => {
      return api.post(API_ROUTES.TICKETS.BASE, {
        ...data,
        projectId: data.projectId || null,
        assigneeId: data.assigneeId || null,
      });
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.CREATING_TICKET),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsCreateModalOpen(false);
      showNotification("success", "Ticket created successfully!");
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to create ticket",
      );
    },
  });

  const handleCreateTicket = async (data: TicketFormData) => {
    createMutation.mutate(data);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.TICKETS.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.DELETING),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      showNotification("success", "Ticket deleted successfully!");
      setIsDeleteModalOpen(false);
      setTicketToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete ticket",
      );
    },
  });

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    deleteMutation.mutate(ticketToDelete);
  };

  const KanbanFilter = () => {
    return (
      <div className={styles1.filters}>
        <ListAndKanbanSwitcher navigate={navigate} selectedValue="board" />
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
        />

        <CustomButton
          variant={myTicketsOnly ? "gradient" : "outline"}
          size="sm"
          onClick={() => setMyTicketsOnly((prev) => !prev)}
          icon={<CustomIcon name="User" size={18} />}
        >
          My Tickets
        </CustomButton>

        <div className={styles1.filterAnchor}>
          <CustomButton
            variant={
              showMoreFilters || activeMoreFilters > 0 ? "primary" : "secondary"
            }
            onClick={toggleMoreFilters}
            icon={<CustomIcon name="SlidersHorizontal" size={18} />}
          >
            Filters
            {activeMoreFilters > 0 && (
              <span
                style={{
                  marginLeft: 8,
                  background: "rgba(255,255,255,0.25)",
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  minWidth: 18,
                  textAlign: "center",
                  padding: "1px 6px",
                }}
              >
                {activeMoreFilters}
              </span>
            )}
            <CustomIcon
              name={showMoreFilters ? "ChevronUp" : "ChevronDown"}
              size={16}
              style={{ marginLeft: 6 }}
            />
          </CustomButton>

          {showMoreFilters && (
            <div className={styles1.advancedPanel}>
              <div className={styles1.filterField}>
                <span className={styles1.filterLabel}>
                  <CustomIcon name="CircleDot" size={12} /> Status
                </span>
                <CustomSelect
                  isMulti
                  value={draftStatuses}
                  onChange={(vals) => setDraftStatuses(vals)}
                  placeholder="All Statuses"
                  options={TICKET_STATUSES.map((op) => ({
                    label: op.name,
                    value: op.name,
                  }))}
                  style={{ width: "100%" }}
                />
              </div>

              {user?.role?.roleType !== ROLE_TYPE.CUSTOMER &&
                user?.role?.roleType !== ROLE_TYPE.EMPLOYEE && (
                  <div className={styles1.filterField}>
                    <span className={styles1.filterLabel}>
                      <CustomIcon name="User" size={12} /> Developers
                    </span>
                    <CustomSelect
                      isMulti
                      value={draftAgents}
                      onChange={(vals) => setDraftAgents(vals)}
                      placeholder="All Developers"
                      options={agents.map(
                        (a: { id: any; fullname: any; image: any }) => ({
                          value: a.id,
                          label: a.fullname,
                          image: a.image,
                        }),
                      )}
                      style={{ width: "100%" }}
                    />
                  </div>
                )}

              <div className={styles1.filterField}>
                <span className={styles1.filterLabel}>
                  <CustomIcon name="Flag" size={12} /> Priority
                </span>
                <CustomSelect
                  isMulti
                  value={draftPriorities}
                  onChange={(vals) => setDraftPriorities(vals)}
                  placeholder="All Priorities"
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
                  style={{ width: "100%" }}
                />
              </div>

              <div className={styles1.filterField}>
                <span className={styles1.filterLabel}>
                  <CustomIcon name="FolderKanban" size={12} /> Project
                </span>
                <CustomSelect
                  isMulti
                  value={draftProjects}
                  onChange={(vals) => setDraftProjects(vals)}
                  placeholder="All Projects"
                  options={projects.map((p: any) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  style={{ width: "100%" }}
                />
              </div>

              {user?.role?.roleType !== ROLE_TYPE.CUSTOMER && (
                <div className={styles1.filterField}>
                  <span className={styles1.filterLabel}>
                    <CustomIcon name="UserCheck" size={12} /> Client
                  </span>
                  <CustomSelect
                    isMulti
                    value={draftCustomers}
                    onChange={(vals) => setDraftCustomers(vals)}
                    placeholder="All Clients"
                    options={customers.map((c: any) => ({
                      value: c.id,
                      label: c.fullname,
                      image: c.image,
                    }))}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <div className={styles1.filterActions}>
                {(draftSelectedCount > 0 || activeMoreFilters > 0) && (
                  <CustomButton
                    variant="ghost"
                    onClick={clearMoreFilters}
                    icon={<CustomIcon name="X" size={16} />}
                  >
                    Clear all
                  </CustomButton>
                )}
                <CustomButton
                  variant="gradient"
                  onClick={applyMoreFilters}
                  icon={<CustomIcon name="Check" size={16} />}
                >
                  Apply Filters
                </CustomButton>
              </div>
            </div>
          )}
        </div>

        {/* {hasActiveFilters && (
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  icon={<CustomIcon name="RotateCcw" size={16} />}
                  style={{ minHeight: 48, borderRadius: 12 }}
                >
                  Reset
                </CustomButton>
              )} */}
      </div>
    );
  };

  useEffect(() => {
    // Listen for real-time updates
    socket.on("ticket:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    });

    return () => {
      socket.off("ticket:updated");
    };
  }, [queryClient]);

  return (
    <div className={styles.boardContainer}>
      {loading ? (
        <BoardSkeleton />
      ) : (
        <StandardListLayout
          header={
            <div className={styles.header}>
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                  Ticketing Board
                </h1>
              </div>
              {(user?.role?.roleType === ROLE_TYPE.ADMIN ||
                user?.role?.permissions?.tickets?.create) && (
                <CustomButton
                  variant="gradient"
                  icon={<CustomIcon name="Plus" size={20} />}
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create Ticket
                </CustomButton>
              )}
            </div>
          }
          filters={<KanbanFilter />}
        >
          <>
            <div
              className={styles.boardScroller}
              role="region"
              aria-label="Ticket board columns"
              aria-roledescription="carousel"
              onKeyDown={(e) => {
                // Don't hijack arrow keys when the user is editing a field
                // somewhere inside (or interacting with a select etc.).
                const target = e.target as HTMLElement;
                if (
                  target.closest("input, textarea, select, [contenteditable]")
                ) {
                  return;
                }
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  scrollByColumn(1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  scrollByColumn(-1);
                }
              }}
            >
              <button
                type="button"
                aria-label="Scroll columns left"
                onClick={() => scrollByColumn(-1)}
                className={`${styles.scrollAffordance} ${styles.left} ${
                  !canScrollLeft ? styles.disabled : ""
                }`}
                aria-disabled={!canScrollLeft}
                tabIndex={canScrollLeft ? 0 : -1}
                data-no-drag
              >
                <CustomIcon name="ChevronLeft" size={14} />
              </button>
              <div
                ref={trackRef}
                className={styles.kanbanBoard}
                aria-live="polite"
              >
                {columns.map((column) => {
                  const isCollapsed = collapsedColumns.includes(column.id);
                  // Team leads may approve their team's tickets, so don't
                  // render the Approved column as locked for them.
                  // QA only approves finished work — for them every column
                  // is locked except Approved.
                  const isStatusAllowed =
                    user?.role?.roleType === ROLE_TYPE.QA
                      ? column.name === StatusName.APPROVED
                      : user?.role?.roleType === ROLE_TYPE.ADMIN ||
                        user?.role?.permissions?.boardStatuses?.[column.id] ===
                          true ||
                        (!!user?.isLead &&
                          column.name === StatusName.APPROVED);

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
                      isStatusAllowed={isStatusAllowed}
                      setTicketToDelete={setTicketToDelete}
                      setIsDeleteModalOpen={setIsDeleteModalOpen}
                      showNotification={showNotification}
                      user={user}
                    />
                  );
                })}
              </div>
              <button
                type="button"
                aria-label="Scroll columns right"
                onClick={() => scrollByColumn(1)}
                className={`${styles.scrollAffordance} ${styles.right} ${
                  !canScrollRight ? styles.disabled : ""
                }`}
                aria-disabled={!canScrollRight}
                tabIndex={canScrollRight ? 0 : -1}
                data-no-drag
              >
                <CustomIcon name="ChevronRight" size={14} />
              </button>
            </div>
          </>
        </StandardListLayout>
      )}

      <TicketDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        ticket={selectedTicket}
        users={agents}
        qaList={qaList}
        priorities={priorities}
        onTicketUpdate={handleUpdateStatus}
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
