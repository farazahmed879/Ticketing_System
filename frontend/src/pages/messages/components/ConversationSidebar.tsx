import React from "react";
import { format } from "date-fns";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import styles from "../Messages.module.css";
import type { Conversation } from "../../../types";
import CustomImage from "../../../components/CustomImage";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConv: string | null;
  onSelectConv: (convId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  unreadCounts: Record<string, number>;
  onlineUserIds: Set<string>;
  canManageGroup: boolean;
  isCustomer: boolean;
  onNewGroupClick: () => void;
  onNewChatClick: () => void;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConv,
  onSelectConv,
  searchTerm,
  onSearchChange,
  unreadCounts,
  onlineUserIds,
  canManageGroup,
  isCustomer,
  onNewGroupClick,
  onNewChatClick,
}) => {
  const filteredConversations = conversations.filter((c) => {
    const name = c.isGroup ? c.name || "Group" : c.partner?.fullname || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.recentMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className={styles.conversationList}>
      <div className={styles.listHeader}>
        <h2 className={styles.listTitle}>Jami Chat</h2>
        <div className={styles.listHeaderActions}>
          {canManageGroup && (
            <CustomButton
              variant="ghost"
              size="sm"
              style={{
                padding: 6,
                color: "var(--text-primary)",
              }}
              onClick={onNewGroupClick}
              title="New Group Chat"
              icon={<CustomIcon name="Users" size={18} />}
            />
          )}
          <CustomButton
            variant="ghost"
            size="sm"
            style={{
              padding: 6,
              color: "var(--text-primary)",
            }}
            onClick={onNewChatClick}
            title={isCustomer ? "Contact Support" : "New Chat"}
            icon={
              isCustomer ? (
                <CustomIcon name="Headset" size={18} />
              ) : (
                <CustomIcon name="Plus" size={18} />
              )
            }
          />
        </div>
      </div>

      <div className={styles.listSearch}>
        <CustomInput
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onSearchChange(e.target.value)
          }
          icon={<CustomIcon name="Search" size={16} />}
        />
      </div>

      <div className={styles.scrollArea}>
        {filteredConversations.length > 0 ? (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`${styles.conversationItem} ${
                activeConv === conv.id ? styles.activeItem : ""
              }`}
              onClick={() => onSelectConv(conv.id)}
            >
              <div className={styles.avatarWrap}>
                <div
                  className={`glass-card ${styles.convAvatar} ${
                    conv.isGroup ? styles.avatarGroup : ""
                  }`}
                >
                  {conv.isGroup ? (
                    <CustomIcon
                      name="Users"
                      size={20}
                      color="var(--accent-primary)"
                    />
                  ) : conv.partner?.image ? (
                    <CustomImage
                      src={conv.partner.image}
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
                {!conv.isGroup &&
                  conv.partner &&
                  onlineUserIds.has(conv.partner.id) && (
                    <span className={styles.onlineDot} />
                  )}
              </div>
              <div className={styles.convBody}>
                <div className={styles.convTopRow}>
                  <span
                    className={styles.convName}
                    title={
                      (conv.isGroup ? conv.name : conv.partner?.fullname) ||
                      undefined
                    }
                  >
                    {conv.isGroup ? conv.name : conv.partner?.fullname}
                  </span>
                  <span className={styles.convTime}>
                    {format(new Date(conv.updatedAt), "HH:mm")}
                  </span>
                </div>
                <div className={styles.convBottomRow}>
                  <div className={styles.convPreview}>
                    {conv.recentMessage}
                  </div>
                  {unreadCounts[conv.id] > 0 && (
                    <span className={styles.unreadBadge}>
                      {unreadCounts[conv.id]}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.listEmpty}>
            {searchTerm ? "No chats found" : "No conversations yet"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
