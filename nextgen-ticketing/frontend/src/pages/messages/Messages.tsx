import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import CustomIcon from "../../components/CustomIcon";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Messages.module.css";
import { format } from "date-fns";
import CustomInput from "../../components/CustomInput";
import NewChatModal from "./components/NewChatModal";
import NewGroupModal from "./components/NewGroupModal";
import {
  ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  readAttachmentFiles,
} from "../../utils/attachments";

import type { Conversation, Message } from "../../types";
import { ChatSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>(
    [],
  );
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = async () => {
    try {
      const res = await api.get(API_ROUTES.MESSAGES.CONVERSATIONS);
      setConversations(res.data.conversations);

      // Handle userId from query params
      const userIdFromParam = searchParams.get("userId");
      if (userIdFromParam) {
        startChatWithUser(userIdFromParam);
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Socket listeners
    socket.on("chat:receive", (data: { roomId: string; message: Message }) => {
      if (activeConv === data.roomId) {
        setMessages((prev) => [...prev, data.message]);
      }
      // Update recent message in list and move to top
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.roomId);
        if (index === -1) {
          fetchConversations(); // If it's a new conversation not in list
          return prev;
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          recentMessage: data.message.body,
          updatedAt: new Date().toISOString(),
        };
        // Sort by updatedAt
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    });

    return () => {
      socket.off("chat:receive");
    };
  }, [activeConv]);

  useEffect(() => {
    if (activeConv) {
      const fetchMessages = async () => {
        try {
          const res = await api.get(
            API_ROUTES.MESSAGES.CONVERSATION_BY_ID(activeConv),
          );
          setMessages(res.data.conversation.messages);
        } catch (err) {
          console.error("Failed to fetch messages", err);
        }
      };
      fetchMessages();
    }
  }, [activeConv]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBottom(false);
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // Show button if we are more than 500px away from bottom
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 500;
    setShowScrollBottom(isFarFromBottom);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && attachments.length === 0) || !activeConv) return;

    socket.emit("chat:send", {
      roomId: activeConv,
      body: newMessage,
      attachments,
    });
    setNewMessage("");
    setAttachments([]);
    setAttachmentError(null);
  };

  const handleAttachmentSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!e.target.files?.length) return;
    setAttachmentError(null);
    const { accepted, errors } = await readAttachmentFiles(
      e.target.files,
      attachments.length,
    );
    if (accepted.length) setAttachments((prev) => [...prev, ...accepted]);
    if (errors.length) setAttachmentError(errors.join(" "));
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    setAttachmentError(null);
  };

  const openLightbox = (images: string[], index: number) =>
    setLightbox({ images, index });
  const closeLightbox = () => setLightbox(null);

  const startChatWithUser = async (partnerId: string) => {
    try {
      const res = await api.post(API_ROUTES.MESSAGES.CONVERSATIONS, {
        partnerId,
      });
      const newRoom = res.data.conversation;
      setConversations((prev) => {
        if (prev.find((c) => c.id === newRoom.id)) return prev;
        const partner = newRoom.members?.find((m: any) => m.id !== user?.id);
        const conv: Conversation = {
          id: newRoom.id,
          isGroup: false,
          partner,
          recentMessage: "New Conversation",
          updatedAt: newRoom.updatedAt,
        };
        return [conv, ...prev];
      });
      setActiveConv(newRoom.id);
      setIsUserModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Could not start conversation");
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    try {
      const res = await api.post(API_ROUTES.MESSAGES.GROUPS, {
        name: groupName,
        memberIds: selectedGroupMembers,
      });
      const newRoom = res.data.conversation;
      const conv: Conversation = {
        id: newRoom.id,
        isGroup: true,
        name: newRoom.name,
        members: newRoom.members,
        partner: null,
        recentMessage: "New Group",
        updatedAt: newRoom.updatedAt,
      };
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(newRoom.id);
      setIsGroupModalOpen(false);
      setGroupName("");
      setSelectedGroupMembers([]);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Could not create group");
    }
  };

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get(API_ROUTES.MESSAGES.PARTNERS);
      setUsers(res.data.partners);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  useEffect(() => {
    if (isUserModalOpen || isGroupModalOpen) {
      fetchUsers();
    }
  }, [isUserModalOpen, isGroupModalOpen]);

  const isStaff =
    user?.role?.isAdmin ||
    user?.role?.isAgent ||
    user?.role?.name?.toLowerCase() === "admin" ||
    user?.role?.name?.toLowerCase() === "agent";
  const isCustomer =
    user?.role?.isCustomer || user?.role?.name?.toLowerCase() === "customer";

  const filteredConversations = conversations.filter((c) => {
    const name = c.isGroup ? c.name || "Group" : c.partner?.fullname || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.recentMessage.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredUsers = users.filter(
    (u) =>
      u.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const selectedConv = conversations.find((c) => c.id === activeConv);

  if (loading) {
    return (
      <div className={`${styles.container} animate-fade-in`}>
        <ChatSkeleton />
      </div>
    );
  }

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.conversationList}>
        <div className={styles.listHeader}>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Jami Chat</h2>
          <div style={{ display: "flex", gap: 6 }}>
            {isStaff && (
              <button
                className="glass-card"
                style={{
                  padding: 6,
                  borderRadius: 8,
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
                onClick={() => setIsGroupModalOpen(true)}
                title="New Group Chat"
              >
                <CustomIcon name="Users" size={18} />
              </button>
            )}
            <button
              className="glass-card"
              style={{
                padding: 6,
                borderRadius: 8,
                cursor: "pointer",
                color: "var(--text-primary)",
              }}
              onClick={() => setIsUserModalOpen(true)}
              title={isCustomer ? "Contact Support" : "New Chat"}
            >
              {isCustomer ? (
                <CustomIcon name="Headset" size={18} />
              ) : (
                <CustomIcon name="Plus" size={18} />
              )}
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 24px" }}>
          <CustomInput
            placeholder="Search chats..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchTerm(e.target.value)
            }
            icon={<CustomIcon name="Search" size={16} />}
          />
        </div>

        <div className={styles.scrollArea}>
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`${styles.conversationItem} ${activeConv === conv.id ? styles.activeItem : ""}`}
                onClick={() => setActiveConv(conv.id)}
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
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {conv.recentMessage}
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

      <div className={styles.chatArea}>
        {activeConv ? (
          <>
            <header className={styles.chatHeader}>
              <div
                className="glass-card"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: selectedConv?.isGroup ? 10 : "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  background: selectedConv?.isGroup
                    ? "rgba(124,58,237,0.15)"
                    : undefined,
                }}
              >
                {selectedConv?.isGroup ? (
                  <CustomIcon
                    name="Users"
                    size={20}
                    color="var(--accent-primary)"
                  />
                ) : selectedConv?.partner?.image ? (
                  <img
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
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>
                  {selectedConv?.isGroup
                    ? selectedConv.name
                    : selectedConv?.partner?.fullname}
                </div>
                <div
                  style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                >
                  {selectedConv?.isGroup
                    ? `${selectedConv.members?.length || 0} members`
                    : "Active"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="glass-card"
                  style={{ padding: 8, borderRadius: 10 }}
                >
                  <CustomIcon
                    name="MoreVertical"
                    size={20}
                    color="var(--text-muted)"
                  />
                </button>
                <button
                  className="glass-card"
                  style={{ padding: 8, borderRadius: 10, cursor: "pointer" }}
                  onClick={() => setActiveConv(null)}
                  title="Close Chat"
                >
                  <CustomIcon name="X" size={20} color="var(--text-muted)" />
                </button>
              </div>
            </header>

            <div className={styles.messagesWrapper}>
              <div
                className={styles.messagesList}
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {messages.map((msg) => {
                  const isOwn = msg.senderId === user?.id;
                  const hasAttachments =
                    msg.attachments && msg.attachments.length > 0;
                  return (
                    <div
                      key={msg.id}
                      className={`${styles.messageWrapper} ${isOwn ? styles.messageOwn : styles.messageOther}`}
                    >
                      {selectedConv?.isGroup && !isOwn && msg.sender && (
                        <span className={styles.senderName}>
                          {msg.sender.fullname}
                        </span>
                      )}
                      <div
                        className={`${styles.messageBubble} ${
                          hasAttachments && !msg.body
                            ? styles.messageBubbleMedia
                            : ""
                        }`}
                      >
                        {hasAttachments &&
                          (msg.attachments!.length === 1 ? (
                            <button
                              type="button"
                              className={styles.attachmentSingle}
                              onClick={() => openLightbox(msg.attachments!, 0)}
                              title="View image"
                            >
                              <img
                                src={msg.attachments![0]}
                                alt="attachment"
                              />
                            </button>
                          ) : (
                            <div className={styles.attachmentGrid}>
                              {msg.attachments!.map((src, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className={styles.attachmentThumb}
                                  onClick={() =>
                                    openLightbox(msg.attachments!, i)
                                  }
                                  title="View image"
                                >
                                  <img src={src} alt={`attachment-${i}`} />
                                </button>
                              ))}
                            </div>
                          ))}
                        {msg.body && (
                          <span className={styles.messageText}>{msg.body}</span>
                        )}
                      </div>
                      <span className={styles.messageTime}>
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </span>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {showScrollBottom && (
                <button
                  className={styles.scrollBottomBtn}
                  onClick={scrollToBottom}
                >
                  <CustomIcon name="ChevronDown" size={20} />
                </button>
              )}
            </div>

            <div className={styles.chatInput}>
              {attachments.length > 0 && (
                <div className={styles.attachmentPreviewBar}>
                  {attachments.map((src, idx) => (
                    <div key={idx} className={styles.attachmentPreview}>
                      <img src={src} alt={`preview-${idx}`} />
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        title="Remove"
                        className={styles.attachmentRemove}
                      >
                        <CustomIcon name="X" size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {attachmentError && (
                <div className={styles.attachmentError}>{attachmentError}</div>
              )}
              <form
                onSubmit={handleSendMessage}
                className="glass-card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  gap: 12,
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  multiple
                  onChange={handleAttachmentSelect}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachments.length >= MAX_ATTACHMENTS}
                  title={
                    attachments.length >= MAX_ATTACHMENTS
                      ? `Maximum ${MAX_ATTACHMENTS} images`
                      : "Attach image"
                  }
                  className={styles.attachButton}
                >
                  <CustomIcon name="Paperclip" size={18} />
                </button>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  className="bg-gradient"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                  disabled={!newMessage.trim() && attachments.length === 0}
                >
                  <CustomIcon name="Send" size={18} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
            }}
          >
            {isCustomer ? (
              <CustomIcon
                name="Headset"
                size={48}
                style={{ marginBottom: 16, opacity: 0.2 }}
              />
            ) : (
              <CustomIcon
                name="MessageSquare"
                size={48}
                style={{ marginBottom: 16, opacity: 0.2 }}
              />
            )}
            <p>
              {isCustomer
                ? "Need help? Contact our support team."
                : "Select a conversation to start chatting"}
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button
                className="bg-gradient"
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={() => setIsUserModalOpen(true)}
              >
                {isCustomer ? (
                  <>
                    <CustomIcon name="Headset" size={16} /> Contact Support
                  </>
                ) : (
                  <>
                    <CustomIcon name="Plus" size={16} /> New Chat
                  </>
                )}
              </button>
              {isStaff && (
                <button
                  className="glass-card"
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--text-primary)",
                  }}
                  onClick={() => setIsGroupModalOpen(true)}
                >
                  <CustomIcon name="Users" size={16} /> New Group
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        isCustomer={isCustomer}
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        filteredUsers={filteredUsers}
        onStartChat={startChatWithUser}
      />

      <NewGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setGroupName("");
          setSelectedGroupMembers([]);
        }}
        groupName={groupName}
        onGroupNameChange={setGroupName}
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        filteredUsers={filteredUsers}
        selectedGroupMembers={selectedGroupMembers}
        onToggleMember={toggleGroupMember}
        onCreateGroup={createGroupChat}
      />

      {lightbox &&
        createPortal(
          <div
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 11000,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <button
              onClick={closeLightbox}
              title="Close"
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CustomIcon name="X" size={24} />
            </button>
            <img
              src={lightbox.images[lightbox.index]}
              alt="attachment"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Messages;
