import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import CustomDropdownMenu from "../../components/CustomDropdownMenu";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  readAttachmentFiles,
} from "../../utils/attachments";

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
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [isEditingIssue, setIsEditingIssue] = useState(false);
  const [issueDraft, setIssueDraft] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCooldownActive, setCommentCooldownActive] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<string[]>([]);
  const [commentAttachmentError, setCommentAttachmentError] = useState<
    string | null
  >(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [attachmentsDraft, setAttachmentsDraft] = useState<string[]>([]);
  const [attachmentsDraftError, setAttachmentsDraftError] = useState<
    string | null
  >(null);
  const [isSavingAttachments, setIsSavingAttachments] = useState(false);
  const attachmentsEditFileInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);

  const openLightbox = (images: string[], index: number) =>
    setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);
  const lightboxNext = () =>
    setLightbox((lb) =>
      lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : null,
    );
  const lightboxPrev = () =>
    setLightbox((lb) =>
      lb
        ? {
            ...lb,
            index: (lb.index - 1 + lb.images.length) % lb.images.length,
          }
        : null,
    );

  // Keyboard navigation for the lightbox: ESC closes, arrows navigate.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") lightboxNext();
      else if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", onKey);
    // Prevent body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);
  const commentSendDisabled = isSubmittingComment || commentCooldownActive;
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

  // Mirrors the backend matrix in ticket.usecase.updateTicket.
  // Subject + description editable by: Admin, Manager, Employee (if owner or
  // assignee), Client (if owner AND ticket still in "New" status).
  const canEditContent = (() => {
    if (!ticket || !user) return false;
    const role = user.role?.name;
    const isAdmin = role === RoleName.ADMIN;
    const isManager = role === RoleName.AGENT;
    const isEmployee = role === RoleName.EMPLOYEE;
    const isClient = role === RoleName.CUSTOMER;
    const isOwner = ticket.owner.id === user.id;
    const isAssignee = ticket.assignee?.id === user.id;
    const ticketIsNew = ticket.status?.name === StatusName.NEW;
    return (
      isAdmin ||
      isManager ||
      (isEmployee && (isOwner || isAssignee)) ||
      (isClient && isOwner && ticketIsNew)
    );
  })();

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

  const startEditSubject = () => {
    if (!ticket) return;
    setSubjectDraft(ticket.subject);
    setIsEditingSubject(true);
  };

  const cancelEditSubject = () => {
    setIsEditingSubject(false);
    setSubjectDraft("");
  };

  const handleSaveSubject = async () => {
    if (!ticket) return;
    const trimmed = subjectDraft.trim();
    if (!trimmed) {
      showNotification("error", "Subject cannot be empty");
      return;
    }
    if (trimmed === ticket.subject) {
      setIsEditingSubject(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { subject: trimmed });
      showNotification("success", "Subject updated");
      setIsEditingSubject(false);
      fetchTicket();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update subject",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const startEditIssue = () => {
    if (!ticket) return;
    setIssueDraft(ticket.issue);
    setIsEditingIssue(true);
  };

  const cancelEditIssue = () => {
    setIsEditingIssue(false);
    setIssueDraft("");
  };

  const handleSaveIssue = async () => {
    if (!ticket) return;
    const trimmed = issueDraft.trim();
    if (!trimmed) {
      showNotification("error", "Description cannot be empty");
      return;
    }
    if (trimmed === ticket.issue) {
      setIsEditingIssue(false);
      return;
    }
    setIsSavingEdit(true);
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { issue: trimmed });
      showNotification("success", "Description updated");
      setIsEditingIssue(false);
      fetchTicket();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update description",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const startEditAttachments = () => {
    if (!ticket) return;
    setAttachmentsDraft(ticket.attachments || []);
    setAttachmentsDraftError(null);
    setIsEditingAttachments(true);
  };

  const cancelEditAttachments = () => {
    setIsEditingAttachments(false);
    setAttachmentsDraft([]);
    setAttachmentsDraftError(null);
  };

  const handleAttachmentsDraftSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setAttachmentsDraftError(null);
    const { accepted, errors } = await readAttachmentFiles(
      e.target.files,
      attachmentsDraft.length,
    );
    if (accepted.length) setAttachmentsDraft((prev) => [...prev, ...accepted]);
    if (errors.length) setAttachmentsDraftError(errors.join(" "));
    e.target.value = "";
  };

  const removeAttachmentDraft = (idx: number) => {
    setAttachmentsDraft((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentsDraftError(null);
  };

  const handleSaveAttachments = async () => {
    if (!ticket) return;
    setIsSavingAttachments(true);
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), {
        attachments: attachmentsDraft,
      });
      showNotification("success", "Attachments updated");
      setIsEditingAttachments(false);
      fetchTicket();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update attachments",
      );
    } finally {
      setIsSavingAttachments(false);
    }
  };

  const handleCommentAttachmentSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setCommentAttachmentError(null);
    const { accepted, errors } = await readAttachmentFiles(
      e.target.files,
      commentAttachments.length,
    );
    if (accepted.length)
      setCommentAttachments((prev) => [...prev, ...accepted]);
    if (errors.length) setCommentAttachmentError(errors.join(" "));
    e.target.value = "";
  };

  const removeCommentAttachment = (idx: number) => {
    setCommentAttachments((prev) => prev.filter((_, i) => i !== idx));
    setCommentAttachmentError(null);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    // Allow a comment with text only, attachments only, or both —
    // but at least one of the two must be present.
    if (!newComment.trim() && commentAttachments.length === 0) return;
    // Guard against rapid double-submit (mouse + Enter race) and the
    // brief 1-second cooldown that follows a successful send.
    if (commentSendDisabled) return;

    setIsSubmittingComment(true);
    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(id!), {
        comment: newComment,
        isNote,
        attachments: commentAttachments,
      });
      setNewComment("");
      setIsNote(false);
      setCommentAttachments([]);
      setCommentAttachmentError(null);
      setCommentCooldownActive(true);
      setTimeout(() => setCommentCooldownActive(false), 1000);
      fetchTicket(); // Refresh ticket to show new comment
    } catch (err: any) {
      console.error("Failed to add comment", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to send comment",
      );
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleAssign = async (assigneeId: string) => {
    try {
      setIsLoading(true, UIMessages.LOADING.ASSIGNING_TICKET);
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { assigneeId });
      showNotification("success", "Ticket assigned successfully");
      fetchTicket();
    } catch (err: any) {
      console.error("Failed to assign ticket", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to assign ticket",
      );
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
      statusName === StatusName.TRASH.toLowerCase() ||
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
      statusName === StatusName.TRASH.toLowerCase() ||
      statusName === StatusName.FAILED.toLowerCase()
    ) {
      setPendingStatusId(statusId);
      setConfirmConfig({
        title:
          statusName === StatusName.TRASH.toLowerCase()
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
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), { 
        statusId,
        statusName: ticket?.status?.name || ""
      });
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
    } catch (err: any) {
      console.error("Failed to update priority", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update ticket priority",
      );
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
    } catch (err: any) {
      console.error("Failed to update due date", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update due date",
      );
    } finally {
      setIsLoading(false, "");
    }
  };

  useEffect(() => {
    fetchTicket();
    if (canAssign) fetchAgents();
    fetchStatuses();
    fetchPriorities();
  }, [id, canAssign]);

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate(-1)}
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
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              Ticket Details
            </h1>
            <p
              style={{
                color: "var(--text-muted)",
                margin: "4px 0 0 0",
                fontSize: "0.9rem",
              }}
            >
              Manage and track ticket progress
            </p>
          </div>
        </div>
      </div>
      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={`${styles.ticketInfo} glass-card`}>
            <div className={styles.ticketHeader}>
              <div style={{ flex: 1 }}>
                <span className={styles.uid}>Ticket #{ticket.uid}</span>
                {isEditingSubject ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <input
                      type="text"
                      value={subjectDraft}
                      onChange={(e) => setSubjectDraft(e.target.value)}
                      autoFocus
                      style={{
                        flex: 1,
                        fontSize: "1.4rem",
                        fontWeight: 700,
                        padding: "6px 10px",
                        border: "1px solid var(--border-glass)",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.03)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    />
                    <CustomButton
                      variant="primary"
                      size="sm"
                      onClick={handleSaveSubject}
                      loading={isSavingEdit}
                      icon={<CustomIcon name="Check" size={16} />}
                      title="Save"
                    />
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditSubject}
                      icon={<CustomIcon name="X" size={16} />}
                      title="Cancel"
                    />
                  </div>
                ) : (
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <h1 className={styles.title}>{ticket.subject}</h1>
                    {canEditContent && (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={startEditSubject}
                        icon={<CustomIcon name="Edit2" size={14} />}
                        title="Edit title"
                        style={{ padding: 4 }}
                      />
                    )}
                  </div>
                )}
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

            {isEditingIssue ? (
              <div>
                <CustomTextArea
                  value={issueDraft}
                  onChange={(e: any) => setIssueDraft(e.target.value)}
                  rows={6}
                  style={{ width: "100%" }}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 8,
                    justifyContent: "flex-end",
                  }}
                >
                  <CustomButton
                    variant="ghost"
                    onClick={cancelEditIssue}
                    disabled={isSavingEdit}
                  >
                    Cancel
                  </CustomButton>
                  <CustomButton
                    variant="primary"
                    onClick={handleSaveIssue}
                    loading={isSavingEdit}
                  >
                    Save
                  </CustomButton>
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
              >
                <div className={styles.issue} style={{ flex: 1 }}>
                  {ticket.issue}
                </div>
                {canEditContent && (
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={startEditIssue}
                    icon={<CustomIcon name="Edit2" size={14} />}
                    title="Edit description"
                    style={{ padding: 4 }}
                  />
                )}
              </div>
            )}

            {(canEditContent ||
              (ticket.attachments && ticket.attachments.length > 0)) && (
              <div style={{ marginTop: 16 }}>
                {isEditingAttachments ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                        }}
                      >
                        Attachments
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {attachmentsDraft.length} / {MAX_ATTACHMENTS}
                      </span>
                    </div>
                    <input
                      ref={attachmentsEditFileInputRef}
                      type="file"
                      accept={ACCEPT_ATTRIBUTE}
                      multiple
                      onChange={handleAttachmentsDraftSelect}
                      style={{ display: "none" }}
                    />
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {attachmentsDraft.map((src, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            width: 72,
                            height: 72,
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid var(--border-glass)",
                          }}
                        >
                          <img
                            src={src}
                            alt={`attachment-${idx}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeAttachmentDraft(idx)}
                            title="Remove attachment"
                            style={{
                              position: "absolute",
                              top: 2,
                              right: 2,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.6)",
                              border: "none",
                              cursor: "pointer",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <CustomIcon name="X" size={12} />
                          </button>
                        </div>
                      ))}
                      {attachmentsDraft.length < MAX_ATTACHMENTS && (
                        <CustomButton
                          type="button"
                          variant="outline"
                          onClick={() =>
                            attachmentsEditFileInputRef.current?.click()
                          }
                          icon={<CustomIcon name="ImagePlus" size={16} />}
                          style={{
                            width: 72,
                            height: 72,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Add image"
                        />
                      )}
                    </div>
                    {attachmentsDraftError && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--accent-danger)",
                          marginTop: 6,
                        }}
                      >
                        {attachmentsDraftError}
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        marginTop: 10,
                      }}
                    >
                      <CustomButton
                        variant="ghost"
                        onClick={cancelEditAttachments}
                        disabled={isSavingAttachments}
                      >
                        Cancel
                      </CustomButton>
                      <CustomButton
                        variant="primary"
                        onClick={handleSaveAttachments}
                        loading={isSavingAttachments}
                      >
                        Save
                      </CustomButton>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      {ticket.attachments && ticket.attachments.length > 0 ? (
                        ticket.attachments.map((src, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              openLightbox(ticket.attachments!, idx)
                            }
                            title="View image"
                            style={{
                              display: "block",
                              width: 96,
                              height: 96,
                              borderRadius: 8,
                              overflow: "hidden",
                              border: "1px solid var(--border-glass)",
                              padding: 0,
                              cursor: "zoom-in",
                              background: "transparent",
                            }}
                          >
                            <img
                              src={src}
                              alt={`attachment-${idx}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </button>
                        ))
                      ) : (
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          No attachments
                        </span>
                      )}
                    </div>
                    {canEditContent && (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={startEditAttachments}
                        icon={<CustomIcon name="Edit2" size={14} />}
                        title="Edit attachments"
                        style={{ padding: 4 }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

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
                    {comment.comment?.trim() && (
                      <div
                        style={{
                          fontSize: "0.95rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {comment.comment}
                      </div>
                    )}
                    {(comment as any).attachments &&
                      (comment as any).attachments.length > 0 && (
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {(comment as any).attachments.map(
                            (src: string, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  openLightbox(
                                    (comment as any).attachments,
                                    idx,
                                  )
                                }
                                title="View image"
                                style={{
                                  display: "block",
                                  width: 72,
                                  height: 72,
                                  borderRadius: 6,
                                  overflow: "hidden",
                                  border: "1px solid var(--border-glass)",
                                  padding: 0,
                                  cursor: "zoom-in",
                                  background: "transparent",
                                }}
                              >
                                <img
                                  src={src}
                                  alt={`attachment-${idx}`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              </button>
                            ),
                          )}
                        </div>
                      )}
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
                  {commentAttachments.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {commentAttachments.map((src, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            width: 60,
                            height: 60,
                            borderRadius: 6,
                            overflow: "hidden",
                            border: "1px solid var(--border-glass)",
                          }}
                        >
                          <img
                            src={src}
                            alt={`attachment-${idx}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeCommentAttachment(idx)}
                            title="Remove"
                            style={{
                              position: "absolute",
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.6)",
                              border: "none",
                              cursor: "pointer",
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                            }}
                          >
                            <CustomIcon name="X" size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {commentAttachmentError && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--accent-danger)",
                        marginTop: 4,
                      }}
                    >
                      {commentAttachmentError}
                    </span>
                  )}
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept={ACCEPT_ATTRIBUTE}
                    multiple
                    onChange={handleCommentAttachmentSelect}
                    style={{ display: "none" }}
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
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={commentAttachments.length >= MAX_ATTACHMENTS}
                      icon={<CustomIcon name="Paperclip" size={16} />}
                      title={
                        commentAttachments.length >= MAX_ATTACHMENTS
                          ? `Maximum ${MAX_ATTACHMENTS} images reached`
                          : "Attach image"
                      }
                      style={{ marginLeft: "auto" }}
                    />
                    <CustomButton
                      type="submit"
                      variant="gradient"
                      icon={<CustomIcon name="Send" size={16} />}
                      disabled={
                        commentSendDisabled ||
                        (!newComment.trim() && commentAttachments.length === 0)
                      }
                      loading={isSubmittingComment}
                      title="Send comment"
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
                          StatusName.TRASH.toLowerCase() ||
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
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  style={{
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
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
                    style={{
                      width: 32,
                      height: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
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

      {lightbox &&
        createPortal(
          <div
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            {/* Close button (top-right) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              title="Close (Esc)"
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CustomIcon name="X" size={20} />
            </button>

            {/* Counter (top-center) */}
            {lightbox.images.length > 1 && (
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: "rgba(0,0,0,0.4)",
                  padding: "6px 14px",
                  borderRadius: 20,
                }}
              >
                {lightbox.index + 1} / {lightbox.images.length}
              </div>
            )}

            {/* Prev */}
            {lightbox.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxPrev();
                }}
                title="Previous (←)"
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CustomIcon name="ChevronLeft" size={24} />
              </button>
            )}

            {/* Image */}
            <img
              src={lightbox.images[lightbox.index]}
              alt={`attachment-${lightbox.index}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "92vw",
                maxHeight: "88vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                cursor: "default",
              }}
            />

            {/* Next */}
            {lightbox.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lightboxNext();
                }}
                title="Next (→)"
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CustomIcon name="ChevronRight" size={24} />
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TicketDetail;
