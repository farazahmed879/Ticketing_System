import React, { useState } from "react";
import { format } from "date-fns";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";
import type { Message, Conversation } from "../../../types";

interface MessageListProps {
  messages: Message[];
  userId: string | undefined;
  selectedConv: Conversation;
  onReply: (msg: Message) => void;
  onDeleteMessage: (msgId: string, createdAt: string | Date) => void;
  openLightbox: (images: string[], index: number) => void;
  scrollToBottom: () => void;
  showScrollBottom: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  userId,
  selectedConv,
  onReply,
  onDeleteMessage,
  openLightbox,
  scrollToBottom,
  showScrollBottom,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
}) => {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

  return (
    <div
      className={styles.messagesContainer}
      ref={messagesContainerRef}
      onScroll={handleScroll}
    >
      <div className={styles.messagesWrapper}>
        {messages.map((msg) => {
          const isOwn = msg.senderId === userId;
          const hasAttachments = msg.attachments && msg.attachments.length > 0;
          return (
            <div
              key={msg.id}
              className={`${styles.messageWrapper} ${
                isOwn ? styles.messageOwn : styles.messageOther
              }`}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {selectedConv.isGroup && !isOwn && msg.sender && (
                <span className={styles.senderName}>
                  {msg.sender.fullname}
                </span>
              )}
              <div
                className={`${styles.messageBubble} ${
                  hasAttachments && !msg.body ? styles.messageBubbleMedia : ""
                }`}
              >
                {msg.replyTo && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      padding: "6px 10px",
                      marginBottom: 8,
                      background: "rgba(0,0,0,0.1)",
                      borderRadius: 4,
                      borderLeft: "3px solid var(--primary)",
                      color: "var(--text-color)",
                      opacity: 0.8,
                      cursor: "pointer",
                    }}
                  >
                    <strong style={{ color: "var(--primary)" }}>
                      {msg.replyTo.sender?.fullname || "Someone"}:
                    </strong>{" "}
                    {msg.replyTo.body?.substring(0, 50) || "Attachment"}
                  </div>
                )}
                {hasAttachments &&
                  (msg.attachments!.length === 1 ? (
                    <CustomButton
                      variant="ghost"
                      className={styles.attachmentSingle}
                      style={{ padding: 0, height: "auto" }}
                      onClick={() => openLightbox(msg.attachments!, 0)}
                      title="View image"
                    >
                      <img
                        src={msg.attachments![0]}
                        alt="attachment"
                        style={{ borderRadius: "inherit" }}
                      />
                    </CustomButton>
                  ) : (
                    <div className={styles.attachmentGrid}>
                      {msg.attachments!.map((src, i) => (
                        <CustomButton
                          key={i}
                          variant="ghost"
                          className={styles.attachmentThumb}
                          style={{ padding: 0, height: "auto" }}
                          onClick={() => openLightbox(msg.attachments!, i)}
                          title="View image"
                        >
                          <img
                            src={src}
                            alt={`attachment-${i}`}
                            style={{ borderRadius: "inherit" }}
                          />
                        </CustomButton>
                      ))}
                    </div>
                  ))}
                {msg.body && (
                  <span className={styles.messageText}>{msg.body}</span>
                )}
              </div>
              <span
                className={styles.messageTime}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {format(new Date(msg.createdAt), "MMM d, yyyy, h:mm a")}
                {hoveredMessageId === msg.id && (
                  <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
                    <CustomButton
                      variant="ghost"
                      size="sm"
                      style={{ padding: 4 }}
                      onClick={() => onReply(msg)}
                      title="Reply"
                      icon={
                        <CustomIcon
                          name="CornerUpLeft"
                          size={14}
                          color="var(--text-muted)"
                        />
                      }
                    />
                    {isOwn && (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        style={{ padding: 4 }}
                        onClick={() => onDeleteMessage(msg.id, msg.createdAt)}
                        title="Delete message"
                        icon={
                          <CustomIcon name="Trash2" size={14} color="#ef4444" />
                        }
                      />
                    )}
                  </div>
                )}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {showScrollBottom && (
        <CustomButton
          variant="ghost"
          className={styles.scrollBottomBtn}
          onClick={scrollToBottom}
          icon={<CustomIcon name="ChevronDown" size={20} />}
        />
      )}
    </div>
  );
};

export default MessageList;
