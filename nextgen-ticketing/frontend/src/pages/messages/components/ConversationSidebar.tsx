import React from "react";
import { format } from "date-fns";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import styles from "../Messages.module.css";
import type { Conversation } from "../../../types";

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConv: string | null;
  onSelectConv: (convId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  unreadCounts: Record<string, number>;
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
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Jami Chat</h2>
        <div style={{ display: "flex", gap: 6 }}>
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

      <div style={{ padding: "16px 24px" }}>
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
              <div
                className="glass-card"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: conv.isGroup ? 12 : "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: conv.isGroup
                    ? "rgba(124,58,237,0.15)"
                    : undefined,
                }}
              >
                {conv.isGroup ? (
                  <CustomIcon
                    name="Users"
                    size={20}
                    color="var(--accent-primary)"
                  />
                ) : conv.partner?.image ? (
                  <img
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                    {conv.isGroup ? conv.name : conv.partner?.fullname}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {format(new Date(conv.updatedAt), "HH:mm")}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
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
          <div
            style={{
              textAlign: "center",
              padding: 40,
              color: "var(--text-muted)",
            }}
          >
            {searchTerm ? "No chats found" : "No conversations yet"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
