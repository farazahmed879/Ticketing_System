/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../../../components/CustomIcon";
import CustomButton from "../../../../components/CustomButton";
import api from "../../../../services/api";
import { API_ROUTES } from "../../../../utils/apiRoutes";
import { socket } from "../../../../services/socket";
import styles from "./TicketDetail.module.css";
import { useAuth } from "../../../../context/AuthContext";
import { useNotification } from "../../../../context/NotificationContext";
import {
  PRIORITIES,
  StatusName,
  TICKET_STATUSES,
  TICKET_STATUS_IDS,
  UIMessages,
} from "../../../../utils/constants";
import ConfirmationModal from "../../../../components/ConfirmationModal";
import { readAttachmentFiles } from "../../../../utils/attachments";
import {
  type ClientDecision,
  buildClientDecisionBody,
  buildStatusTransitionFields,
  getDecisionDialog,
  canShowCancelBanner,
  handleStatusChange,
} from "../../shared/ticketDecisions";

import TicketDetailSkeleton from "./components/TicketDetailSkeleton";
import TicketDetailHeader from "./components/TicketDetailHeader";
import TicketDetailDescription from "./components/TicketDetailDescription";
import TicketDetailAttachments from "./components/TicketDetailAttachments";
import TicketDetailSidebar from "./components/TicketDetailSidebar";
import TicketDetailComments from "./components/TicketDetailComments";
import TicketDetailHistory from "./components/TicketDetailHistory";

import type { TicketDetail as ITicketDetail } from "../../../../types";
import CustomImage from "../../../../components/CustomImage";
import { ROLE_TYPE } from "../../../roles/roleConstants";

