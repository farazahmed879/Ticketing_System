import { useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
} from "../../../utils/attachments";

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
  const hasAttachmentSupport = Boolean(handleCommentAttachmentSelect);
  const sendDisabled =
    (!newComment.trim() && commentAttachments.length === 0) ||
    commentSendDisabled;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderLeft: "1px solid var(--border-glass)",
        paddingLeft: 24,
        height: "100%",
        minHeight: 0,
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
                minHeight: 0,
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
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {comment.comment?.trim() && (
                      <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                        {comment.comment}
                      </div>
                    )}
                    {comment.attachments && comment.attachments.length > 0 && (
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
                  flexDirection: "column",
                  gap: 8,
                  marginTop: "auto",
                }}
              >
                {hasAttachmentSupport && commentAttachments.length > 0 && (
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                  >
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
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e: any) => setNewComment(e.target.value)}
                    containerStyle={{ flex: 1 }}
                  />
                  {hasAttachmentSupport && (
                    <CustomButton
                      type="button"
                      variant="ghost"
                      onClick={() => commentFileInputRef.current?.click()}
                      disabled={
                        commentAttachments.length >= MAX_ATTACHMENTS
                      }
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
