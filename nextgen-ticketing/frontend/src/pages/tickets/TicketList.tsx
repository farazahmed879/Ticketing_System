import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./TicketList.module.css";
import {
  RoleName,
  StatusName,
  PriorityName,
  UIMessages,
} from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import { format } from "date-fns";

import type { Ticket, TicketFormData } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomPagination from "../../components/CustomPagination";
import CustomDropdownMenu from "../../components/CustomDropdownMenu";
import CreateTicketModal from "./components/CreateTicketModal";
import StandardListLayout from "../../components/StandardListLayout";
import ConfirmationModal from "../../components/ConfirmationModal";

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Create Ticket Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Metadata for form
  const [priorities, setPriorities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  
  // Delete Ticket State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const navigate = useNavigate();
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [pRes, gRes, tRes, aRes] = await Promise.all([
          api.get(API_ROUTES.COMMON.PRIORITIES),
          api.get(API_ROUTES.COMMON.GROUPS),
          api.get(API_ROUTES.COMMON.TYPES),
          api.get(API_ROUTES.USERS.BASE, { params: { type: "agents" } }),
        ]);
        setPriorities(pRes.data.priorities);
        setProjects(gRes.data.groups);
        setTypes(tRes.data.types);
        setAgents(aRes.data.accounts);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };
    fetchMetadata();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get(API_ROUTES.TICKETS.BASE, {
        params: { search, status, page, limit: itemsPerPage },
      });
      setTickets(res.data.tickets);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [search, status, page, itemsPerPage]);

  const handleCreateTicket = async (data: TicketFormData) => {
    setIsLoading(true, UIMessages.LOADING.CREATING_TICKET);
    try {
      await api.post(API_ROUTES.TICKETS.BASE, {
        ...data,
        groupId: data.groupId || null,
        assigneeId: data.assigneeId || null,
      });
      setIsModalOpen(false);
      fetchTickets();
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
      fetchTickets();
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
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Tickets</h1>
            {(user?.role?.name === RoleName.ADMIN ||
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
          <div className={styles.filters}>
            <div
              className={styles.search}
              style={{ border: "none", background: "transparent", padding: 0 }}
            >
              <CustomInput
                placeholder="Search by subject or ID..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                icon={<CustomIcon name="Search" size={18} />}
                containerStyle={{ minWidth: "300px" }}
              />
            </div>
            <CustomSelect
              value={status}
              onChange={(val) => setStatus(val)}
              placeholder="All Statuses"
              options={[
                { value: "", label: "All Statuses" },
                { value: StatusName.NEW, label: StatusName.NEW },
                { value: StatusName.OPEN, label: StatusName.OPEN },
                { value: StatusName.IN_PROCESS, label: StatusName.IN_PROCESS },
                { value: StatusName.RESOLVED, label: StatusName.RESOLVED },
                { value: StatusName.CLOSED, label: StatusName.CLOSED },
              ]}
              style={{ minWidth: "180px" }}
            />
            <CustomButton
              variant="secondary"
              icon={
                <CustomIcon
                  name="Filter"
                  size={18}
                  color="var(--accent-primary)"
                />
              }
              style={{ padding: "0 16px" }}
            >
              More Filters
            </CustomButton>
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
                  #{t.uid}
                </span>
              ),
            },
            {
              header: "Subject",
              key: "subject",
              render: (t) => (
                <span style={{ fontWeight: 600 }}>{t.subject}</span>
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
                <CustomBadge
                  variant={
                    t.priority.name === PriorityName.HIGH ? "danger" : "neutral"
                  }
                >
                  {t.priority.name}
                </CustomBadge>
              ),
            },
            {
              header: "Assignee",
              key: "assignee",
              render: (t) => t.assignee?.fullname || "Unassigned",
            },
            {
              header: "Project",
              key: "group",
              render: (t) => t.group?.name || "-",
            },
            {
              header: "Created",
              key: "createdAt",
              render: (t) => format(new Date(t.createdAt), "MMM dd, yyyy"),
            },
            {
              header: "Due Date",
              key: "dueDate",
              render: (t) =>
                t.dueDate ? format(new Date(t.dueDate), "MMM dd, yyyy") : "-",
            },
            {
              header: "Actions",
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
                      ...(user?.role?.name === RoleName.ADMIN ? [{
                        label: "Delete Ticket",
                        icon: "Trash2",
                        onClick: () => {
                          setTicketToDelete(t.id);
                          setIsDeleteModalOpen(true);
                        },
                        danger: true,
                      }] : []),
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
