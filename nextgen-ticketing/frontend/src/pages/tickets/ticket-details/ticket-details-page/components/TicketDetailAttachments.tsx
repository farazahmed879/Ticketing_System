import React from "react";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomButton from "../../../../../components/CustomButton";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
} from "../../../../../utils/attachments";
import type { TicketDetailAttachmentsProps } from "../../../../../components/types";
import CustomImage from "../../../../../components/CustomImage";

const TicketDetailAttachments: React.FC<TicketDetailAttachmentsProps> = ({
  ticket,
  canEditContent,
  isEditingAttachments,
  attachmentsDraft,
  attachmentsDraftError,
  attachmentsEditFileInputRef,
  startEditAttachments,
  cancelEditAttachments,
  handleAttachmentsDraftSelect,
  removeAttachmentDraft,
  openLightbox,
}) => {
  if (
    !canEditContent &&
    (!ticket.attachments || ticket.attachments.length === 0)
  ) {
    return null;
  }

  return (
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
                onClick={() => attachmentsEditFileInputRef.current?.click()}
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
            <CustomButton variant="ghost" onClick={cancelEditAttachments}>
              Cancel
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
                  onClick={() => openLightbox(ticket.attachments!, idx)}
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
  );
};

export default TicketDetailAttachments;