interface SidebarDraft {
  statusId: string;
  priorityId: string;
  assigneeId: string;
  qaId: string;
  dueDate: string;
  tags: string[];
}

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<ITicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "comments" | "internal" | "history"
  >("comments");
  const [newComment, setNewComment] = useState("");
  const [isNote, setIsNote] = useState(false);

  // --- Unified draft state for editable content ---
  const [subjectDraft, setSubjectDraft] = useState("");
  const [issueDraft, setIssueDraft] = useState("");
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [attachmentsDraft, setAttachmentsDraft] = useState<string[]>([]);
  const [attachmentsDraftError, setAttachmentsDraftError] = useState<
    string | null
  >(null);
  const attachmentsEditFileInputRef = useRef<HTMLInputElement>(null);

  // --- Sidebar draft state ---
  const [sidebarDraft, setSidebarDraft] = useState<SidebarDraft>({
    statusId: "",
    priorityId: "",
    assigneeId: "",
    qaId: "",
    dueDate: "",
    tags: [],
  });

  // --- Saving state ---
  const [isSaving, setIsSaving] = useState(false);

  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCooldownActive, setCommentCooldownActive] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState<string[]>([]);
  const [commentAttachmentError, setCommentAttachmentError] = useState<
    string | null
  >(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  // Measure the sidebar so the comment feed can be capped to roughly its
  // height ("sidebar length and a little more") instead of running longer.
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [feedHeight, setFeedHeight] = useState<number | undefined>(undefined);

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

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowRight") lightboxNext();
      else if (e.key === "ArrowLeft") lightboxPrev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  const commentSendDisabled = isSubmittingComment || commentCooldownActive;
  const statuses = TICKET_STATUSES;
  const priorities = PRIORITIES;
  const [agents, setAgents] = useState<any[]>([]);
  const [qaList, setQaList] = useState<any[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  // Confirm before a staff member posts on the client-visible (public) thread.
  const [showPublicCommentConfirm, setShowPublicCommentConfirm] =
    useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<any>(null);
  const [pendingDecision, setPendingDecision] = useState<ClientDecision | null>(
    null,
  );
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

  const isClient = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  // Team leads of the ticket's project can assign it to their team members.
  const isLeadOfTicket = !!ticket?.teamLeadIds?.includes(user?.id ?? "");
  const canAssign =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.tickets?.assign ||
    isLeadOfTicket;
  // Admins and managers can (re)assign QA, so they need the members list too.
  const canAssignQA =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.AGENT;
  const isEmployeeOrClient =
    user?.role?.roleType === ROLE_TYPE.EMPLOYEE ||
    user?.role?.roleType === ROLE_TYPE.CUSTOMER;

  const canUpdatePriority =
    !isEmployeeOrClient &&
    (user?.role?.roleType === ROLE_TYPE.ADMIN ||
      user?.role?.permissions?.tickets?.priority);

  const canEditContent = (() => {
    if (!ticket || !user) return false;
    const role = user.role?.roleType;
    const isAdmin = role === ROLE_TYPE.ADMIN;
    const isManager = role === ROLE_TYPE.AGENT;
    // const isEmployee = role === RoleName.EMPLOYEE;
    const isClient = role === ROLE_TYPE.CUSTOMER;
    const isOwner = ticket.owner.id === user.id;
    // const isAssignee = ticket.assignee?.id === user.id;
    const ticketIsNew = ticket.status?.name === StatusName.NEW;
    return isAdmin || isManager || (isClient && isOwner && ticketIsNew);
  })();

  // --- Initialize drafts from ticket data ---
  const initDrafts = (t: ITicketDetail) => {
    setSubjectDraft(t.subject);
    setIssueDraft(t.issue);
    setAttachmentsDraft(t.attachments || []);
    setSidebarDraft({
      statusId: t.status.id,
      priorityId: t.priority.id,
      assigneeId: t.assignee?.id || "",
      qaId: t.qa?.id || "",
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
      tags: t.tags || [],
    });
  };

  const fetchTicket = async () => {
    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(id!));
      const t = res.data.ticket;
      setTicket(t);
      initDrafts(t);
    } catch (err) {
      console.error("Failed to fetch ticket", err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Re-fetches the ticket from the server and updates `ticket` state (so
   * comments, history, etc. are refreshed) **without** resetting the user's
   * unsaved draft values.  Use this after posting a comment or when a
   * real-time socket event arrives.
   */
  const refreshTicketData = async () => {
    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(id!));
      setTicket(res.data.ticket);
    } catch (err) {
      console.error("Failed to refresh ticket data", err);
    }
  };

  const fetchProjectMembers = async () => {
    if (!ticket?.project?.id) {
      // Fallback if ticket has no project
      try {
        const [agentsRes, qaRes] = await Promise.all([
          api.get(API_ROUTES.USERS.BASE, {
            params: { type: "employees", limit: -1 },
          }),
          api.get(API_ROUTES.USERS.BASE, {
            params: { type: "qa", limit: -1 },
          }),
        ]);
        setAgents(agentsRes.data.accounts);
        setQaList(qaRes.data.accounts);
      } catch (err) {
        console.error("Failed to fetch fallback agents/qa", err);
      }
      return;
    }

    try {
      const res = await api.get(API_ROUTES.PROJECTS.MEMBERS(ticket.project.id));
      const members = res.data.members || [];
      // Agents can be employees, agents (managers), or admins
      setAgents(
        members.filter(
          (m: any) =>
            m.role.roleType === ROLE_TYPE.EMPLOYEE ||
            m.role.roleType === ROLE_TYPE.AGENT ||
            m.role.roleType === ROLE_TYPE.ADMIN,
        ),
      );
      setQaList(members.filter((m: any) => m.role.roleType === ROLE_TYPE.QA));
    } catch (err) {
      console.error("Failed to fetch project members", err);
    }
  };

  // --- Detect changes ---
  const hasContentChanges = (() => {
    if (!ticket) return false;
    // Trim both sides — otherwise a stored subject/issue with surrounding
    // whitespace would always read as "changed" and keep the Update bar shown.
    return (
      subjectDraft.trim() !== (ticket.subject || "").trim() ||
      issueDraft.trim() !== (ticket.issue || "").trim() ||
      JSON.stringify(attachmentsDraft) !==
        JSON.stringify(ticket.attachments || [])
    );
  })();

  const hasSidebarChanges = (() => {
    if (!ticket) return false;
    const origDueDate = ticket.dueDate
      ? new Date(ticket.dueDate).toISOString().split("T")[0]
      : "";
    return (
      sidebarDraft.statusId !== ticket.status.id ||
      sidebarDraft.priorityId !== ticket.priority.id ||
      sidebarDraft.assigneeId !== (ticket.assignee?.id || "") ||
      sidebarDraft.qaId !== (ticket.qa?.id || "") ||
      sidebarDraft.dueDate !== origDueDate ||
      JSON.stringify(sidebarDraft.tags) !== JSON.stringify(ticket.tags || [])
    );
  })();

  const hasAnyChanges = hasContentChanges || hasSidebarChanges;

  // --- Sidebar draft handler ---
  const onSidebarDraftChange = (field: keyof SidebarDraft, value: string) => {
    setSidebarDraft((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };

      if (field === "assigneeId") {
        if (value) {
          // If assigned, set status to Open/Assigned
          updated.statusId = TICKET_STATUS_IDS.ASSIGNED;
        } else {
          // If unassigned, set status to Unassigned/New
          updated.statusId = TICKET_STATUS_IDS.UNASSIGNED;
        }
      }

      return updated;
    });
  };

  // --- Unified Update handler ---
  const handleUpdate = async () => {
    if (!ticket || !hasAnyChanges) return;

    // Validate
    if (subjectDraft.trim() === "") {
      showNotification("error", "Subject cannot be empty");
      return;
    }
    if (issueDraft.trim() === "") {
      showNotification("error", "Description cannot be empty");
      return;
    }

    // Permission check for priority (handleStatusChange covers status rules).
    if (sidebarDraft.priorityId !== ticket.priority.id && !canUpdatePriority) {
      showNotification(
        "error",
        "You do not have permission to change ticket priority",
      );
      return;
    }

    // Augment the payload with the context the shared status gate needs:
    // owner (for owner basic-actions), assignee + team leads (for team-lead
    // rules), and the ticket id (used as the request target). Extra fields are
    // ignored by the backend, which builds its update from explicit fields.
    const body = {
      ...buildUpdatePayload(),
      ticketId: id,
      ownerId: ticket.owner?.id,
      assigneeId: sidebarDraft.assigneeId || ticket.assignee?.id || null,
      teamLeadIds: ticket.teamLeadIds || [],
    };

    // Destructive status (Cancel / Fail) → confirm before submitting.
    if (sidebarDraft.statusId !== ticket.status.id) {
      const targetStatus = statuses.find((s) => s.id === sidebarDraft.statusId);
      const statusName = targetStatus?.name.toLowerCase();
      if (
        statusName === StatusName.TRASH.toLowerCase() ||
        statusName === StatusName.FAILED.toLowerCase()
      ) {
        setPendingUpdate(body);
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
    }

    await submitStatusUpdate(body);
  };

  // Submit a status/field update through the shared, reusable status handler so
  // the board, modal and this page all enforce the same client-side rules.
  const submitStatusUpdate = async (body: any) => {
    setIsSaving(true);
    try {
      await handleStatusChange(body, user, {
        showNotification,
        setIsLoading,
        onSuccess: () => {
          setIsEditingAttachments(false);
          fetchTicket();
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  const buildUpdatePayload = () => {
    const payload: any = {};

    // Content changes (trim both sides to match the dirty-detection logic).
    if (subjectDraft.trim() !== (ticket!.subject || "").trim()) {
      payload.subject = subjectDraft.trim();
    }
    if (issueDraft.trim() !== (ticket!.issue || "").trim()) {
      payload.issue = issueDraft.trim();
    }
    if (
      JSON.stringify(attachmentsDraft) !==
      JSON.stringify(ticket!.attachments || [])
    ) {
      payload.attachments = attachmentsDraft;
    }

    // Sidebar changes
    if (sidebarDraft.statusId !== ticket!.status.id) {
      payload.statusId = sidebarDraft.statusId;
      payload.statusName = ticket!.status.name;
      // The backend's role-based transition rules key off these two fields
      // (same as the board/modal). Without them, employee/manager status
      // restrictions are silently skipped on the detail page.
      Object.assign(
        payload,
        buildStatusTransitionFields(
          ticket!.status.name,
          sidebarDraft.statusId,
          statuses,
        ),
      );
    }
    if (sidebarDraft.priorityId !== ticket!.priority.id) {
      payload.priorityId = sidebarDraft.priorityId;
    }
    if (sidebarDraft.assigneeId !== (ticket!.assignee?.id || "")) {
      payload.assigneeId = sidebarDraft.assigneeId;
    }
    if (sidebarDraft.qaId !== (ticket!.qa?.id || "")) {
      payload.qaId = sidebarDraft.qaId;
      payload.newQaName =
        qaList.find((q) => q.id === sidebarDraft.qaId)?.fullname || "";
    }
    const origDueDate = ticket!.dueDate
      ? new Date(ticket!.dueDate).toISOString().split("T")[0]
      : "";
    if (sidebarDraft.dueDate !== origDueDate) {
      payload.dueDate = sidebarDraft.dueDate || null;
    }
    if (
      JSON.stringify(sidebarDraft.tags) !== JSON.stringify(ticket!.tags || [])
    ) {
      payload.tags = sidebarDraft.tags;
    }

    return payload;
  };

  const executeUpdate = async (payload: any) => {
    setIsSaving(true);
    setIsLoading(true, UIMessages.LOADING.UPDATING_TICKET);
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(id!), payload);
      showNotification("success", "Ticket updated successfully");
      setIsEditingAttachments(false);
      fetchTicket();
    } catch (err: any) {
      console.error("Failed to update ticket", err);
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update ticket",
      );
    } finally {
      setIsSaving(false);
      setIsLoading(false, "");
    }
  };

  // --- Cancel editing: revert all drafts ---
  const handleCancelEditing = () => {
    if (!ticket) return;
    initDrafts(ticket);
    setIsEditingAttachments(false);
    setAttachmentsDraftError(null);
  };

  // --- Attachment helpers ---
  const startEditAttachments = () => {
    if (!ticket) return;
    setAttachmentsDraft(ticket.attachments || []);
    setAttachmentsDraftError(null);
    setIsEditingAttachments(true);
  };

  const cancelEditAttachments = () => {
    if (!ticket) return;
    setIsEditingAttachments(false);
    setAttachmentsDraft(ticket.attachments || []);
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

  // --- Comment handlers ---
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

  const submitComment = async () => {
    setIsSubmittingComment(true);
    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(id!), {
        comment: newComment,
        isNote,
        attachments: commentAttachments,
      });
      setNewComment("");
      setCommentAttachments([]);
      setCommentAttachmentError(null);
      setCommentCooldownActive(true);
      setTimeout(() => setCommentCooldownActive(false), 1000);
      refreshTicketData();
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

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() && commentAttachments.length === 0) return;
    if (commentSendDisabled) return;

    // A staff member posting on the public (client-visible) thread is asked to
    // confirm first, so they don't accidentally expose an internal remark.
    if (!isClient && !isNote) {
      setShowPublicCommentConfirm(true);
      return;
    }
    submitComment();
  };

  const handleClientDecision = async (decision: ClientDecision) => {
    const body = buildClientDecisionBody(decision, ticket, statuses);
    if (!body) return;
    await executeUpdate(body);
  };

  useEffect(() => {
    fetchTicket();
    if ((canAssign || canAssignQA) && ticket?.id) {
      fetchProjectMembers();
    }
  }, [id, canAssign, canAssignQA, ticket?.project?.id]);

  useEffect(() => {
    const handleTicketUpdate = (data: { ticketId: string }) => {
      if (data.ticketId === id) {
        refreshTicketData();
      }
    };

    socket.on("ticket:updated", handleTicketUpdate);

    return () => {
      socket.off("ticket:updated", handleTicketUpdate);
    };
  }, [id]);

  // Track the sidebar's height and size the comment feed to match it
  // (plus a little). Keeps the feed from extending well past the sidebar.
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const update = () => setFeedHeight(el.offsetHeight + 48);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ticket, activeTab]);

  if (loading || !ticket) return <TicketDetailSkeleton />;

  return (
    <div className="animate-fade-in">
      <TicketDetailHeader
        ticket={ticket}
        canEditContent={canEditContent}
        subjectDraft={subjectDraft}
        setSubjectDraft={setSubjectDraft}
      />

      {canShowCancelBanner(
        user?.role?.roleType,
        ticket.owner?.id === user?.id,
        ticket.status?.name,
      ) && (
        <div
          className="glass-card"
          style={{
            padding: 20,
            marginBottom: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderLeft: "4px solid var(--accent-danger)",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
              Cancel Ticket
            </h3>
            <p
              style={{
                margin: 0,
                color: "var(--text-secondary)",
                fontSize: "0.9rem",
              }}
            >
              Your ticket is currently unassigned. You can cancel it if it's no
              longer needed.
            </p>
          </div>
          <CustomButton
            variant="outline"
            onClick={() => setPendingDecision("cancel")}
            icon={<CustomIcon name="Trash2" size={16} />}
            style={{
              borderColor: "var(--accent-danger)",
              color: "var(--accent-danger)",
            }}
            loading={isSaving}
          >
            Cancel Ticket
          </CustomButton>
        </div>
      )}

      {ticket.owner?.id === user?.id &&
        ticket.status.name === StatusName.APPROVED &&
        (() => {
          const daysLeft = (() => {
            const updatedAt = ticket.updatedAt;
            if (!updatedAt) return 20;
            const diffTime = Math.abs(
              new Date().getTime() - new Date(updatedAt).getTime(),
            );
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return Math.max(0, Math.ceil(20 - diffDays));
          })();

          return (
            <div
              className="glass-card"
              style={{
                padding: 20,
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderLeft: "4px solid var(--accent-success)",
              }}
            >
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}>
                  Review Required
                </h3>
                <p
                  style={{
                    margin: 0,
                    color: "var(--text-secondary)",
                    fontSize: "0.9rem",
                  }}
                >
                  Your ticket has been marked as Resolved. Please let us know if
                  you are satisfied with the resolution.
                </p>
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CustomIcon name="Clock" size={14} />
                  <span>
                    The ticket will automatically closed in 20 days if no
                    response. ({daysLeft} days remaining)
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <CustomButton
                  variant="outline"
                  onClick={() => setPendingDecision("unsatisfied")}
                  icon={<CustomIcon name="XCircle" size={16} />}
                  style={{
                    borderColor: "var(--accent-danger)",
                    color: "var(--accent-danger)",
                  }}
                  loading={isSaving}
                >
                  Unsatisfied
                </CustomButton>
                <CustomButton
                  variant="primary"
                  onClick={() => setPendingDecision("satisfied")}
                  icon={<CustomIcon name="CheckCircle2" size={16} />}
                  style={{ background: "var(--accent-success)" }}
                  loading={isSaving}
                >
                  Satisfied
                </CustomButton>
              </div>
            </div>
          );
        })()}

      <div className={styles.container}>
        <div className={styles.leftColumn}>
          <div className={`${styles.ticketInfo} glass-card`}>
            <TicketDetailDescription
              ticket={ticket}
              canEditContent={canEditContent}
              issueDraft={issueDraft}
              setIssueDraft={setIssueDraft}
            />

            <TicketDetailAttachments
              ticket={ticket}
              canEditContent={canEditContent}
              isEditingAttachments={isEditingAttachments}
              attachmentsDraft={attachmentsDraft}
              attachmentsDraftError={attachmentsDraftError}
              attachmentsEditFileInputRef={attachmentsEditFileInputRef}
              startEditAttachments={startEditAttachments}
              cancelEditAttachments={cancelEditAttachments}
              handleAttachmentsDraftSelect={handleAttachmentsDraftSelect}
              removeAttachmentDraft={removeAttachmentDraft}
              openLightbox={openLightbox}
            />
          </div>

          <div className={styles.tabs}>
            <div
              className={`${styles.tab} ${activeTab === "comments" ? styles.tabActive : ""}`}
              onClick={() => {
                setActiveTab("comments");
                setIsNote(false);
              }}
            >
              Comments ({ticket.comments.filter((c: any) => !c.isNote).length})
            </div>
            {user?.role?.roleType !== ROLE_TYPE.CUSTOMER && (
              <div
                className={`${styles.tab} ${activeTab === "internal" ? styles.tabActive : ""}`}
                onClick={() => {
                  setActiveTab("internal");
                  setIsNote(true);
                }}
              >
                Internal ({ticket.comments.filter((c: any) => c.isNote).length})
              </div>
            )}
            <div
              className={`${styles.tab} ${activeTab === "history" ? styles.tabActive : ""}`}
              onClick={() => setActiveTab("history")}
            >
              History
            </div>
          </div>

          {activeTab !== "history" ? (
            <TicketDetailComments
              ticket={ticket}
              user={user}
              isInternal={activeTab === "internal"}
              newComment={newComment}
              setNewComment={setNewComment}
              isNote={isNote}
              setIsNote={setIsNote}
              commentAttachments={commentAttachments}
              commentAttachmentError={commentAttachmentError}
              commentFileInputRef={commentFileInputRef}
              handleCommentAttachmentSelect={handleCommentAttachmentSelect}
              removeCommentAttachment={removeCommentAttachment}
              handleAddComment={handleAddComment}
              isSubmittingComment={isSubmittingComment}
              commentSendDisabled={commentSendDisabled}
              openLightbox={openLightbox}
              feedHeight={feedHeight}
            />
          ) : (
            <TicketDetailHistory
              ticket={ticket}
              user={user}
              feedHeight={feedHeight}
            />
          )}
        </div>

        <div ref={sidebarRef}>
          <TicketDetailSidebar
            ticket={ticket}
            user={user}
            statuses={statuses}
            priorities={priorities}
            agents={agents}
            qaList={qaList}
            canUpdatePriority={canUpdatePriority}
            canAssign={canAssign}
            sidebarDraft={sidebarDraft}
            onSidebarDraftChange={onSidebarDraftChange}
            handleStartChat={handleStartChat}
          />
        </div>

        <ConfirmationModal
          isOpen={isConfirmModalOpen}
          onClose={() => {
            setIsConfirmModalOpen(false);
            // Revert status on cancel
            if (ticket) {
              setSidebarDraft((prev) => ({
                ...prev,
                statusId: ticket.status.id,
              }));
            }
          }}
          onConfirm={() => {
            if (pendingUpdate) submitStatusUpdate(pendingUpdate);
            setIsConfirmModalOpen(false);
          }}
          title={confirmConfig.title}
          message={confirmConfig.message}
          type={confirmConfig.type}
          confirmText="Confirm"
        />

        <ConfirmationModal
          isOpen={pendingDecision !== null}
          onClose={() => setPendingDecision(null)}
          onConfirm={() => {
            const decision = pendingDecision;
            setPendingDecision(null);
            if (decision) handleClientDecision(decision);
          }}
          {...getDecisionDialog(pendingDecision)}
        />

        <ConfirmationModal
          isOpen={showPublicCommentConfirm}
          onClose={() => setShowPublicCommentConfirm(false)}
          onConfirm={() => {
            setShowPublicCommentConfirm(false);
            submitComment();
          }}
          title="Post public comment?"
          message="This comment will be visible to the client. Are you sure you want to post it here? Use the Internal tab for team-only notes."
          confirmText="Yes, Post Comment"
          cancelText="Cancel"
          type="warning"
        />
      </div>

      {/* Floating Update Bar */}
      {hasAnyChanges &&
        createPortal(
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              background:
                "linear-gradient(to top, rgba(var(--bg-primary-rgb, 10, 10, 20), 0.98), rgba(var(--bg-primary-rgb, 10, 10, 20), 0.85))",
              backdropFilter: "blur(16px)",
              borderTop: "1px solid var(--border-glass)",
              padding: "14px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 12,
              animation: "slideUp 0.25s ease-out",
            }}
          >
            <span
              style={{
                marginRight: "auto",
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
              }}
            >
              <CustomIcon name="AlertCircle" size={16} /> You have unsaved
              changes
            </span>
            <CustomButton
              variant="ghost"
              onClick={handleCancelEditing}
              disabled={isSaving}
            >
              Discard
            </CustomButton>
            <CustomButton
              variant="gradient"
              onClick={handleUpdate}
              loading={isSaving}
              icon={<CustomIcon name="Save" size={16} />}
            >
              Update Ticket
            </CustomButton>
          </div>,
          document.body,
        )}

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

            <CustomImage
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
