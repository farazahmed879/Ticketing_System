import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./TicketDetail.module.css";
import tableStyles from "../dashboard/Dashboard.module.css";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import CustomSelect from "../../components/CustomSelect";
import { RoleName, StatusName, UIMessages } from "../../utils/constants";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomButton from "../../components/CustomButton";
import CustomTextArea from "../../components/CustomTextArea";
import CustomDatePicker from "../../components/CustomDatePicker";
import CustomBadge from "../../components/CustomBadge";
import CustomDropdownMenu from "../../components/CustomDropdownMenu";

import type { TicketDetail as ITicketDetail } from "../../types";

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments" | "history">(
    "comments",
  );
  const [newComment, setNewComment] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    type: "danger" | "warning";
  }>({
    title: "",
    message: "",
    type: "warning",
  });
  const { user } = useAuth();
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();

  const handleStartChat = (userId: string | undefined) => {
    navigate(`/messages?userId=${userId}`);
  };

  const canAssign =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.assign;
  const canUpdatePriority =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.priority;

  const fetchTicket = async () => {
    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(id!));
      setTicket(res.data.ticket);
    } catch (err) {
      console.error("Failed to fetch ticket", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await api.get(API_ROUTES.USERS.BASE, {
        params: { type: "agents", limit: -1 },
      });
      setAgents(res.data.accounts);
    } catch (err) {
      console.error("Failed to fetch agents", err);
    }
  };

  const fetchStatuses = async () => {
    try {
      const res = await api.get(API_ROUTES.COMMON.STATUSES);
      setStatuses(res.data.statuses);
    } catch (err) {
      console.error("Failed to fetch statuses", err);
    }
  };

  const fetchPriorities = async () => {
    try {
      const res = await api.get(API_ROUTES.COMMON.PRIORITIES);
      setPriorities(res.data.priorities);
    } catch (err) {
      console.error("Failed to fetch priorities", err);
    }
  };

  useEffect(() => {
    fetchTicket();
    if (canAssign) fetchAgents();
    fetchStatuses();
    fetchPriorities();
  }, [id, canAssign]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(id!), {
        comment: newComment,
        isNote,
      });
      setNewComment("");
      setIsNote(false);
      fetchTicket(); // Refresh ticket to show new comment
    } catch (err) {
      console.error("Failed to add comment", err);
    }
  };

  const handleAssign = async (assigneeId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.ASSIGNING_TICKET);
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { assigneeId });
      showNotification("success", "Ticket assigned successfully");
      fetchTicket();
    } catch (err) {
      console.error("Failed to assign ticket", err);
      showNotification("error", "Failed to assign ticket");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleUpdateStatus = async (statusId: string) => {
    if (!ticket) return;

    const isOwner = ticket.owner.id === user?.id;
    // const canUpdate =
    //   user?.role?.name === RoleName.ADMIN ||
    //   user?.role?.permissions?.tickets?.update ||
    //   isOwner;

    // Check if the target status is 'Open' or 'Cancelled' - common actions for owners
    const targetStatus = statuses.find((s) => s.id === statusId);
    const statusName = targetStatus?.name.toLowerCase();
    const isBasicAction =
      statusName === StatusName.OPEN.toLowerCase() ||
      statusName === StatusName.CANCELLED.toLowerCase() ||
      statusName === StatusName.FAILED.toLowerCase();

    const isStatusAllowed =
      user?.role?.name === RoleName.ADMIN ||
      user?.role?.permissions?.boardStatuses?.[statusId] === true ||
      (isOwner && isBasicAction);

    // if (!canUpdate) {
    //   showNotification(
    //     "error",
    //     "You do not have permission to update ticket status",
    //   );
    //   return;
    // }

    if (!isStatusAllowed) {
      showNotification(
        "error",
        `Access Denied: Your role is not allowed to move tickets to "${targetStatus?.name || "this status"}"`,
      );
      return;
    }

    if (
      statusName === StatusName.CANCELLED.toLowerCase() ||
      statusName === StatusName.FAILED.toLowerCase()
    ) {
      setPendingStatusId(statusId);
      setConfirmConfig({
        title:
          statusName === StatusName.CANCELLED.toLowerCase()
            ? "Cancel Ticket"
            : "Mark as Failed",
        message: `Are you sure you want to ${statusName} this ticket? This action may be final depending on your workflow.`,
        type: "danger",
      });
      setIsConfirmModalOpen(true);
      return;
    }

    executeStatusUpdate(statusId);
  };

  const executeStatusUpdate = async (statusId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_STATUS);
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { statusId });
      showNotification("success", "Ticket status updated");
      fetchTicket();
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

  const handleUpdatePriority = async (priorityId: string) => {
    if (!ticket) return;

    if (!canUpdatePriority) {
      showNotification(
        "error",
        "You do not have permission to change ticket priority",
      );
      return;
    }

    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_PRIORITY);
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { priorityId });
      showNotification("success", "Ticket priority updated");
      fetchTicket();
    } catch (err) {
      console.error("Failed to update priority", err);
      showNotification("error", "Failed to update ticket priority");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleUpdateDueDate = async (dueDate: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_DUE_DATE);
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), {
        dueDate: dueDate || null,
      });
      showNotification("success", "Due date updated successfully");
      fetchTicket();
    } catch (err) {
      console.error("Failed to update due date", err);
      showNotification("error", "Failed to update due date");
    } finally {
      setIsLoading(false, "");
    }
  };

  if (loading || !ticket)
    return (
      <div className={`${styles.container} animate-fade-in`}>
        {/* Left Column Skeleton */}
        <div>
          {/* Ticket Info Card */}
          <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: 120,
                    height: 14,
                    borderRadius: 8,
                    background: "var(--bg-skeleton)",
                    marginBottom: 12,
                  }}
                />
                <div
                  className="skeleton-pulse"
                  style={{
                    width: "70%",
                    height: 28,
                    borderRadius: 8,
                    background: "var(--bg-skeleton)",
                    marginBottom: 16,
                  }}
                />
              </div>
              <div
                className="skeleton-pulse"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--bg-skeleton)",
                }}
              />
            </div>
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
                marginBottom: 8,
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "90%",
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
                marginBottom: 8,
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "60%",
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
                marginBottom: 24,
              }}
            />
            <div style={{ display: "flex", gap: 12 }}>
              <div
                className="skeleton-pulse"
                style={{
                  width: 60,
                  height: 24,
                  borderRadius: 16,
                  background: "var(--bg-skeleton)",
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  width: 80,
                  height: 24,
                  borderRadius: 16,
                  background: "var(--bg-skeleton)",
                }}
              />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div
            style={{
              display: "flex",
              gap: 32,
              borderBottom: "1px solid var(--border-glass)",
              marginBottom: 24,
              paddingBottom: 12,
            }}
          >
            <div
              className="skeleton-pulse"
              style={{
                width: 120,
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: 80,
                height: 16,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>

          {/* Comments Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <div
                  className="skeleton-pulse"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "var(--bg-skeleton)",
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 12,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: 100,
                        height: 12,
                        borderRadius: 6,
                        background: "var(--bg-skeleton)",
                      }}
                    />
                    <div
                      className="skeleton-pulse"
                      style={{
                        width: 70,
                        height: 10,
                        borderRadius: 6,
                        background: "var(--bg-skeleton)",
                      }}
                    />
                  </div>
                  <div
                    className="skeleton-pulse"
                    style={{
                      width: "85%",
                      height: 14,
                      borderRadius: 6,
                      background: "var(--bg-skeleton)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Comment Input Skeleton */}
          <div className="glass-card" style={{ marginTop: 32, padding: 24 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 80,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
                marginBottom: 12,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="skeleton-pulse"
                style={{
                  width: 120,
                  height: 16,
                  borderRadius: 8,
                  background: "var(--bg-skeleton)",
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  width: 80,
                  height: 36,
                  borderRadius: 8,
                  background: "var(--bg-skeleton)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column (Sidebar) Skeleton */}
        <div
          className="glass-card"
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Status */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 60,
                height: 10,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
          {/* Priority */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 70,
                height: 10,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
          {/* Owner */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 50,
                height: 10,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                className="skeleton-pulse"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--bg-skeleton)",
                }}
              />
              <div
                className="skeleton-pulse"
                style={{
                  width: 120,
                  height: 14,
                  borderRadius: 6,
                  background: "var(--bg-skeleton)",
                }}
              />
            </div>
          </div>
          {/* Assignee */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 70,
                height: 10,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 40,
                borderRadius: 10,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              className="skeleton-pulse"
              style={{
                width: 60,
                height: 10,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "80%",
                height: 14,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "70%",
                height: 14,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "60%",
                height: 14,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "100%",
                height: 36,
                borderRadius: 8,
                background: "var(--bg-skeleton)",
              }}
            />
            <div
              className="skeleton-pulse"
              style={{
                width: "75%",
                height: 14,
                borderRadius: 6,
                background: "var(--bg-skeleton)",
              }}
            />
          </div>
        </div>
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate(-1)}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{ 
              width: 40, 
              height: 40, 
              padding: 0, 
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              Ticket Details
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: '0.9rem' }}>
              Manage and track ticket progress
            </p>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={`${styles.ticketInfo} glass-card`}>
            <div className={styles.ticketHeader}>
              <div>
                <span className={styles.uid}>Ticket #{ticket.uid}</span>
                <h1 className={styles.title}>{ticket.subject}</h1>
              </div>
              <CustomDropdownMenu
                items={[
                  {
                    label: "Copy Ticket ID",
                    icon: "Hash",
                    onClick: () => {
                      navigator.clipboard.writeText(String(ticket.uid));
                      showNotification(
                        "success",
                        "Ticket ID copied to clipboard",
                      );
                    },
                  },
                  {
                    label: "Copy Ticket URL",
                    icon: "Link",
                    onClick: () => {
                      navigator.clipboard.writeText(window.location.href);
                      showNotification(
                        "success",
                        "Ticket URL copied to clipboard",
                      );
                    },
                  },
                ]}
              />
            </div>

            <div className={styles.issue}>{ticket.issue}</div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              {ticket.tags.map((tag) => (
                <span
                  key={tag}
                  className="glass-card"
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.tabs}>
            <div
              className={`${styles.tab} ${activeTab === "comments" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("comments")}
            >
              Comments ({ticket.comments.length})
            </div>
            <div
              className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
            </div>
          </div>

          {activeTab === "comments" ? (
            <div className={styles.commentFeed}>
              {ticket.comments.map((comment) => (
                <div key={comment.id} className={styles.comment}>
                  <div
                    className={tableStyles.avatar}
                    style={{ width: 40, height: 40 }}
                  >
                    <CustomIcon name="User" size={20} />
                  </div>
                  <div
                    className={`${styles.commentContent} ${comment.isNote ? styles.isNote : ""}`}
                  >
                    {comment.isNote && (
                      <span className={styles.noteLabel}>Internal Note</span>
                    )}
                    <div className={styles.commentHeader}>
                      <span className={styles.authorName}>
                        {comment.author.fullname}
                      </span>
                      <span className={styles.time}>
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {comment.comment}
                    </div>
                  </div>
                </div>
              ))}

              <div className={`${styles.commentInput} glass-card`}>
                <form
                  onSubmit={handleAddComment}
                  className={styles.inputWrapper}
                >
                  <CustomTextArea
                    placeholder="Type your message here..."
                    rows={4}
                    value={newComment}
                    onChange={(e: any) => setNewComment(e.target.value)}
                    style={{ width: "100%", resize: "none" }}
                  />
                  <div className={styles.inputActions}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isNote}
                        onChange={(e) => setIsNote(e.target.checked)}
                      />
                      <CustomIcon name="Lock" size={14} />
                      Internal Note
                    </label>
                    <CustomButton
                      type="submit"
                      variant="gradient"
                      icon={<CustomIcon name="Send" size={16} />}
                    >
                      Send
                    </CustomButton>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.historyList}>
              {ticket.history.map((item) => (
                <div key={item.id} className={styles.historyItem}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {item.action}
                    </div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {item.description}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: 4,
                      }}
                    >
                      By {item.actor.fullname} •{" "}
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}{" "}
                      •{" "}
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.rightColumn}>
          <div
            className="glass-card"
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div className={styles.sidebarItem}>
              <span className={styles.sidebarLabel}>Status</span>

              <CustomSelect
                options={statuses.map((s) => ({
                  value: s.id,
                  label: s.name,
                  disabled: !(
                    user?.role?.name === RoleName.ADMIN ||
                    user?.role?.permissions?.boardStatuses?.[s.id] === true ||
                    (ticket.owner.id === user?.id &&
                      (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.CANCELLED.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.FAILED.toLowerCase()))
                  ),
                  icon: (
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: s.color,
                      }}
                    />
                  ),
                }))}
                value={ticket.status.id}
                onChange={handleUpdateStatus}
                placeholder="Change status..."
              />
            </div>

            <div className={styles.sidebarItem}>
              <span className={styles.sidebarLabel}>Priority</span>
              {canUpdatePriority ? (
                <CustomSelect
                  options={priorities.map((p) => ({
                    value: p.id,
                    label: p.name,
                    icon: (
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: p.color,
                        }}
                      />
                    ),
                  }))}
                  value={ticket.priority.id}
                  onChange={handleUpdatePriority}
                  placeholder="Priority"
                />
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: ticket.priority.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "0.9rem" }}>
                    {ticket.priority.name}
                  </span>
                </div>
              )}
            </div>

            <div className={styles.sidebarItem}>
              <span className={styles.sidebarLabel}>Owner</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className={tableStyles.avatar}
                  style={{ width: 32, height: 32 , display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <CustomIcon name="User" size={16} />
                </div>
                <span style={{ fontSize: "0.9rem" }}>
                  {ticket.owner.fullname}
                </span>
                {ticket.owner.id !== user?.id && (
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStartChat(ticket.owner.id)}
                    icon={<CustomIcon name="MessageSquare" size={14} />}
                    title="Chat with Owner"
                    style={{
                      padding: 0,
                      minHeight: "auto",
                      color: "var(--accent-primary)",
                    }}
                  />
                )}
              </div>
            </div>

            <div className={styles.sidebarItem}>
              <span className={styles.sidebarLabel}>Assignee</span>
              {canAssign ? (
                <CustomSelect
                  options={[
                    {
                      value: "",
                      label: "Unassigned",
                      icon: <CustomIcon name="UserPlus" size={16} />,
                    },
                    ...agents.map((agent) => ({
                      value: agent.id,
                      label: agent.fullname,
                      image: agent.image,
                    })),
                  ]}
                  value={ticket.assignee?.id || ""}
                  onChange={handleAssign}
                  placeholder="Assign ticket..."
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    className={tableStyles.avatar}
                    style={{ width: 32, height: 32 , display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {ticket?.assignee?.image ? (
                      <img
                        src={ticket?.assignee?.image}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      <CustomIcon name="UserPlus" size={16} />
                    )}
                  </div>
                  <span style={{ fontSize: "0.9rem" }}>
                    {ticket?.assignee?.fullname || "Unassigned"}
                  </span>
                  {ticket?.assignee && ticket?.assignee?.id !== user?.id && (
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartChat(ticket?.assignee?.id)}
                      icon={<CustomIcon name="MessageSquare" size={14} />}
                      title="Chat with Assignee"
                      style={{
                        padding: 0,
                        minHeight: "auto",
                        color: "var(--accent-secondary)",
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            <div className={styles.sidebarItem}>
              <span className={styles.sidebarLabel}>Details</span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CustomIcon name="Tag" size={16} />
                  <span>Type: {ticket.type?.name || "Issue"}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CustomIcon name="Layers" size={16} />
                  <span>Project: {ticket.project?.name || "None"}</span>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  <CustomDatePicker
                    label={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CustomIcon name="Calendar" size={16} />
                        <span>Due Date</span>
                      </div>
                    }
                    value={
                      ticket.dueDate
                        ? new Date(ticket.dueDate).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={handleUpdateDueDate}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CustomIcon name="Clock" size={16} />
                  <span>
                    Created:{" "}
                    {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          onConfirm={() => {
            if (pendingStatusId) executeStatusUpdate(pendingStatusId);
            setIsConfirmModalOpen(false);
          }}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText="Confirm"
        />
      </div>
    </div>
  );
};

export default TicketDetail;
