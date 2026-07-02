import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Modal from "../../../components/Modal";
import CustomIcon from "../../../components/CustomIcon";
import CustomSelect from "../../../components/CustomSelect";
import CustomButton from "../../../components/CustomButton";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import {
  TICKET_STATUSES,
  StatusName,
  UIMessages,
} from "../../../utils/constants";
import { useAuth } from "../../../context/AuthContext";
import { useNotification } from "../../../context/NotificationContext";
import CustomTextArea from "../../../components/CustomTextArea";
import CustomDatePicker from "../../../components/CustomDatePicker";
import CustomDropdownMenu from "../../../components/CustomDropdownMenu";
import ConfirmationModal from "../../../components/ConfirmationModal";
import CustomSkeleton from "../../../components/CustomSkeleton";
import CustomBadge from "../../../components/CustomBadge";
import { socket } from "../../../services/socket";
import type {
  TicketUpdateFormData,
  TicketDetailModalProps,
} from "../../../types";
import styles from "../ticketDetailsModal/TicketDetailModal.module.css";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  readAttachmentFiles,
} from "../../../utils/attachments";
import CommentSection from "../ticket-details/ticket-details-modal/components/CommentsSection";
import CustomImage from "../../../components/CustomImage";
import {
  type ClientDecision,
  buildClientDecisionBody,
  getDecisionDialog,
  canShowCancelBanner,
  canEmployeeEditDueDate,
} from "../shared/ticketDecisions";
import { ROLE_TYPE } from "../../roles/roleConstants";

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  users,
  qaList,
  priorities,
  onTicketUpdate,
}) => {
  console.log("users", users);
  console.log("qaList", qaList);
  console.log("priorities", priorities);

  const isDisbaledMode =
    ticket?.status?.name === StatusName.TRASH ||
    ticket?.status?.name === StatusName.CLOSED;

  const { user } = useAuth();
  const isClient = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  const { showNotification, setIsLoading } = useNotification();
  const navigate = useNavigate();
  const { control, handleSubmit, reset, watch, setValue, formState } =
    useForm<TicketUpdateFormData>({
      defaultValues: {
        statusId: ticket?.status?.id || "",
        targetStatusName: ticket?.status?.name || "",
        currentStatusName: ticket?.status?.name || "",
        priorityId: ticket?.priority?.id || "",
        assigneeId: ticket?.assignee?.id || "",
        qaId: ticket?.qa?.id || "",
        dueDate: ticket?.dueDate
          ? new Date(ticket.dueDate).toISOString().split("T")[0]
          : "",
        issue: ticket?.issue || "",
      },
    });

  const [fullTicketData, setFullTicketData] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // Pending client decision (Cancel / Satisfied / Unsatisfied) awaiting
  // confirmation. Shared dialog copy comes from getDecisionDialog().
  const [pendingDecision, setPendingDecision] = useState<ClientDecision | null>(
    null,
  );

  // Close guard: warn before discarding unsaved ticket-field changes (form
  // fields or pending attachment edits). Comments are separate state, so they
  // never trigger this.
  const handleRequestClose = () => {
    if (formState.isDirty || attachmentsDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  // Lightbox state
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

  // Ticket-level attachment editor state
  const [isEditingAttachments, setIsEditingAttachments] = useState(false);
  const [attachmentsDraft, setAttachmentsDraft] = useState<string[]>([]);
  const [attachmentsDraftError, setAttachmentsDraftError] = useState<
    string | null
  >(null);
  const [isSavingAttachments, setIsSavingAttachments] = useState(false);
  const attachmentsEditFileInputRef = useRef<HTMLInputElement>(null);

  // Comment attachment state
  const [commentAttachments, setCommentAttachments] = useState<string[]>([]);
  const [commentAttachmentError, setCommentAttachmentError] = useState<
    string | null
  >(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCooldownActive, setCommentCooldownActive] = useState(false);
  const commentSendDisabled = isSubmittingComment || commentCooldownActive;

  const statuses = TICKET_STATUSES;

  const fetchFullTicketData = useCallback(async () => {
    try {
      const res = await api.get(API_ROUTES.TICKETS.BY_ID(ticket.id));
      const t = res.data.ticket;
      setFullTicketData(t);
      reset({
        statusId: t.status?.id || "",
        priorityId: t.priority?.id || "",
        assigneeId: t.assignee?.id || "",
        qaId: t.qa?.id || "",
        dueDate: t.dueDate
          ? new Date(t.dueDate).toISOString().split("T")[0]
          : "",
        issue: t.issue || "",
      });
    } catch (err: any) {
      console.error("Failed to fetch full ticket data", err);
    }
  }, [ticket?.id, reset]);

  const handleSave = async (data: TicketUpdateFormData) => {
    const targetStatus =
      statuses.find((c: any) => c.id === data.statusId)?.name || "";
    if (
      displayTicket?.status?.name == StatusName.NEW &&
      targetStatus == StatusName.OPEN &&
      !data.assigneeId
    ) {
      showNotification("warning", "Please assign this ticket");
      return;
    }

    const newAssigneeName =
      users.find((agent) => agent.id === data.assigneeId)?.fullname || "";

    const newQaName = qaList.find((qa) => qa.id === data.qaId)?.fullname || "";

    const body: any = {
      ticketId: ticket.id,
      statusId: data.statusId,
      targetStatusName: targetStatus,
      currentStatusName: displayTicket?.status?.name || "",
      priorityId: data.priorityId,
      assigneeId: data.assigneeId || null,
      qaId: data.qaId || null,
      dueDate: data.dueDate || null,
      issue: data.issue,
      newAssigneeName: newAssigneeName,
      newQaName: newQaName,
    };

    // Persist attachment edits through the same Save when the draft changed.
    if (
      isEditingAttachments &&
      JSON.stringify(attachmentsDraft) !==
        JSON.stringify(displayTicket?.attachments || [])
    ) {
      body.attachments = attachmentsDraft;
    }

    onTicketUpdate(body);
  };

  const handleClientDecision = async (decision: ClientDecision) => {
    const body = buildClientDecisionBody(decision, displayTicket, statuses);
    if (!body) return;
    onTicketUpdate(body);
  };

  const handleAddComment = async (e: React.FormEvent, isNote = false) => {
    e.preventDefault();
    if (!newComment.trim() && commentAttachments.length === 0) return;
    if (commentSendDisabled) return;

    setIsSubmittingComment(true);
    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(ticket.id), {
        comment: newComment,
        isNote,
        attachments: commentAttachments,
      });
      setNewComment("");
      setCommentAttachments([]);
      setCommentAttachmentError(null);
      setCommentCooldownActive(true);
      setTimeout(() => setCommentCooldownActive(false), 1000);
      fetchFullTicketData();
    } catch (err: any) {
      showNotification("error", "Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
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

  const startEditAttachments = () => {
    setAttachmentsDraft(displayTicket.attachments || []);
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
    setIsSavingAttachments(true);
    try {
      await api.put(API_ROUTES.TICKETS.BY_ID(ticket.id), {
        attachments: attachmentsDraft,
      });
      showNotification("success", "Attachments updated");
      setIsEditingAttachments(false);
      fetchFullTicketData();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to update attachments",
      );
    } finally {
      setIsSavingAttachments(false);
    }
  };

  const handleDeleteTicket = async () => {
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.TICKETS.BY_ID(ticket.id));
      showNotification("success", "Ticket deleted successfully!");
      setIsDeleteModalOpen(false);
      onClose();
      // onTicketUpdate();
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

  useEffect(() => {
    if (isOpen && ticket?.id) {
      fetchFullTicketData();

      // Listen for socket updates for this ticket
      const handleTicketUpdate = (data: any) => {
        if (data.ticketId === ticket.id) {
          fetchFullTicketData();
        }
      };

      socket.on("ticket:updated", handleTicketUpdate);
      return () => {
        socket.off("ticket:updated", handleTicketUpdate);
      };
    } else {
      setFullTicketData(null);
    }
  }, [isOpen, ticket?.id, fetchFullTicketData]);

  if (!ticket) return null;

  const displayTicket = fullTicketData || ticket;

  // Client decisions (Cancel / Satisfied / Unsatisfied) are personal to the
  // person who raised the ticket — other client team members must not see them.
  const isTicketOwner = displayTicket?.owner?.id === user?.id;

  // Attachments have their own editor; treat a changed draft as a pending
  // change so the main "Save Changes" button enables (and saves) too.
  const attachmentsDirty =
    isEditingAttachments &&
    JSON.stringify(attachmentsDraft) !==
      JSON.stringify(displayTicket?.attachments || []);

  const canAssign =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.tickets?.assign;

  const canAssignQA =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.AGENT;

  const canUpdate =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.tickets?.update ||
    user?.id === displayTicket.owner.id;

  const canViewComments =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.comments?.view;
  const canCreateComments =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.comments?.create;

  // Mirror TicketDetail's content-edit gate.
  const canEditContent = (() => {
    if (!ticket || !user) return false;
    const role = user.role?.roleType;
    const isAdmin = role === ROLE_TYPE.ADMIN;
    const isManager = role === ROLE_TYPE.AGENT;
    const isClient = role === ROLE_TYPE.CUSTOMER;
    const isOwner = ticket.owner.id === user.id;
    // const isAssignee = ticket.assignee?.id === user.id;
    const ticketIsNew = ticket.status?.name === StatusName.NEW;
    return isAdmin || isManager || (isClient && isOwner && ticketIsNew);
  })();

  const disabledDueDateEdit = user?.role?.roleType === ROLE_TYPE.QA;

  // Employees can only set the due date while the ticket is in the "Assigned"
  // status (i.e. assigned to an employee) — disabled in every other status.
  const disableDueDateForEmployees =
    user?.role?.roleType === ROLE_TYPE.EMPLOYEE &&
    !canEmployeeEditDueDate(displayTicket?.status?.name);

  const getStatusOptions = (columns: any[]) => {
    return columns.map((s: any) => ({
      value: s.id,
      label: s.name,
      icon: <CustomIcon name="Clock" size={14} color={s.color} />,
      disabled: !(
        user?.role?.roleType === ROLE_TYPE.ADMIN ||
        user?.role?.permissions?.boardStatuses?.[s.id] === true ||
        (displayTicket.owner.id === user?.id &&
          (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
            s.name.toLowerCase() === StatusName.TRASH.toLowerCase() ||
            s.name.toLowerCase() === StatusName.FAILED.toLowerCase()))
      ),
    }));
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        maxWidth="1500px"
        className={styles.ticketModal}
        title={
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {`Ticket #${displayTicket.uid}: ${displayTicket.subject}`}
            </span>
            {displayTicket?.wasFailed && (
              <span
                title="This ticket was marked as Failed/Returned at some point"
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 10px",
                  borderRadius: 12,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                  color: "var(--accent-danger, #ef4444)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                }}
              >
                <CustomIcon name="Flag" size={12} />
                Returned
              </span>
            )}
          </span>
        }
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
              ...(user?.role?.roleType === ROLE_TYPE.ADMIN
                ? [
                    {
                      label: "Delete Ticket",
                      icon: "Trash2",
                      onClick: () => {
                        setIsDeleteModalOpen(true);
                      },
                      danger: true,
                    },
                  ]
                : []),
            ]}
          />
        }
        footer={
          isClient &&
          displayTicket?.status?.name !== StatusName.NEW ? undefined : (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 12,
                width: "100%",
              }}
            >
              <CustomButton variant="ghost" onClick={handleRequestClose}>
                Close
              </CustomButton>
              <CustomButton
                variant="gradient"
                onClick={handleSubmit(handleSave)}
                disabled={!formState.isDirty && !attachmentsDirty}
                icon={<CustomIcon name="Save" size={18} />}
              >
                Save Changes
              </CustomButton>
            </div>
          )
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
                <CustomSkeleton width={140} height={36} borderRadius={8} />
                <CustomSkeleton width={180} height={36} borderRadius={8} />
                <CustomSkeleton width={160} height={36} borderRadius={8} />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 20,
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <CustomSkeleton width={100} height={14} />
                  <CustomSkeleton width="100%" height={200} borderRadius={12} />
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <CustomSkeleton width={80} height={14} />
                      <CustomSkeleton
                        width="100%"
                        height={60}
                        borderRadius={12}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right Skeleton (Comments) */}
            <div
              style={{
                borderLeft: "1px solid var(--border-glass)",
                paddingLeft: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <CustomSkeleton width={140} height={18} />
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="glass-card"
                  style={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <CustomSkeleton width={100} height={12} />
                    <CustomSkeleton width={60} height={10} />
                  </div>
                  <CustomSkeleton width="90%" height={14} />
                </div>
              ))}
              <CustomSkeleton
                width="100%"
                height={48}
                borderRadius={10}
                style={{ marginTop: "auto" }}
              />
            </div>
          </div>
        ) : (
          <div className={styles.modalContainer}>
            <div className={styles.grid}>
              {/* Left Column: Details */}
              <div className={styles.leftColumn}>
                {canShowCancelBanner(
                  user?.role?.roleType,
                  isTicketOwner,
                  displayTicket?.status?.name,
                ) && (
                  <div
                    className="glass-card"
                    style={{
                      padding: 20,
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
                        Your ticket is currently unassigned. You can cancel it
                        if it's no longer needed.
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
                    >
                      Cancel Ticket
                    </CustomButton>
                  </div>
                )}
                {isClient &&
                  isTicketOwner &&
                  displayTicket?.status?.name === StatusName.APPROVED &&
                  (() => {
                    const daysLeft = (() => {
                      const updatedAt = displayTicket.updatedAt;
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
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderLeft: "4px solid var(--accent-success)",
                        }}
                      >
                        <div>
                          <h3
                            style={{ margin: "0 0 4px 0", fontSize: "1.1rem" }}
                          >
                            Review Required
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              color: "var(--text-secondary)",
                              fontSize: "0.9rem",
                            }}
                          >
                            Your ticket has been marked as Resolved. Please let
                            us know if you are satisfied with the resolution.
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
                              The ticket will automatically closed in 20 days if
                              no response. ({daysLeft} days remaining)
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
                          >
                            Unsatisfied
                          </CustomButton>
                          <CustomButton
                            variant="primary"
                            onClick={() => setPendingDecision("satisfied")}
                            icon={<CustomIcon name="CheckCircle2" size={16} />}
                            style={{ background: "var(--accent-success)" }}
                          >
                            Satisfied
                          </CustomButton>
                        </div>
                      </div>
                    );
                  })()}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CustomIcon
                    name="FolderKanban"
                    size={16}
                    color="var(--accent-primary)"
                  />
                  <span style={{ fontWeight: 600 }}>Project:</span>
                  <span style={{ color: "var(--text-primary)" }}>
                    {displayTicket.project?.name || "None"}
                  </span>
                </div>

                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  {/* Header Badges */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      flexWrap: "nowrap",
                      alignItems: "center",
                    }}
                  >
                    {user?.role?.roleType !== ROLE_TYPE.CUSTOMER ? (
                      <CustomSelect
                        name="priorityId"
                        control={control}
                        options={priorities.map((p) => ({
                          value: p.id,
                          label: p.name,
                          icon: (
                            <CustomIcon name="Tag" size={14} color={p.color} />
                          ),
                        }))}
                        style={{
                          minWidth: 140,
                          fontSize: "0.8rem",
                        }}
                        disabled={isDisbaledMode}
                      />
                    ) : (
                      <CustomBadge
                        color={displayTicket.priority.color}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                        }}
                      >
                        <CustomIcon name="Tag" size={16} />{" "}
                        {displayTicket.priority.name}
                      </CustomBadge>
                    )}
                    {user?.role?.roleType !== ROLE_TYPE.CUSTOMER &&
                    !(
                      user?.role?.roleType === ROLE_TYPE.EMPLOYEE &&
                      displayTicket?.status?.name === StatusName.APPROVED
                    ) ? (
                      <CustomSelect
                        name="statusId"
                        control={control}
                        options={getStatusOptions(statuses)}
                        style={{
                          minWidth: 180,
                          fontSize: "0.8rem",
                        }}
                        disabled={isDisbaledMode}
                      />
                    ) : (
                      <CustomBadge
                        color={displayTicket.status.color}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                        }}
                      >
                        <CustomIcon name="Status" size={16} />{" "}
                        {displayTicket.status.name}
                      </CustomBadge>
                    )}
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
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                  }}
                >
                  <CustomTextArea
                    name="issue"
                    control={control}
                    label={
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <CustomIcon
                          name="Info"
                          size={16}
                          color="var(--accent-primary)"
                        />
                        <span>Description</span>
                      </div>
                    }
                    disabled={!canEditContent || isDisbaledMode}
                    placeholder={
                      canEditContent
                        ? "Add a description..."
                        : "No description provided"
                    }
                    rows={6}
                    containerStyle={{ height: "100%" }}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      fontSize: "0.95rem",
                      cursor: !canEditContent ? "not-allowed" : "text",
                      resize: !canEditContent ? "none" : "vertical",
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
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
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
                      name="dueDate"
                      control={control}
                      label={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <CustomIcon
                            name="Clock"
                            size={18}
                            color="var(--accent-primary)"
                          />
                          <span>Due Date</span>
                        </div>
                      }
                      min={new Date().toISOString().split("T")[0]}
                      disabled={
                        !canUpdate ||
                        isDisbaledMode ||
                        isClient ||
                        disabledDueDateEdit ||
                        disableDueDateForEmployees
                      }
                    />

                    {/* Assignment */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
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
                            name="assigneeId"
                            control={control}
                            options={[
                              {
                                value: "",
                                label: "Unassigned",
                                icon: <CustomIcon name="UserPlus" size={14} />,
                              },
                              ...users.map((agent) => ({
                                value: agent.id,
                                label: agent.fullname,
                                image: agent.image,
                              })),
                            ]}
                            onChange={(val) => {
                              setValue("assigneeId", val, {
                                shouldDirty: true,
                              });
                              if (val) {
                                const openStatus = statuses.find(
                                  (c: any) =>
                                    c.name.toLowerCase() ===
                                    StatusName.OPEN.toLowerCase(),
                                );
                                if (
                                  openStatus &&
                                  watch("statusId") !== openStatus.id
                                ) {
                                  setValue("statusId", openStatus.id, {
                                    shouldDirty: true,
                                  });
                                  setValue(
                                    "targetStatusName",
                                    openStatus.name,
                                    { shouldDirty: true },
                                  );
                                }
                              }
                            }}
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

                    {/* QA Assignment — hidden from clients */}
                    {!isClient && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
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
                          QA Assignee
                        </label>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                          }}
                        >
                          {canAssignQA && (
                            <CustomSelect
                              name="qaId"
                              control={control}
                              options={[
                                {
                                  value: "",
                                  label: "Unassigned",
                                  icon: (
                                    <CustomIcon name="UserPlus" size={14} />
                                  ),
                                },
                                ...qaList.map((qaUser) => ({
                                  value: qaUser.id,
                                  label: qaUser.fullname,
                                  image: qaUser.image,
                                })),
                              ]}
                              onChange={(val) => {
                                setValue("qaId", val, {
                                  shouldDirty: true,
                                });
                              }}
                              disabled={!canAssignQA}
                              placeholder="Assign QA..."
                            />
                          )}

                          {!canAssignQA && (
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
                              {displayTicket.qa ? (
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
                                    {displayTicket.qa.fullname.charAt(0)}
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
                                      {displayTicket.qa.fullname}
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
                    )}
                  </div>
                </div>

                {/* Created / Updated timestamps */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 20,
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: -16,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CustomIcon name="Calendar" size={13} />
                    Created{" "}
                    {format(new Date(displayTicket.createdAt), "MMM dd, yyyy")}
                  </span>
                  {displayTicket.updatedAt && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <CustomIcon name="RefreshCw" size={13} />
                      Updated{" "}
                      {format(
                        new Date(displayTicket.updatedAt),
                        "MMM dd, yyyy",
                      )}
                    </span>
                  )}
                </div>

                {/* Ticket attachments */}
                {(canEditContent ||
                  (displayTicket.attachments &&
                    displayTicket.attachments.length > 0)) && (
                  <div>
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
                          style={{ display: "flex", flexWrap: "wrap", gap: 10 }}
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
                              <CustomImage
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
                                title="Remove"
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
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <CustomIcon
                            name="Paperclip"
                            size={16}
                            color="var(--accent-primary)"
                          />
                          <span
                            style={{
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              color: "var(--text-secondary)",
                            }}
                          >
                            Attachments
                          </span>
                        </div>
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
                            {displayTicket.attachments &&
                            displayTicket.attachments.length > 0 ? (
                              displayTicket.attachments.map(
                                (src: string, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      openLightbox(
                                        displayTicket.attachments,
                                        idx,
                                      )
                                    }
                                    title="View image"
                                    style={{
                                      display: "block",
                                      width: 80,
                                      height: 80,
                                      borderRadius: 8,
                                      overflow: "hidden",
                                      border: "1px solid var(--border-glass)",
                                      padding: 0,
                                      cursor: "zoom-in",
                                      background: "transparent",
                                    }}
                                  >
                                    <CustomImage
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
                              )
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
                      </div>
                    )}
                  </div>
                )}
                {/* Description */}
              </div>

              {/* Right Column: Comments */}
              {canViewComments && (
                <CommentSection
                  fullTicketData={fullTicketData}
                  user={user}
                  canCreateComments={canCreateComments}
                  handleAddComment={handleAddComment}
                  setNewComment={setNewComment}
                  newComment={newComment}
                  commentAttachments={commentAttachments}
                  handleCommentAttachmentSelect={handleCommentAttachmentSelect}
                  removeCommentAttachment={removeCommentAttachment}
                  commentAttachmentError={commentAttachmentError}
                  openLightbox={openLightbox}
                  commentSendDisabled={commentSendDisabled}
                  isSubmittingComment={isSubmittingComment}
                />
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

      <ConfirmationModal
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={handleConfirmDiscard}
        title="Discard changes?"
        message="You have unsaved changes. If you close now, your changes will be discarded."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        type="warning"
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

      {lightbox &&
        createPortal(
          <div
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
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
    </>
  );
};

export default TicketDetailModal;
