import React, { useState, useEffect, useRef } from "react";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";
import type { Conversation } from "../../../types";
import CustomImage from "../../../components/CustomImage";
import SharedFilesPanel from "./SharedFilesPanel";

interface ChatHeaderProps {
  selectedConv: Conversation;
  onlineUserIds: Set<string>;
  onViewMembers: () => void;
  onDeleteConversation: () => void;
  onCloseChat: () => void;
  sharedFiles: string[];
  onSharedImageClick: (index: number) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedConv,
  onlineUserIds,
  onViewMembers,
  onDeleteConversation,
  onCloseChat,
  sharedFiles,
  onSharedImageClick,
}) => {
  const partnerOnline =
    !selectedConv.isGroup &&
    !!selectedConv.partner &&
    onlineUserIds.has(selectedConv.partner.id);

  const onlineMemberCount = selectedConv.isGroup
    ? (selectedConv.members || []).filter((m: any) => onlineUserIds.has(m.id))
        .length
    : 0;
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const moreOptionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreOptionsRef.current &&
        !moreOptionsRef.current.contains(event.target as Node)
      ) {
        setShowMoreOptions(false);
        setShowFilesPanel(false);
      }
    };
    if (showMoreOptions || showFilesPanel) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreOptions, showFilesPanel]);

  // Reset the panel when switching conversations
  useEffect(() => {
    setShowFilesPanel(false);
  }, [selectedConv.id]);

  const handleDelete = () => {
    setShowMoreOptions(false);
    onDeleteConversation();
  };

  return (
    <header className={styles.chatHeader}>
      <CustomButton
        variant="ghost"
        size="sm"
        className={styles.backButton}
        onClick={onCloseChat}
        title="Back to chats"
        aria-label="Back to chats"
        icon={<CustomIcon name="ArrowLeft" size={20} />}
      />
      <div className={styles.avatarWrap}>
        <div
          className={`glass-card ${styles.headerAvatar} ${
            selectedConv.isGroup ? styles.avatarGroup : ""
          }`}
        >
          {selectedConv.isGroup ? (
            <CustomIcon name="Users" size={20} color="var(--accent-primary)" />
          ) : selectedConv.partner?.image ? (
            <CustomImage
              src={selectedConv.partner.image}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <CustomIcon name="User" size={20} />
          )}
        </div>
        {partnerOnline && <span className={styles.onlineDot} />}
      </div>
      <div className={styles.headerInfo}>
        <div
          className={styles.headerName}
          title={
            (selectedConv.isGroup
              ? selectedConv.name
              : selectedConv.partner?.fullname) || undefined
          }
        >
          {selectedConv.isGroup
            ? selectedConv.name
            : selectedConv.partner?.fullname}
        </div>
        <div
          className={`${styles.headerStatus} ${
            partnerOnline ? styles.headerStatusOnline : ""
          } ${selectedConv.isGroup ? styles.headerStatusLink : ""}`}
          onClick={() => selectedConv.isGroup && onViewMembers()}
        >
          {selectedConv.isGroup
            ? `${selectedConv.members?.length || 0} members${
                onlineMemberCount > 0 ? ` · ${onlineMemberCount} online` : ""
              }`
            : partnerOnline
              ? "Online"
              : "Offline"}
        </div>
      </div>
      <div ref={moreOptionsRef} className={styles.headerActions}>
        <CustomButton
          variant="ghost"
          size="sm"
          style={{ padding: 8, position: "relative" }}
          onClick={() => {
            setShowFilesPanel((prev) => !prev);
            setShowMoreOptions(false);
          }}
          title="Shared files"
          icon={
            <CustomIcon
              name="FolderOpen"
              size={20}
              color={
                showFilesPanel ? "var(--accent-primary)" : "var(--text-muted)"
              }
            />
          }
        >
          {sharedFiles.length > 0 && (
            <span className={styles.filesCountBadge}>
              {sharedFiles.length}
            </span>
          )}
        </CustomButton>

        {showFilesPanel && (
          <div className={`${styles.filesPanel} glass-card`}>
            <div className={styles.filesPanelTitle}>
              <CustomIcon
                name="FolderOpen"
                size={15}
                color="var(--accent-primary)"
              />
              Shared Files ({sharedFiles.length})
            </div>
            <SharedFilesPanel
              sharedFiles={sharedFiles}
              onImageClick={onSharedImageClick}
            />
          </div>
        )}

        <CustomButton
          variant="ghost"
          size="sm"
          style={{ padding: 8 }}
          onClick={() => {
            setShowMoreOptions((prev) => !prev);
            setShowFilesPanel(false);
          }}
          icon={
            <CustomIcon
              name="MoreVertical"
              size={20}
              color="var(--text-muted)"
            />
          }
        />

        {showMoreOptions && (
          <div className={`glass-card ${styles.moreMenu}`}>
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              style={{
                padding: "8px 12px",
                background: "rgba(239, 68, 68, 0.1)",
                color: "#ef4444",
                justifyContent: "flex-start",
                width: "100%",
              }}
              icon={<CustomIcon name="Trash2" size={16} />}
            >
              Delete Conversation
            </CustomButton>
          </div>
        )}
        <CustomButton
          variant="ghost"
          size="sm"
          className={styles.closeChatButton}
          style={{ padding: 8 }}
          onClick={onCloseChat}
          title="Close Chat"
          icon={<CustomIcon name="X" size={20} color="var(--text-muted)" />}
        />
      </div>
    </header>
  );
};

export default ChatHeader;
