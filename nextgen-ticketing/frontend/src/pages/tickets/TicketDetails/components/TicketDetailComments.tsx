import React, { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../../components/CustomIcon";
import CustomButton from "../../../../components/CustomButton";
import CustomTextArea from "../../../../components/CustomTextArea";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
} from "../../../../utils/attachments";
import styles from "../TicketDetail.module.css";
import { RoleName } from "../../../../utils/constants";
import type { TicketDetailCommentsProps } from "../../../../components/types";

const TicketDetailComments: React.FC<TicketDetailCommentsProps> = ({
  ticket,
  user,
  newComment,
  setNewComment,
  isNote: _,
  setIsNote,
  commentAttachments,
  commentAttachmentError,
  commentFileInputRef,
  handleCommentAttachmentSelect,
  removeCommentAttachment,
  handleAddComment,
  isSubmittingComment,
  commentSendDisabled,
  openLightbox,
}) => {
  // Internal (team-only) comments are hidden from clients — they only see the
  // public "All" tab. Switching tabs also sets whether a new comment is a note.
  const canViewInternal = user.role.name !== RoleName.CUSTOMER;
  // Default to the Internal tab for staff; clients only ever have the public tab.
  const [activeTab, setActiveTab] = useState<"all" | "internal">(
    canViewInternal ? "internal" : "all",
  );
  const isInternal = canViewInternal && activeTab === "internal";

  // Keep the parent's note flag in sync with the active tab (covers the
  // default tab on mount as well as tab switches).
  useEffect(() => {
    setIsNote(isInternal);
  }, [isInternal, setIsNote]);
  const visibleComments = ticket.comments.filter((c: any) =>
    isInternal ? c.isNote : !c.isNote,
  );
  const listEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest comment when one is added or the tab changes.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleComments.length, activeTab]);

  return (
    <div className={styles.commentFeed}>
      {canViewInternal && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
            marginBottom: 4,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-glass)",
            borderRadius: 10,
          }}
        >
          {(
            [
              { key: "all", label: "Comments", icon: "MessageCircle" },
              { key: "internal", label: "Internal", icon: "Lock" },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setIsNote(tab.key === "internal");
                }}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  background: active ? "var(--accent-primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  transition: "var(--transition-fast)",
                }}
              >
                <CustomIcon name={tab.icon} size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
      {visibleComments.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 20px",
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            border: "1px dashed var(--border-glass)",
            borderRadius: 12,
          }}
        >
          {isInternal ? "No internal notes yet." : "No comments yet."}
        </div>
      )}
      {visibleComments.map((comment) => {
        // Your own comments align right with a distinct background; everyone
        // else's align left. Client authors are tagged.
        const isOwnComment = (comment as any).authorId === user?.id;
        const isClientComment =
          (comment as any).author?.role?.isCustomer === true ||
          (comment as any).author?.role?.name === RoleName.CUSTOMER;
        return (
          <div
            key={comment.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOwnComment ? "flex-end" : "flex-start",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 16,
                borderBottomRightRadius: isOwnComment ? 4 : 16,
                borderBottomLeftRadius: isOwnComment ? 16 : 4,
                background: isOwnComment
                  ? "rgba(var(--primary-rgb), 0.12)"
                  : "var(--bg-card)",
                border: "1px solid var(--border-glass)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: isOwnComment
                      ? "rgba(var(--primary-rgb), 0.25)"
                      : isClientComment
                        ? "rgba(6, 182, 212, 0.22)"
                        : "rgba(255,255,255,0.08)",
                    color: isOwnComment
                      ? "var(--accent-primary)"
                      : isClientComment
                        ? "var(--accent-secondary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {comment.author.fullname?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {comment.author.fullname}
                    </span>
                    {isClientComment && (
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: "0.58rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.4px",
                          color: "var(--accent-secondary)",
                          background: "rgba(6, 182, 212, 0.15)",
                          border: "1px solid rgba(6, 182, 212, 0.35)",
                          borderRadius: 5,
                          padding: "1px 5px",
                        }}
                      >
                        Client
                      </span>
                    )}
                  </div>
                  <span
                    className={styles.time}
                    title={format(
                      new Date(comment.createdAt),
                      "MMM d, yyyy 'at' h:mm a",
                    )}
                  >
                    {formatDistanceToNow(new Date(comment.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              {comment.comment?.trim() && (
                <div
                  style={{
                    fontSize: "0.95rem",
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
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
                            openLightbox((comment as any).attachments, idx)
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
        );
      })}
      <div ref={listEndRef} />

      <div className={`${styles.commentInput} glass-card`}>
        <form onSubmit={handleAddComment} className={styles.inputWrapper}>
          <CustomTextArea
            placeholder={
              isInternal
                ? "Add an internal note (visible to the team only)..."
                : "Type your message here..."
            }
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
            {isInternal ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "var(--accent-warning, #f59e0b)",
                }}
              >
                <CustomIcon name="Lock" size={14} />
                Posting as internal note
              </span>
            ) : null}
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
  );
};

export default TicketDetailComments;
