import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import Modal from "../../../components/Modal";
import CustomIcon from "../../../components/CustomIcon";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { RoleName, StatusName } from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import { useNotification } from "../../../context/NotificationContext";

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
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [fullTicketData, setFullTicketData] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchFullTicketData = useCallback(async () => {
    if (!ticket?.id) return;
    try {
      setLoading(true);
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(ticket.id));
      setFullTicketData(res.data.ticket);
    } catch (err) {
      console.error("Failed to fetch full ticket data", err);
    } finally {
      setLoading(false);
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
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), { statusId });
      showNotification("success", "Status updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update status");
    }
  };

  const handleUpdatePriority = async (priorityId: string) => {
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), { priorityId });
      showNotification("success", "Priority updated successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to update priority");
    }
  };

  const handleAssignTicket = async (assigneeId: string) => {
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), { assigneeId });
      showNotification("success", "Ticket assigned successfully");
      onTicketUpdate();
      fetchFullTicketData();
    } catch (err) {
      showNotification("error", "Failed to assign ticket");
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

  if (!ticket) return null;

  const canAssign =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.assign;
  const canUpdatePriority =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.tickets?.priority;
  const canViewComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.view;
  const canCreateComments =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.comments?.create;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="1500px"
      minHeight="60vh"
      title={`Ticket #${ticket.uid}: ${ticket.subject}`}
    >
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
              {canUpdatePriority ? (
                <CustomSelect
                  options={priorities.map((p) => ({
                    value: p.id,
                    label: p.name,
                    icon: <CustomIcon name="Tag" size={14} color={p.color} />,
                  }))}
                  value={ticket.priority.id}
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
                    background: `${ticket.priority.color}15`,
                    color: ticket.priority.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <CustomIcon name="Tag" size={16} /> {ticket.priority.name}
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
                    (ticket.owner.id === user?.id &&
                      (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.CANCELLED.toLowerCase() ||
                        s.name.toLowerCase() ===
                          StatusName.FAILED.toLowerCase()))
                  ),
                }))}
                value={ticket.status.id}
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
                {format(new Date(ticket.createdAt), "MMM dd, yyyy")}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/tickets/${ticket.id}`);
                }}
                icon={<CustomIcon name="Maximize2" size={16} />}
                style={{
                  color: "var(--accent-primary)",
                  border: "1px solid var(--accent-primary)30",
                }}
              />
            </div>
          </div>

          {/* Description */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              <CustomIcon name="Info" size={16} color="var(--accent-primary)" />{" "}
              Description
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
              {ticket.issue}
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  {ticket.owner.fullname.charAt(0)}
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
                    {ticket.owner.fullname}
                    {ticket.owner.id !== user?.id &&
                      (ticket.status.name.toLowerCase() ===
                        StatusName.OPEN.toLowerCase() ||
                        ticket.status.name.toLowerCase() ===
                          StatusName.CANCELLED.toLowerCase()) && (
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartChat(ticket.owner.id)}
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

            {/* Assignment */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                    value={ticket.assignee?.id || ""}
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
                    {ticket.assignee ? (
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
                          {ticket.assignee.fullname.charAt(0)}
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
                            {ticket.assignee.fullname}
                            {ticket.assignee.id !== user?.id && (
                              <CustomButton
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleStartChat(ticket.assignee.id)
                                }
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
    </Modal>
  );
};

export default TicketDetailModal;
