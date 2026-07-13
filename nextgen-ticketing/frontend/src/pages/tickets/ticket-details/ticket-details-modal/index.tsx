/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import Modal from "../../../../components/Modal";
import CustomIcon from "../../../../components/CustomIcon";
import CustomButton from "../../../../components/CustomButton";
import api from "../../../../services/api";
import { API_ROUTES } from "../../../../utils/apiRoutes";
import {
  TICKET_STATUSES,
  StatusName,
  UIMessages,
} from "../../../../utils/constants";
import { useAuth } from "../../../../context/AuthContext";
import { useNotification } from "../../../../context/NotificationContext";
import ConfirmationModal from "../../../../components/ConfirmationModal";
import { socket } from "../../../../services/socket";
import type {
  TicketUpdateFormData,
  TicketDetailModalProps,
} from "../../../../types";
import CommentSection from "./components/CommentsSection";
import ModalSkeleton from "./components/ModalSkeleton";
import ClientDecisionBanner from "./components/ClientDecisionBanner";
import ModalDetailsForm from "./components/ModalDetailsForm";
import ModalAttachments from "./components/ModalAttachments";
import ModalTimestamps from "./components/ModalTimestamps";
import styles from "./TicketDetailModal.module.css";
import { readAttachmentFiles } from "../../../../utils/attachments";
import CustomDropdownMenu from "./components/CustomDropDownTicketModal";
import CustomImage from "../../../../components/CustomImage";
import { ROLE_TYPE } from "../../../roles/roleConstants";

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  onClose,
  ticket,
  users,
  qaList,
  priorities,
  onTicketUpdate,
}) => {
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
        tags: ticket?.tags || [],
      },
    });

  const [fullTicketData, setFullTicketData] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // Confirm before a staff member posts on the client-visible (public) thread.
  const [showPublicCommentConfirm, setShowPublicCommentConfirm] =
    useState(false);

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

  const [localUsers, setLocalUsers] = useState(users);
  const [localQaList, setLocalQaList] = useState(qaList);



  useEffect(() => {
    // If ticket has a project, fetch the assignable users just for that project
    const fetchProjectMembers = async () => {
      const projectId = ticket?.project?.id || fullTicketData?.project?.id;
      if (!projectId) {
        setLocalUsers(users);
        setLocalQaList(qaList);
        return;
      }

      try {
        const res = await api.get(API_ROUTES.PROJECTS.MEMBERS(projectId));
        const members = res.data.members || [];
        setLocalUsers(
          members.filter(
            (m: any) =>
              m.role.roleType === ROLE_TYPE.EMPLOYEE ||
              m.role.roleType === ROLE_TYPE.AGENT ||
              m.role.roleType === ROLE_TYPE.ADMIN,
          ),
        );
        setLocalQaList(
          members.filter((m: any) => m.role.roleType === ROLE_TYPE.QA),
        );
      } catch (err) {
        console.error("Failed to fetch project members for modal", err);
        setLocalUsers(users);
        setLocalQaList(qaList);
      }
    };

    if (isOpen) {
      fetchProjectMembers();
    }
  }, [isOpen, ticket?.project?.id, fullTicketData?.project?.id, users, qaList]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
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
        tags: t.tags || [],
      });
    } catch (err: any) {
      console.error("Failed to fetch full ticket data", err);
    }
  }, [ticket?.id, reset]);

  const handleSave = async (data: TicketUpdateFormData) => {
    const targetStatus =
      statuses.find((c: any) => c.id === data.statusId)?.name || "";
    if (
      displayTicket?.status?.name === StatusName.NEW &&
      targetStatus === StatusName.OPEN &&
      !data.assigneeId
    ) {
      showNotification("warning", "Please assign this ticket");
      return;
    }

    const newAssigneeName =
      localUsers.find((agent: any) => agent.id === data.assigneeId)?.fullname ||
      "";

    const newQaName =
      localQaList.find((qa: any) => qa.id === data.qaId)?.fullname || "";
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
      tags: data.tags || [],
      teamLeadIds: ticket.teamLeadIds || fullTicketData?.teamLeadIds || [],
    };

    if (
      isEditingAttachments &&
      JSON.stringify(attachmentsDraft) !==
        JSON.stringify(displayTicket?.attachments || [])
    ) {
      body.attachments = attachmentsDraft;
    }

    onTicketUpdate(body);
  };

  const handleClientDecision = async (
    decision: "satisfied" | "unsatisfied" | "cancel",
  ) => {
    let targetStatusName;
    if (decision === "satisfied") targetStatusName = StatusName.CLOSED;
    else if (decision === "unsatisfied") targetStatusName = StatusName.FAILED;
    else targetStatusName = StatusName.TRASH;

    const targetStatus = statuses.find((s: any) => s.name === targetStatusName);
    if (!targetStatus) return;

    const body = {
      ticketId: ticket.id,
      statusId: targetStatus.id,
      targetStatusName: targetStatus.name,
      currentStatusName: displayTicket?.status?.name || "",
      priorityId: displayTicket?.priority?.id,
      assigneeId: displayTicket?.assignee?.id || null,
      // Owner context so the shared status gate lets the owner take their
      // decision (Satisfied → Closed, Unsatisfied → Failed, Cancel → Trash).
      ownerId: displayTicket?.owner?.id,
      issue: displayTicket?.issue,
    };
    onTicketUpdate(body);
  };

  const submitComment = async (isInternal: boolean) => {
    setIsSubmittingComment(true);
    try {
      await api.post(API_ROUTES.TICKETS.COMMENTS(ticket.id), {
        comment: newComment,
        // Comments sent from the Internal tab are saved as internal notes so
        // they stay in the internal thread (and are hidden from clients).
        isNote: isInternal,
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

  const handleAddComment = (
    e: React.FormEvent,
    isInternal: boolean = false,
  ) => {
    e.preventDefault();
    if (!newComment.trim() && commentAttachments.length === 0) return;
    if (commentSendDisabled) return;

    // A staff member posting on the public (client-visible) thread is asked to
    // confirm first, so they don't accidentally expose an internal remark.
    if (!isClient && !isInternal) {
      setShowPublicCommentConfirm(true);
      return;
    }
    submitComment(isInternal);
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
  const isTicketOwner = displayTicket?.owner?.id === user?.id;

  const attachmentsDirty =
    isEditingAttachments &&
    JSON.stringify(attachmentsDraft) !==
      JSON.stringify(displayTicket?.attachments || []);

  // Team leads of the ticket's project can assign it to their team members.
  const isLeadOfTicket = !!displayTicket?.teamLeadIds?.includes(user?.id);

  const canAssign =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.tickets?.assign ||
    isLeadOfTicket;

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

  const canEditContent = (() => {
    if (!ticket || !user) return false;
    const role = user.role?.roleType;
    const isAdmin = role === ROLE_TYPE.ADMIN;
    const isManager = role === ROLE_TYPE.AGENT;
    const isClientUser = role === ROLE_TYPE.CUSTOMER;
    const isOwner = ticket.owner.id === user.id;
    const ticketIsNew = ticket.status?.name === StatusName.NEW;
    return isAdmin || isManager || (isClientUser && isOwner && ticketIsNew);
  })();

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

  const Title = () => {
    return (
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
    );
  };

  const HeaderAction = () => {
    return (
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
              onClose();
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
    );
  };

  const Footer = () => {
    return isClient &&
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
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleRequestClose}
        maxWidth="1500px"
        className={styles.ticketModal}
        title={<Title />}
        headerAction={<HeaderAction />}
        footer={<Footer />}
      >
        {!fullTicketData ? (
          <ModalSkeleton />
        ) : (
          <div className={styles.modalContainer}>
            <div className={styles.grid}>
              {/* Left Column: Details */}
              <div className={styles.leftColumn}>
                <ClientDecisionBanner
                  isClient={isClient}
                  isTicketOwner={isTicketOwner}
                  displayTicket={displayTicket}
                  isSaving={formState.isSubmitting}
                  handleClientDecision={handleClientDecision}
                />

                <ModalDetailsForm
                  control={control}
                  setValue={setValue}
                  watch={watch}
                  formState={formState}
                  displayTicket={displayTicket}
                  users={localUsers}
                  qaList={localQaList}
                  priorities={priorities}
                  statuses={statuses}
                  isDisbaledMode={isDisbaledMode}
                  canEditContent={canEditContent}
                  canUpdate={canUpdate}
                  canAssign={canAssign}
                  canAssignQA={canAssignQA}
                  isClient={isClient}
                  isTicketOwner={isTicketOwner}
                  user={user}
                  handleStartChat={handleStartChat}
                  onClose={onClose}
                  navigate={navigate}
                />

                <ModalTimestamps displayTicket={displayTicket} />

                <ModalAttachments
                  displayTicket={displayTicket}
                  canEditContent={canEditContent}
                  isEditingAttachments={isEditingAttachments}
                  attachmentsDraft={attachmentsDraft}
                  attachmentsDraftError={attachmentsDraftError}
                  attachmentsEditFileInputRef={attachmentsEditFileInputRef}
                  isSavingAttachments={isSavingAttachments}
                  startEditAttachments={startEditAttachments}
                  cancelEditAttachments={cancelEditAttachments}
                  handleSaveAttachments={handleSaveAttachments}
                  handleAttachmentsDraftSelect={handleAttachmentsDraftSelect}
                  removeAttachmentDraft={removeAttachmentDraft}
                  openLightbox={openLightbox}
                />
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
        isOpen={showPublicCommentConfirm}
        onClose={() => setShowPublicCommentConfirm(false)}
        onConfirm={() => {
          setShowPublicCommentConfirm(false);
          submitComment(false);
        }}
        title="Post public comment?"
        message="This comment will be visible to the client. Are you sure you want to post it here? Use the Internal tab for team-only notes."
        confirmText="Yes, Post Comment"
        cancelText="Cancel"
        type="warning"
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
                padding: 0,
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
                  setLightbox((lb) =>
                    lb
                      ? {
                          ...lb,
                          index:
                            (lb.index - 1 + lb.images.length) %
                            lb.images.length,
                        }
                      : null,
                  );
                }}
                title="Previous (Arrow Left)"
                style={{
                  position: "absolute",
                  left: 24,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                <CustomIcon name="ChevronLeft" size={24} />
              </button>
            )}
            <CustomImage
              src={lightbox.images[lightbox.index]}
              alt={`lightbox-zoom-${lightbox.index}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: 12,
                boxShadow: "0 24px 48px rgba(0,0,0,0.8)",
              }}
            />
            {lightbox.images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((lb) =>
                    lb
                      ? {
                          ...lb,
                          index: (lb.index + 1) % lb.images.length,
                        }
                      : null,
                  );
                }}
                title="Next (Arrow Right)"
                style={{
                  position: "absolute",
                  right: 24,
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
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

// Custom dropdown menu selector imported locally or globally

export default TicketDetailModal;
