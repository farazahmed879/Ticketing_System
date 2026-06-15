import React from "react";
import CustomIcon from "../../../../../components/CustomIcon";
import CustomButton from "../../../../../components/CustomButton";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
} from "../../../../../utils/attachments";
import type { TicketDetail } from "../../../../../types";

interface ModalAttachmentsProps {
  displayTicket: TicketDetail | any;
  canEditContent: boolean;
  isEditingAttachments: boolean;
  attachmentsDraft: string[];
  attachmentsDraftError: string | null;
  attachmentsEditFileInputRef: React.RefObject<HTMLInputElement | null>;
  isSavingAttachments: boolean;
  startEditAttachments: () => void;
  cancelEditAttachments: () => void;
  handleSaveAttachments: () => void;
  handleAttachmentsDraftSelect: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  removeAttachmentDraft: (idx: number) => void;
  openLightbox: (images: string[], index: number) => void;
}

const ModalAttachments: React.FC<ModalAttachmentsProps> = ({
  displayTicket,
  canEditContent,
  isEditingAttachments,
  attachmentsDraft,
  attachmentsDraftError,
  attachmentsEditFileInputRef,
  isSavingAttachments,
  startEditAttachments,
  cancelEditAttachments,
  handleSaveAttachments,
  handleAttachmentsDraftSelect,
  removeAttachmentDraft,
  openLightbox,
}) => {
  if (
    !canEditContent &&
    (!displayTicket.attachments || displayTicket.attachments.length === 0)
  ) {
    return null;
  }

  return (
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
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
                displayTicket.attachments.map((src: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => openLightbox(displayTicket.attachments, idx)}
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
        </div>
      )}
    </div>
  );
};

export default ModalAttachments;
