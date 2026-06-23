/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomInput from "../../../../../components/CustomInput";
import CustomButton from "../../../../../components/CustomButton";
import styles from "../TicketDetailModal.module.css";
import cs from "../../../shared/commentThread.module.css";
import { RoleName } from "../../../../../utils/constants";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
} from "../../../../../utils/attachments";
import CustomImage from "../../../../../components/CustomImage";

const CommentSection = ({
  fullTicketData,
  user,
  canCreateComments,
  handleAddComment,
  setNewComment,
  newComment,
  commentAttachments = [],
  handleCommentAttachmentSelect,
  removeCommentAttachment,
  commentAttachmentError,
  openLightbox,
  commentSendDisabled = false,
  isSubmittingComment = false,
}: any) => {
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const hasAttachmentSupport = Boolean(handleCommentAttachmentSelect);

  // Internal (team-only) comments are hidden from clients — they only ever see
  // the public "All" tab (the backend also strips notes for them).
  const canViewInternal = user?.role?.name !== RoleName.CUSTOMER;
  // Default to the Internal tab for staff; clients only ever have the public tab.
  const [activeTab, setActiveTab] = useState<"all" | "internal">(
    canViewInternal ? "internal" : "all",
  );
  const isInternal = canViewInternal && activeTab === "internal";

  const allComments = fullTicketData?.comments || [];
  const visibleComments = allComments.filter((c: any) =>
    isInternal ? c.isNote : !c.isNote,
  );

  // Auto-scroll to the latest comment when one is added or the tab changes.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [visibleComments.length, activeTab]);

  const sendDisabled =
    (!newComment.trim() && commentAttachments.length === 0) ||
    commentSendDisabled;

  return (
    <div
      className={`${styles.commentsContainer} ${cs.thread}`}
      style={
        isInternal
          ? {
              // Distinct amber tint so the team can see at a glance they are
              // in the internal (team-only) thread.
              background: "rgba(245, 158, 11, 0.18)",
              border: "1px solid rgba(245, 158, 11, 0.6)",
              borderRadius: 12,
              padding: 10,
            }
          : undefined
      }
    >
      {!canViewInternal && (
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
          Comments {visibleComments.length ? `(${visibleComments.length})` : ""}
        </label>
      )}

      {canViewInternal && (
        <div
          style={{
            display: "flex",
            gap: 6,
            padding: 4,
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
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  background: active ? "var(--accent-primary)" : "transparent",
                  color: active ? "#fff" : "var(--text-secondary)",
                  transition: "var(--transition-fast)",
                }}
              >
                <CustomIcon name={tab.icon} size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

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
            <div className={`${styles.commentsList} ${cs.scroll}`}>
              {visibleComments.length > 0 ? (
                visibleComments.map((comment: any) => {
                  // Your own comments align right with a distinct background;
                  // everyone else's align left. Client authors are tagged.
                  const isOwnComment = comment.authorId === user?.id;
                  const isClientComment =
                    comment.author?.role?.isCustomer === true ||
                    comment.author?.role?.name === RoleName.CUSTOMER;
                  return (
                    <div
                      key={comment.id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isOwnComment ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        className={`${cs.card} ${isOwnComment ? cs.cardOwn : ""}`}
                        style={{
                          maxWidth: "85%",
                          padding: "10px 12px",
                          borderBottomRightRadius: isOwnComment ? 4 : 14,
                          borderBottomLeftRadius: isOwnComment ? 14 : 4,
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
                          <div className={cs.avatar}>
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
                                  fontSize: "0.8rem",
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
                              style={{
                                fontSize: "0.66rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              {format(
                                new Date(comment.createdAt),
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </span>
                          </div>
                        </div>
                        {comment.comment?.trim() && (
                          <div
                            style={{
                              fontSize: "0.85rem",
                              lineHeight: 1.5,
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {comment.comment}
                          </div>
                        )}
                        {comment.attachments &&
                          comment.attachments.length > 0 && (
                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {comment.attachments.map(
                                (src: string, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() =>
                                      openLightbox?.(comment.attachments, idx)
                                    }
                                    title="View image"
                                    style={{
                                      display: "block",
                                      width: 56,
                                      height: 56,
                                      borderRadius: 6,
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
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={cs.empty}>
                  <div className={cs.emptyIcon}>
                    <CustomIcon name="MessageSquare" size={24} />
                  </div>
                  {isInternal
                    ? "No internal notes yet. Share context with the team here."
                    : "No comments yet. Be the first to share your thoughts."}
                </div>
              )}
              <div ref={listEndRef} />
            </div>

            {canCreateComments && (
              <form
                onSubmit={(e) => handleAddComment(e, isInternal)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  marginTop: "auto",
                }}
              >
                {hasAttachmentSupport && commentAttachments.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {commentAttachments.map((src: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          position: "relative",
                          width: 56,
                          height: 56,
                          borderRadius: 6,
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
                          onClick={() => removeCommentAttachment?.(idx)}
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
                {hasAttachmentSupport && commentAttachmentError && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--accent-danger)",
                    }}
                  >
                    {commentAttachmentError}
                  </span>
                )}
                {hasAttachmentSupport && (
                  <input
                    ref={commentFileInputRef}
                    type="file"
                    accept={ACCEPT_ATTRIBUTE}
                    multiple
                    onChange={handleCommentAttachmentSelect}
                    style={{ display: "none" }}
                  />
                )}
                <div style={{ display: "flex", gap: 10 }}>
                  <CustomInput
                    placeholder={
                      isInternal
                        ? "Add an internal note (team only)..."
                        : "Add a comment..."
                    }
                    value={newComment}
                    onChange={(e: any) => setNewComment(e.target.value)}
                    containerStyle={{ flex: 1 }}
                  />
                  {hasAttachmentSupport && (
                    <CustomButton
                      type="button"
                      variant="ghost"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={commentAttachments.length >= MAX_ATTACHMENTS}
                      icon={<CustomIcon name="Paperclip" size={18} />}
                      title={
                        commentAttachments.length >= MAX_ATTACHMENTS
                          ? `Maximum ${MAX_ATTACHMENTS} images reached`
                          : "Attach image"
                      }
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        padding: 0,
                      }}
                    />
                  )}
                  <CustomButton
                    type="submit"
                    variant="gradient"
                    disabled={sendDisabled}
                    loading={isSubmittingComment}
                    icon={<CustomIcon name="Send" size={18} />}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                    }}
                  />
                </div>
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
  );
};
export default CommentSection;
