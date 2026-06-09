import React from "react";
import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../../components/CustomIcon";
import CustomButton from "../../../../components/CustomButton";
import CustomTextArea from "../../../../components/CustomTextArea";
import { ACCEPT_ATTRIBUTE, MAX_ATTACHMENTS } from "../../../../utils/attachments";
import styles from "../TicketDetail.module.css";
import tableStyles from "../../../dashboard/Dashboard.module.css";
import type { TicketDetail as ITicketDetail } from "../../../../types";

interface TicketDetailCommentsProps {
  ticket: ITicketDetail;
  newComment: string;
  setNewComment: (val: string) => void;
  isNote: boolean;
  setIsNote: (val: boolean) => void;
  commentAttachments: string[];
  commentAttachmentError: string | null;
  commentFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleCommentAttachmentSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeCommentAttachment: (idx: number) => void;
  handleAddComment: (e: React.FormEvent) => void;
  isSubmittingComment: boolean;
  commentSendDisabled: boolean;
  openLightbox: (images: string[], index: number) => void;
}

const TicketDetailComments: React.FC<TicketDetailCommentsProps> = ({
  ticket,
  newComment,
  setNewComment,
  isNote,
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
  return (
    <div className={styles.commentFeed}>
      {ticket.comments.map((comment) => (
        <div key={comment.id} className={styles.comment}>
          <div className={tableStyles.avatar} style={{ width: 40, height: 40 }}>
            <CustomIcon name="User" size={20} />
          </div>
          <div className={`${styles.commentContent} ${comment.isNote ? styles.isNote : ""}`}>
            {comment.isNote && <span className={styles.noteLabel}>Internal Note</span>}
            <div className={styles.commentHeader}>
              <span className={styles.authorName}>{comment.author.fullname}</span>
              <span className={styles.time}>
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </span>
            </div>
            {comment.comment?.trim() && (
              <div style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
                {comment.comment}
              </div>
            )}
            {(comment as any).attachments && (comment as any).attachments.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(comment as any).attachments.map((src: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openLightbox((comment as any).attachments, idx)}
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
                ))}
              </div>
            )}
          </div>
        </div>
      ))}

      <div className={`${styles.commentInput} glass-card`}>
        <form onSubmit={handleAddComment} className={styles.inputWrapper}>
          <CustomTextArea
            placeholder="Type your message here..."
            rows={4}
            value={newComment}
            onChange={(e: any) => setNewComment(e.target.value)}
            style={{ width: "100%", resize: "none" }}
          />
          {commentAttachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
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
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
            <span style={{ fontSize: "0.75rem", color: "var(--accent-danger)", marginTop: 4 }}>
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
                commentSendDisabled || (!newComment.trim() && commentAttachments.length === 0)
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
