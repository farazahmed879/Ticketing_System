import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import Modal from "../../components/Modal.tsx";
import CustomInput from "../../components/CustomInput";
import CustomTextArea from "../../components/CustomTextArea";
import CustomSelect from "../../components/CustomSelect";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./TicketList.module.css";
import { RoleName, StatusName, PriorityName } from "../../utils/constants";
import { API_ROUTES } from "../../utils/apiRoutes";
import { format } from "date-fns";

import type { Ticket } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";

const TicketList: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Create Ticket State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [issue, setIssue] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");

  // Metadata for form
  const [priorities, setPriorities] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const navigate = useNavigate();

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
        if (pRes.data.priorities.length > 0)
          setSelectedPriority(pRes.data.priorities[0].id);
        setGroups(gRes.data.groups);
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
        params: { search, status, page, limit: 10 },
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
    fetchTickets();
  }, [search, status, page]);

  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post(API_ROUTES.TICKETS.BASE, {
        subject,
        issue,
        priorityId: selectedPriority,
        groupId: selectedGroup || null,
        typeId: selectedType,
        assigneeId: selectedAssignee || null,
      });
      setIsModalOpen(false);
      setSubject("");
      setIssue("");
      fetchTickets();
      showNotification("success", "Ticket created successfully!");
    } catch (err: any) {
      console.error("Failed to create ticket", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to create ticket",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="animate-fade-in">
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

        <div className={styles.filters}>
          <div
            className={styles.search}
            style={{ border: "none", background: "transparent", padding: 0 }}
          >
            <CustomInput
              placeholder="Search by subject or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
            icon={<CustomIcon name="Filter" size={18} color="var(--accent-primary)" />}
            style={{ padding: "0 16px" }}
          >
            More Filters
          </CustomButton>
        </div>

        <CustomTable
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
                  variant={t.priority.name === PriorityName.HIGH ? 'danger' : 'neutral'}
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
              header: "Group",
              key: "group",
              render: (t) => t.group?.name || "-",
            },
            {
              header: "Date",
              key: "createdAt",
              render: (t) => format(new Date(t.createdAt), "MMM dd, yyyy"),
            },
          ]}
          data={tickets}
          loading={loading}
          loadingMessage="Loading tickets..."
          emptyMessage="No tickets found"
          onRowClick={(t) => navigate(`/tickets/${t.id}`)}
          className="glass-card-hover"
        />

        <div
          className="glass-card"
          style={{
            marginTop: -20,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.95rem",
                fontWeight: 500,
              }}
            >
              Showing {tickets.length} of {totalCount} tickets
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <CustomButton
                variant="secondary"
                size="sm"
                style={{ padding: 8, borderRadius: 10 }}
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                icon={<CustomIcon name="ChevronLeft" size={20} />}
              />
              <CustomButton
                variant="secondary"
                size="sm"
                style={{ padding: 8, borderRadius: 10 }}
                disabled={(page + 1) * 10 >= totalCount}
                onClick={() => setPage(page + 1)}
                icon={<CustomIcon name="ChevronRight" size={20} />}
              />
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Ticket"
      >
        <form
          onSubmit={handleCreateTicket}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <CustomInput
            label="Subject"
            placeholder="Brief summary of the issue"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <CustomSelect
              label="Group"
              value={selectedGroup}
              onChange={(val) => setSelectedGroup(val)}
              placeholder="No Group"
              options={[
                { value: "", label: "No Group" },
                ...groups.map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
            <CustomSelect
              label="Type"
              value={selectedType}
              onChange={(val) => setSelectedType(val)}
              placeholder="Select Type"
              options={types.map((t) => ({ value: t.id, label: t.name }))}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label
              style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}
            >
              Priority
            </label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {priorities.map((p) => (
                <label
                  key={p.id}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background:
                      selectedPriority === p.id
                        ? `${p.color}30`
                        : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedPriority === p.id ? p.color : "transparent"}`,
                    transition: "0.2s",
                  }}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.id}
                    checked={selectedPriority === p.id}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    style={{ display: "none" }}
                  />
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: p.color,
                    }}
                  ></div>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {p.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {(user?.role?.name === RoleName.ADMIN ||
            user?.role?.name === RoleName.AGENT) && (
            <CustomSelect
              label="Assign To (Optional)"
              value={selectedAssignee}
              onChange={(val) => setSelectedAssignee(val)}
              placeholder="Unassigned"
              options={[
                { value: "", label: "Unassigned" },
                ...agents.map((a) => ({ value: a.id, label: a.fullname })),
              ]}
            />
          )}

          <CustomTextArea
            label="Description"
            placeholder="Detailed explanation..."
            rows={5}
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            required
            style={{ resize: "none" }}
          />

          <CustomButton
            type="submit"
            variant="gradient"
            fullWidth
            style={{ marginTop: 10 }}
          >
            Create Ticket
          </CustomButton>
        </form>
      </Modal>
    </>
  );
};

export default TicketList;
