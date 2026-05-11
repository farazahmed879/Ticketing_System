import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import Modal from "../../../components/Modal";
import CustomIcon from "../../../components/CustomIcon";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { RoleName, StatusName, UIMessages } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import { useNotification } from "../../../context/NotificationContext";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomDatePicker from "../../../components/CustomDatePicker";
import CustomInput from "../../../components/CustomInput";
import CustomDropdownMenu from "../../../components/CustomDropdownMenu";
import ConfirmationModal from "../../../components/ConfirmationModal";

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any;
  agents: any[];
  priorities: any[];
  columns: any[];
  onTicketUpdate: () => void;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  agents,
  priorities,
  columns,
  onTicketUpdate,
}) => {
  const { user } = useAuth();
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();
  const [fullTicketData, setFullTicketData] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [description, setDescription] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchFullTicketData = useCallback(async () => {
    if (!ticket?.id) return;
    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(ticket.id));
      setFullTicketData(res.data.ticket);
      setDescription(res.data.ticket.issue);
    } catch (err) {
      console.error("Failed to fetch full ticket data", err);
    }
  }, [ticket?.id]);

  useEffect(() => {
    if (isOpen && ticket?.id) {
      fetchFullTicketData();
    } else {
      setFullTicketData(null);
    }
  }, [isOpen, ticket?.id, fetchFullTicketData]);

  const handleUpdateStatus = async (statusId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_STATUS);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), { statusId });
      showNotification("success", "Status updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update status");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleUpdatePriority = async (priorityId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_PRIORITY);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), { priorityId });
      showNotification("success", "Priority updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update priority");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleAssignTicket = async (assigneeId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.ASSIGNING_TICKET);
      const updateData: any = { assigneeId };

      // If assigning to someone (not unassigning), set status to Open
      if (assigneeId) {
        const openStatus = columns.find(
          (c) => c.name.toLowerCase() === StatusName.OPEN.toLowerCase(),
        );
        if (openStatus && ticket.status.id !== openStatus.id) {
          updateData.statusId = openStatus.id;
        }
      }

      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), updateData);
      showNotification(
        "success",
        assigneeId
          ? "Ticket assigned and status updated to Open"
          : "Ticket unassigned",
      );
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to assign ticket");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleUpdateDueDate = async (dueDate: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.UPDATING_DUE_DATE);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), {
        dueDate: dueDate || null,
      });
      showNotification("success", "Due date updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update due date");
    } finally {
      setIsLoading(false, "");
    }
  };
  const handleUpdateDescription = async () => {
    if (description === fullTicketData?.issue) return;
    try {
      setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES);
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), {
        issue: description,
      });
      showNotification("success", "Description updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update description");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(ticket.id), {
        comment: newComment,
        isNote: false,
      });
      setNewComment("");
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to add comment");
    }
  };

  const handleStartChat = (userId: string) => {
    onClose();
    navigate(`/messages?userId=${userId}`);
  };

  const handleDeleteTicket = async () => {
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TICKETS.BY_ID(ticket.id));
      showNotification("success", "Ticket deleted successfully!");
      setIsDeleteModalOpen(false);
      onClose();
      onTicketUpdate();
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

  if (!ticket) return null;

  const displayTicket = fullTicketData || ticket;

  const canAssign =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.assign;
  const canUpdatePriority =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.priority;
  const canUpdate =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.update ||
    user?.id === displayTicket.owner.id;
  const canViewComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.view;
  const canCreateComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.create;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1500px"
      minHeight="60vh"
      title={`Ticket #${displayTicket.uid}: ${displayTicket.subject}`}
      headerAction={
        <CustomDropdownMenu
          items={[
            {
              label: "Copy Ticket ID",
              icon: "Hash",
              onClick: () => {
                navigator.clipboard.writeText(String(displayTicket.uid));
                showNotification("success", "Ticket ID copied");
              },
            },
            {
              label: "Copy Ticket URL",
              icon: "Link",
              onClick: () => {
                const url = `${window.location.origin}/tickets/${displayTicket.id}`;
                navigator.clipboard.writeText(url);
                showNotification("success", "Ticket URL copied");
              },
            },
            {
              label: "Open Full Page",
              icon: "ExternalLink",
              onClick: () => {
                navigate(`/tickets/${displayTicket.id}`);
              },
            },
            ...(user?.role?.name === RoleName.ADMIN ? [{
              label: "Delete Ticket",
              icon: "Trash2",
              onClick: () => {
                setIsDeleteModalOpen(true);
              },
              danger: true,
            }] : []),
          ]}
        />
      }
    >
      {!fullTicketData ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.6fr 1fr",
            gap: 30,
            padding: "10px 0",
            flex: 1,
          }}
        >
          {/* Left Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="skeleton-pulse" style={{ width: 140, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
              <div className="skeleton-pulse" style={{ width: 180, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
              <div className="skeleton-pulse" style={{ width: 160, height: 36, borderRadius: 8, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton-pulse" style={{ width: 100, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                <div className="skeleton-pulse" style={{ width: "100%", height: 120, borderRadius: 12, background: "rgba(255,255,255,0.04)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="skeleton-pulse" style={{ width: 80, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                <div className="skeleton-pulse" style={{ width: "100%", height: 64, borderRadius: 12, background: "rgba(255,255,255,0.04)" }} />
                <div className="skeleton-pulse" style={{ width: 80, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                <div className="skeleton-pulse" style={{ width: "100%", height: 40, borderRadius: 12, background: "rgba(255,255,255,0.04)" }} />
                <div className="skeleton-pulse" style={{ width: 80, height: 14, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                <div className="skeleton-pulse" style={{ width: "100%", height: 64, borderRadius: 12, background: "rgba(255,255,255,0.04)" }} />
              </div>
            </div>
          </div>
          {/* Right Skeleton (Comments) */}
          <div style={{ borderLeft: "1px solid var(--border-glass)", paddingLeft: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="skeleton-pulse" style={{ width: 140, height: 18, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-glass)", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="skeleton-pulse" style={{ width: 100, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.06)" }} />
                  <div className="skeleton-pulse" style={{ width: 60, height: 10, borderRadius: 6, background: "rgba(255,255,255,0.04)" }} />
                </div>
                <div className="skeleton-pulse" style={{ width: "90%", height: 14, borderRadius: 6, background: "rgba(255,255,255,0.04)" }} />
              </div>
            ))}
            <div className="skeleton-pulse" style={{ width: "100%", height: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", marginTop: "auto" }} />
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1fr",
              gap: 30,
              padding: "10px 0",
              flex: 1,
            }}
          >
        {/* Left Column: Details */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            overflowY: "visible",
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
              {canUpdatePriority ? (
                <CustomSelect
                  options={priorities.map((p) => ({
                    value: p.id,
                    label: p.name,
                    icon: <CustomIcon name="Tag" size={14} color={p.color} />,
                  }))}
                  value={displayTicket.priority.id}
                  onChange={handleUpdatePriority}
                  style={{
                    minWidth: 140,
                    fontSize: "0.8rem",
                  }}
                />
              ) : (
                <span
                  className="badge"
                  style={{
                    background: `${displayTicket.priority.color}15`,
                    color: displayTicket.priority.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <CustomIcon name="Tag" size={16} />{" "}
                  {displayTicket.priority.name}
                </span>
              )}
              <CustomSelect
                options={columns.map((s) => ({
                  value: s.id,
                  label: s.name,
                  icon: <CustomIcon name="Clock" size={14} color={s.color} />,
                  disabled: !(
                    user?.role?.name === RoleName.ADMIN ||
                    user?.role?.permissions?.boardStatuses?.[s.id] === true ||
                    (displayTicket.owner.id === user?.id &&
                      (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.CANCELLED.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.FAILED.toLowerCase()))
                  ),
                }))}
                value={displayTicket.status.id}
                onChange={handleUpdateStatus}
                style={{
                  minWidth: 180,
                  fontSize: "0.8rem",
                }}
              />
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
                  width: "fit-content",
                  minWidth: 140,
                }}
              >
                <CustomIcon name="Calendar" size={16} />{" "}
                Created: {format(new Date(displayTicket.createdAt), "MMM dd, yyyy")}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/tickets/${displayTicket.id}`);
                }}
                icon={<CustomIcon name="Maximize2" size={16} />}
                style={{
                  color: "var(--accent-primary)",
                  border: "1px solid var(--accent-primary)30",
                }}
              />
            </div>
          </div>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <CustomTextArea
              label={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CustomIcon
                    name="Info"
                    size={16}
                    color="var(--accent-primary)"
                  />
                  <span>Description</span>
                </div>
              }
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              onBlur={handleUpdateDescription}
              disabled={!canUpdate}
              placeholder={
                canUpdate ? "Add a description..." : "No description provided"
              }
              rows={6}
              containerStyle={{ height: "100%" }}
              style={{
                background: "rgba(255,255,255,0.02)",
                fontSize: "0.95rem",
                cursor: !canUpdate ? "not-allowed" : "text",
                resize: !canUpdate ? "none" : "vertical",
                height: "100%",
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
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
                  <CustomIcon
                    name="User"
                    size={18}
                    color="var(--accent-primary)"
                  />{" "}
                  Reporter
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
                    {displayTicket.owner.fullname.charAt(0)}
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
                      {displayTicket.owner.fullname}
                      {displayTicket.owner.id !== user?.id &&
                        (displayTicket.status.name.toLowerCase() ===
                          StatusName.OPEN.toLowerCase() ||
                          displayTicket.status.name.toLowerCase() ===
                            StatusName.CANCELLED.toLowerCase()) && (
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStartChat(displayTicket.owner.id)
                            }
                            icon={<CustomIcon name="MessageSquare" size={14} />}
                            title="Chat with Reporter"
                            style={{
                              padding: 0,
                              minHeight: "auto",
                              color: "var(--accent-primary)",
                            }}
                          />
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

              <CustomDatePicker
                label={
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <CustomIcon
                      name="Clock"
                      size={18}
                      color="var(--accent-primary)"
                    />
                    <span>Due Date</span>
                  </div>
                }
                value={
                  displayTicket.dueDate
                    ? new Date(displayTicket.dueDate)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={handleUpdateDueDate}
                disabled={!canUpdate}
              />

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
                  <CustomIcon
                    name="UserPlus"
                    size={18}
                    color="var(--accent-secondary)"
                  />{" "}
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
                      value={displayTicket.assignee?.id || ""}
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
                      {displayTicket.assignee ? (
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
                            {displayTicket.assignee.fullname.charAt(0)}
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
                              {displayTicket.assignee.fullname}
                              {displayTicket.assignee.id !== user?.id && (
                                <CustomButton
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleStartChat(displayTicket.assignee.id)
                                  }
                                  icon={
                                    <CustomIcon
                                      name="MessageSquare"
                                      size={14}
                                    />
                                  }
                                  title="Chat with Assignee"
                                  style={{
                                    padding: 0,
                                    minHeight: "auto",
                                    color: "var(--accent-secondary)",
                                  }}
                                />
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
          {/* Description */}
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
              <CustomIcon
                name="MessageCircle"
                size={20}
                color="var(--accent-primary)"
              />
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
                          <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
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
                      <CustomInput
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e: any) => setNewComment(e.target.value)}
                        containerStyle={{ flex: 1 }}
                      />
                      <CustomButton
                        type="submit"
                        variant="gradient"
                        disabled={!newComment.trim()}
                        icon={<CustomIcon name="Send" size={18} />}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                        }}
                      />
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
    </div>
  )}
    </Modal>
    <ConfirmationModal
      isOpen={isDeleteModalOpen}
      onClose={() => setIsDeleteModalOpen(false)}
      onConfirm={handleDeleteTicket}
      title="Delete Ticket"
      message="Are you sure you want to delete this ticket? This action cannot be undone."
      confirmText="Delete"
      type="danger"
    />
  </>
  );
};

export default TicketDetailModal;
