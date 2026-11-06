import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";
import {
  MAX_ATTACHMENTS,
  CHAT_ACCEPT_ATTRIBUTE,
  parseChatAttachment,
} from "../../../utils/attachments";
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
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // Grow the box with its content (up to the CSS max-height), and shrink it
  // back after a message is sent.
  useLayoutEffect(() => {
    const el = textInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [newMessage]);

  // Enter sends; Shift+Enter inserts a new line. Ignore Enter while an IME
  // (e.g. Urdu/Chinese input) is still composing a character.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  };

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
        <div className={styles.composerError}>
          {attachmentError}
        </div>
      )}
      {replyingTo && (
        <div className={styles.replyPreview}>
          <div className={styles.replyPreviewBody}>
            <div className={styles.replyPreviewTitle}>
              Replying to {replyingTo.sender?.fullname || "Someone"}
            </div>
            <span className={styles.replyPreviewText}>
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
        <div className={styles.attachmentPreviewBar}>
          {attachments.map((src, idx) => {
            const { isImage, name } = parseChatAttachment(src);
            return isImage ? (
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
            ) : (
              <div key={idx} className={styles.filePreviewChip}>
                <CustomIcon
                  name="FileText"
                  size={16}
                  color="var(--accent-primary)"
                />
                <span className={styles.filePreviewName}>
                  {name || "File"}
                </span>
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(idx)}
                  title="Remove"
                  style={{ padding: 2 }}
                  icon={<CustomIcon name="X" size={12} />}
                />
              </div>
            );
          })}
        </div>
      )}
      <form onSubmit={onSendMessage} className={styles.composerForm}>
        <input
          type="file"
          accept={CHAT_ACCEPT_ATTRIBUTE}
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
              ? `Maximum ${MAX_ATTACHMENTS} attachments`
              : "Attach image or file"
          }
          className={styles.attachButton}
          icon={<CustomIcon name="Paperclip" size={18} />}
        />
        <div ref={emojiAreaRef} className={styles.emojiArea}>
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
        <textarea
          ref={textInputRef}
          rows={1}
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className={styles.composerInput}
          aria-label="Message (Shift+Enter for a new line)"
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
