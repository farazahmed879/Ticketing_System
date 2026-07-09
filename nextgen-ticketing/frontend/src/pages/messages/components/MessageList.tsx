import React from "react";
import { format } from "date-fns";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";
import type { Message, Conversation } from "../../../types";
import CustomImage from "../../../components/CustomImage";

// Matches one emoji cluster, including skin tones, variation selectors and
// ZWJ sequences (e.g. 👍🏽, ❤️, 👨‍👩‍👧).
const EMOJI_SEGMENT =
  /(\p{Extended_Pictographic}(?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])*(?:\u{200D}\p{Extended_Pictographic}(?:[\u{FE0F}\u{1F3FB}-\u{1F3FF}])*)*)/gu;

const analyzeEmojis = (body?: string) => {
  if (!body) return { emojiOnly: false, count: 0 };
  const matches = body.match(EMOJI_SEGMENT) || [];
  if (matches.length === 0) return { emojiOnly: false, count: 0 };
  const stripped = body.replace(EMOJI_SEGMENT, "").replace(/\s/g, "");
  return { emojiOnly: stripped.length === 0, count: matches.length };
};

// Wrap emojis in a span so they render larger than the surrounding text.
const renderBodyWithEmojis = (body: string) => {
  const parts = body.split(EMOJI_SEGMENT);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className={styles.emojiChar}>
        {part}
      </span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
};

interface MessageListProps {
  messages: Message[];
  userId: string | undefined;
  selectedConv: Conversation;
  onlineUserIds: Set<string>;
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
  onlineUserIds,
  onReply,
  onDeleteMessage,
  openLightbox,
  scrollToBottom,
  showScrollBottom,
  messagesEndRef,
  messagesContainerRef,
  handleScroll,
}) => {
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
          const canDelete =
            isOwn &&
            Date.now() - new Date(msg.createdAt).getTime() < 5 * 60 * 1000;
          const { emojiOnly, count: emojiCount } = analyzeEmojis(msg.body);
          const isEmojiOnlyMsg = emojiOnly && !hasAttachments && !msg.replyTo;
          return (
            <div
              key={msg.id}
              className={`${styles.messageWrapper} ${
                isOwn ? styles.messageOwn : styles.messageOther
              }`}
            >
              {selectedConv.isGroup && !isOwn && msg.sender && (
                <span className={styles.senderName}>
                  <span
                    className={`${styles.senderStatusDot} ${
                      onlineUserIds.has(msg.senderId)
                        ? styles.senderStatusOnline
                        : styles.senderStatusOffline
                    }`}
                    title={
                      onlineUserIds.has(msg.senderId) ? "Online" : "Offline"
                    }
                  />
                  {msg.sender.fullname}
                </span>
              )}
              <div
                className={`${styles.messageBubble} ${
                  hasAttachments && !msg.body ? styles.messageBubbleMedia : ""
                } ${isEmojiOnlyMsg ? styles.messageBubbleEmojiOnly : ""}`}
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
                      <CustomImage
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
                          <CustomImage
                            src={src}
                            alt={`attachment-${i}`}
                            style={{ borderRadius: "inherit" }}
                          />
                        </CustomButton>
                      ))}
                    </div>
                  ))}
                {msg.body &&
                  (isEmojiOnlyMsg ? (
                    <span
                      className={styles.messageText}
                      style={{
                        fontSize: emojiCount <= 3 ? "2.4rem" : "1.7rem",
                        lineHeight: 1.25,
                      }}
                    >
                      {msg.body}
                    </span>
                  ) : (
                    <span className={styles.messageText}>
                      {renderBodyWithEmojis(msg.body)}
                    </span>
                  ))}
              </div>
              <div className={styles.messageMeta}>
                <span className={styles.messageTime}>
                  {format(new Date(msg.createdAt), "MMM d, yyyy, h:mm a")}
                </span>
                <div className={styles.messageActions}>
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
                  {canDelete && (
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
              </div>
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
