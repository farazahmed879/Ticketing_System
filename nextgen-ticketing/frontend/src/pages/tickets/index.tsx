import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./TicketList.module.css";
import { TICKET_STATUSES, UIMessages } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import { format, isBefore, startOfDay } from "date-fns";

import type { Ticket, TicketFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import CustomDropdownMenu from "../../components/CustomDropdownMenu";
import Highlight from "../../components/Highlight";
import CreateTicketModal from "./components/CreateTicketModal";
import StandardListLayout from "../../components/StandardListLayout";
import ConfirmationModal from "../../components/ConfirmationModal";
import ListAndKanbanSwitcher from "./components/ListAndKanbanSwitcher";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import { truncateString } from "../../utils/helpers";
import { ROLE_TYPE } from "../roles/roleConstants";

const TicketList: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Advanced ("More") filters — each supports multiple selections.
  // Applied values drive the fetch; draft values are edited in the panel and
  // committed via the "Apply Filters" button.
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [statusNames, setStatusNames] = useState<string[]>([]);
  const [priorityNames, setPriorityNames] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);

  const [draftStatuses, setDraftStatuses] = useState<string[]>([]);
  const [draftPriorities, setDraftPriorities] = useState<string[]>([]);
  const [draftProjects, setDraftProjects] = useState<string[]>([]);
  const [draftAssignees, setDraftAssignees] = useState<string[]>([]);
  const [draftClients, setDraftClients] = useState<string[]>([]);

  const activeMoreFilters = [
    statusNames,
    priorityNames,
    projectIds,
    assigneeIds,
    ownerIds,
  ].filter((arr) => arr.length > 0).length;
  const draftSelectedCount =
    draftStatuses.length +
    draftPriorities.length +
    draftProjects.length +
    draftAssignees.length +
    draftClients.length;

  // Create Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete Ticket State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const isCustomer = user?.role?.roleType === ROLE_TYPE.CUSTOMER;

  const { data: metadata } = useQuery({
    queryKey: ["ticket-metadata", user?.id],
    queryFn: async () => {
      const [pRes, gRes, tRes, aRes, cRes] = await Promise.all([
        api.get(API_ROUTES.COMMON.PRIORITIES),
        api.get(API_ROUTES.PROJECTS.BASE, {
          params: { role: user?.role?.name, userId: user?.id },
        }),
        api.get(API_ROUTES.COMMON.TYPES),
        api.get(API_ROUTES.USERS.BASE, { params: { type: "employees" } }),
        api.get(API_ROUTES.USERS.BASE, { params: { type: "clients" } }),
      ]);
      return {
        priorities: pRes.data.priorities,
        projects: gRes.data.projects,
        types: tRes.data.types,
        agents: aRes.data.accounts,
        clients: cRes.data.accounts,
      };
    },
    enabled: !!user,
  });

  const priorities = metadata?.priorities || [];
  const projects = metadata?.projects || [];
  const types = metadata?.types || [];
  const agents = metadata?.agents || [];
  const clients = metadata?.clients || [];

  const { data: ticketData, isLoading: loading } = useQuery({
    queryKey: [
      "tickets",
      {
        search,
        status: statusNames,
        priority: priorityNames,
        project: projectIds,
        assignee: assigneeIds,
        owner: ownerIds,
        page,
        limit: itemsPerPage,
      },
    ],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TICKETS.BASE, {
        params: {
          search,
          status: statusNames.length ? statusNames.join(",") : undefined,
          priority: priorityNames.length ? priorityNames.join(",") : undefined,
          project: projectIds.length ? projectIds.join(",") : undefined,
          assignee: assigneeIds.length ? assigneeIds.join(",") : undefined,
          owner: ownerIds.length ? ownerIds.join(",") : undefined,
          page,
          limit: itemsPerPage,
        },
      });
      return res.data;
    },
  });

  const tickets: Ticket[] = ticketData?.tickets || [];
  const totalCount = ticketData?.totalCount || 0;

  const toggleMoreFilters = () => {
    if (showMoreFilters) {
      setShowMoreFilters(false);
    } else {
      // Seed the draft from the currently-applied filters when opening.
      setDraftStatuses(statusNames);
      setDraftPriorities(priorityNames);
      setDraftProjects(projectIds);
      setDraftAssignees(assigneeIds);
      setDraftClients(ownerIds);
      setShowMoreFilters(true);
    }
  };

  const applyMoreFilters = () => {
    setStatusNames(draftStatuses);
    setPriorityNames(draftPriorities);
    setProjectIds(draftProjects);
    setAssigneeIds(draftAssignees);
    setOwnerIds(draftClients);
    setPage(0);
    setShowMoreFilters(false);
  };

  const clearMoreFilters = () => {
    setDraftStatuses([]);
    setDraftPriorities([]);
    setDraftProjects([]);
    setDraftAssignees([]);
    setDraftClients([]);
    setStatusNames([]);
    setPriorityNames([]);
    setProjectIds([]);
    setAssigneeIds([]);
    setOwnerIds([]);
    setPage(0);
    setShowMoreFilters(false);
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
      setIsModalOpen(false);
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

  return (
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
                Tickets
              </h1>
            </div>
            {(user?.role?.roleType === ROLE_TYPE.ADMIN ||
              user?.role?.permissions?.tickets?.create) && (
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={() => setIsModalOpen(true)}
              >
                Create Ticket
              </CustomButton>
            )}
          </div>
        }
        filters={
          <div className={styles.filterBar}>
            <div className={styles.filters}>
              <ListAndKanbanSwitcher navigate={navigate} selectedValue="list" />
              <div
                className={styles.search}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                }}
              >
                <CustomInput
                  placeholder="Search by subject or ID..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  icon={<CustomIcon name="Search" size={18} />}
                  containerStyle={{ width: "100%", paddingLeft: "0px" }}
                />
              </div>
              <div className={styles.filterAnchor}>
                <CustomButton
                  variant={
                    showMoreFilters || activeMoreFilters > 0
                      ? "primary"
                      : "secondary"
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
                  <div className={styles.advancedPanel}>
                    <div className={styles.filterField}>
                      <span className={styles.filterLabel}>
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

                    <div className={styles.filterField}>
                      <span className={styles.filterLabel}>
                        <CustomIcon name="Flag" size={12} /> Priority
                      </span>
                      <CustomSelect
                        isMulti
                        value={draftPriorities}
                        onChange={(vals) => setDraftPriorities(vals)}
                        placeholder="All Priorities"
                        options={priorities.map((p: { name: any }) => ({
                          label: p.name,
                          value: p.name,
                        }))}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className={styles.filterField}>
                      <span className={styles.filterLabel}>
                        <CustomIcon name="FolderKanban" size={12} /> Project
                      </span>
                      <CustomSelect
                        isMulti
                        value={draftProjects}
                        onChange={(vals) => setDraftProjects(vals)}
                        placeholder="All Projects"
                        options={projects.map((p: { name: any; id: any }) => ({
                          label: p.name,
                          value: p.id,
                        }))}
                        style={{ width: "100%" }}
                      />
                    </div>

                    <div className={styles.filterField}>
                      <span className={styles.filterLabel}>
                        <CustomIcon name="UserPlus" size={12} /> Assignee
                      </span>
                      <CustomSelect
                        isMulti
                        value={draftAssignees}
                        onChange={(vals) => setDraftAssignees(vals)}
                        placeholder="All Assignees"
                        options={agents.map((a: any) => ({
                          label: a.fullname,
                          value: a.id,
                        }))}
                        style={{ width: "100%" }}
                      />
                    </div>

                    {!isCustomer && (
                      <div className={styles.filterField}>
                        <span className={styles.filterLabel}>
                          <CustomIcon name="UserCheck" size={12} /> Client
                        </span>
                        <CustomSelect
                          isMulti
                          value={draftClients}
                          onChange={(vals) => setDraftClients(vals)}
                          placeholder="All Clients"
                          options={clients.map(
                            (c: { fullname: any; id: any }) => ({
                              label: c.fullname,
                              value: c.id,
                            }),
                          )}
                          style={{ width: "100%" }}
                        />
                      </div>
                    )}

                    <div className={styles.filterActions}>
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
            </div>
          </div>
        }
        pagination={
          <CustomPagination
            currentPage={page}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            onPageChange={setPage}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setPage(0);
            }}
          />
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={[
            {
              header: "UID",
              key: "uid",
              render: (t) => (
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
                  #<Highlight text={String(t.uid)} query={search} />
                </span>
              ),
            },
            {
              header: "Title",
              key: "subject",
              render: (t) => (
                <div style={{ fontWeight: 600 }}>
                  <Highlight
                    text={truncateString(t.subject, 50)}
                    query={search}
                  />
                </div>
              ),
            },
            {
              header: "Project",
              key: "project",
              render: (t) => (
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: t.project?.name
                      ? "var(--text-secondary)"
                      : "var(--text-muted)",
                  }}
                >
                  {t.project?.name || "-"}
                </span>
              ),
            },
            {
              header: "Status",
              key: "status",
              render: (t) => (
                <CustomBadge color={t.status.color}>
                  {t.status.name}
                </CustomBadge>
              ),
            },
            {
              header: "Priority",
              key: "priority",
              render: (t) => (
                <CustomBadge color={t.priority.color}>
                  {t.priority.name}
                </CustomBadge>
              ),
            },
            {
              header: "Assignee",
              key: "assignee",
              render: (t) =>
                t.assignee ? (
                  <CustomAvatarStack
                    items={[
                      {
                        id: t.assignee.id,
                        name: t.assignee?.fullname,
                        image: t.assignee?.image,
                      },
                    ]}
                    limit={4}
                    size={28}
                  />
                ) : (
                  "N/A"
                ),
            },

            {
              header: "Created",
              key: "createdAt",
              render: (t) => format(new Date(t.createdAt), "MMM dd, yy"),
            },
            {
              header: "Due Date",
              key: "dueDate",
              render: (t) => {
                if (!t.dueDate) return "-";
                const isPassed = isBefore(
                  startOfDay(new Date(t.dueDate)),
                  startOfDay(new Date()),
                );
                return (
                  <span
                    style={
                      isPassed
                        ? {
                            color: "var(--error-color, #ef4444)",
                            fontWeight: 600,
                          }
                        : {}
                    }
                  >
                    {format(new Date(t.dueDate), "MMM dd, yy")}
                  </span>
                );
              },
            },
            {
              header: "",
              key: "actions",
              render: (t) => (
                <div onClick={(e) => e.stopPropagation()}>
                  <CustomDropdownMenu
                    items={[
                      {
                        label: "Copy Ticket ID",
                        icon: "Hash",
                        onClick: () => {
                          navigator.clipboard.writeText(String(t.uid));
                          showNotification("success", "Ticket ID copied");
                        },
                      },
                      {
                        label: "Copy Ticket URL",
                        icon: "Link",
                        onClick: () => {
                          const url = `${window.location.origin}/tickets/${t.id}`;
                          navigator.clipboard.writeText(url);
                          showNotification("success", "Ticket URL copied");
                        },
                      },
                      {
                        label: "Open Full Page",
                        icon: "ExternalLink",
                        onClick: () => {
                          navigate(`/tickets/${t.id}`);
                        },
                      },
                      ...(user?.role?.roleType === ROLE_TYPE.ADMIN
                        ? [
                            {
                              label: "Delete",
                              icon: "Trash2",
                              onClick: () => {
                                setTicketToDelete(t.id);
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
              ),
            },
          ]}
          data={tickets}
          loading={loading}
          loadingMessage="Loading tickets..."
          emptyMessage="No tickets found"
          onRowClick={(t) => navigate(`/tickets/${t.id}`)}
          className="glass-card-hover"
        />
      </StandardListLayout>

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
    </>
  );
};

export default TicketList;
