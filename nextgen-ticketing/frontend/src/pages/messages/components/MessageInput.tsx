import React, { useState, useRef, useEffect } from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";
import { MAX_ATTACHMENTS } from "../../../utils/attachments";
import type { Message } from "../../../types";
import CustomImage from "../../../components/CustomImage";
import EmojiPicker from "./EmojiPicker";

interface MessageInputProps {
  newMessage: string;
  setNewMessage: (msg: string) => void;
  onSendMessage: (e: React.FormEvent) => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  attachments: string[];
  onAttachmentsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  attachmentError: string | null;
  removeAttachment: (idx: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const MessageInput: React.FC<MessageInputProps> = ({
  newMessage,
  setNewMessage,
  onSendMessage,
  replyingTo,
  onCancelReply,
  attachments,
  onAttachmentsChange,
  attachmentError,
  removeAttachment,
  fileInputRef,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiAreaRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiAreaRef.current &&
        !emojiAreaRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const insertEmoji = (emoji: string) => {
    const input = textInputRef.current;
    const start = input?.selectionStart ?? newMessage.length;
    const end = input?.selectionEnd ?? newMessage.length;
    setNewMessage(newMessage.slice(0, start) + emoji + newMessage.slice(end));
    // Restore focus and put the caret right after the inserted emoji.
    requestAnimationFrame(() => {
      if (input) {
        input.focus();
        const caret = start + emoji.length;
        input.setSelectionRange(caret, caret);
      }
    });
  };

  return (
    <div className={styles.chatInput}>
      {attachmentError && (
        <div
          style={{
            color: "#ef4444",
            fontSize: "0.85rem",
            marginBottom: 8,
            padding: "8px 12px",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: 8,
          }}
        >
          {attachmentError}
        </div>
      )}
      {replyingTo && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            background: "rgba(0,0,0,0.1)",
            borderRadius: 8,
            borderLeft: "3px solid var(--primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.8rem", color: "var(--primary)" }}>
              Replying to {replyingTo.sender?.fullname || "Someone"}
            </div>
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-color)",
                opacity: 0.8,
              }}
            >
              {replyingTo.body?.substring(0, 50) || "Attachment"}
            </span>
          </div>
          <CustomButton
            variant="ghost"
            size="sm"
            style={{ padding: 4 }}
            onClick={onCancelReply}
            icon={<CustomIcon name="X" size={16} color="var(--text-muted)" />}
          />
        </div>
      )}
      {attachments.length > 0 && (
        <div className={styles.attachmentPreviewContainer}>
          {attachments.map((src, idx) => (
            <div key={idx} className={styles.attachmentPreview}>
              <CustomImage src={src} alt={`preview-${idx}`} />
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(idx)}
                title="Remove"
                className={styles.attachmentRemove}
                icon={<CustomIcon name="X" size={12} />}
              />
            </div>
          ))}
        </div>
      )}
      <form onSubmit={onSendMessage} style={{ display: "flex", gap: 12 }}>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={onAttachmentsChange}
          style={{ display: "none" }}
        />
        <CustomButton
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachments.length >= MAX_ATTACHMENTS}
          title={
            attachments.length >= MAX_ATTACHMENTS
              ? `Maximum ${MAX_ATTACHMENTS} images`
              : "Attach image"
          }
          className={styles.attachButton}
          icon={<CustomIcon name="Paperclip" size={18} />}
        />
        <div ref={emojiAreaRef} style={{ position: "relative" }}>
          <CustomButton
            type="button"
            variant="ghost"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Add emoji"
            className={styles.attachButton}
            icon={
              <CustomIcon
                name="Smile"
                size={18}
                color={
                  showEmojiPicker ? "var(--accent-primary)" : undefined
                }
              />
            }
          />
          {showEmojiPicker && <EmojiPicker onSelect={insertEmoji} />}
        </div>
        <input
          type="text"
          ref={textInputRef}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{
            flex: 1,
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: 12,
            padding: "0 16px",
            color: "var(--text-primary)",
            outline: "none",
            fontSize: "1rem",
          }}
        />
        <CustomButton
          type="submit"
          variant="gradient"
          style={{
            width: 40,
            height: 40,
            padding: 0,
            borderRadius: 10,
            flexShrink: 0,
          }}
          disabled={!newMessage.trim() && attachments.length === 0}
          icon={<CustomIcon name="Send" size={18} />}
        />
      </form>
    </div>
  );
};

export default MessageInput;
