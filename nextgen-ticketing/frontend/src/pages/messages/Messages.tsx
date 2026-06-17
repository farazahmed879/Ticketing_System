import React, { useEffect, useState, useRef } from "react";
import Lightbox from "./components/Lightbox";
import CustomIcon from "../../components/CustomIcon";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { useAuth } from "../../context/AuthContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Messages.module.css";
import NewChatModal from "./components/NewChatModal";
import NewGroupModal from "./components/NewGroupModal";
import AddGroupMembersModal from "./components/AddGroupMembersModal";
import ViewGroupMembersModal from "./components/ViewGroupMembersModal";
import { readAttachmentFiles } from "../../utils/attachments";
import type { Conversation, Message } from "../../types";
import { ChatSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import { RoleName } from "../../utils/constants";
import CustomButton from "../../components/CustomButton";

import ConversationSidebar from "./components/ConversationSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isViewMembersModalOpen, setIsViewMembersModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [unreadMessageNotifications, setUnreadMessageNotifications] = useState<any[]>([]);

  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeConvRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvRef.current = activeConv;
  }, [activeConv]);

  const handleConversationSelect = async (convId: string) => {
    setActiveConv(convId);

    // 1. Update URL
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("roomId", convId);
        next.delete("userId");
        return next;
      },
      { replace: true },
    );

    // 2. Fetch Messages
    try {
      const res = await api.get(API_ROUTES.MESSAGES.CONVERSATION_BY_ID(convId));
      setMessages(res.data.conversation.messages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }

    // 3. Clear Unread Counts locally
    setUnreadCounts((prev) => {
      if (prev[convId] > 0) {
        return { ...prev, [convId]: 0 };
      }
      return prev;
    });

    // 4. Mark notifications read on backend
    setUnreadMessageNotifications((prev) => {
      const matchingNotifs = prev.filter((n) => n.data?.roomId === convId);
      if (matchingNotifs.length > 0) {
        matchingNotifs.forEach((n) => {
          socket.emit("notifications:markRead", n.id);
        });
        return prev.filter((n) => n.data?.roomId !== convId);
      }
      return prev;
    });
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get(API_ROUTES.MESSAGES.CONVERSATIONS);
      setConversations(res.data.conversations);

      const notifRes = await api.get(API_ROUTES.NOTIFICATIONS.BASE, {
        params: { limit: 100 },
      });
      const notifItems = notifRes.data.items || [];
      const unreadMessageNotifs = notifItems.filter(
        (n: any) => n.unread && n.type === "message",
      );

      const counts: Record<string, number> = {};
      unreadMessageNotifs.forEach((n: any) => {
        const rId = n.data?.roomId;
        if (rId) {
          counts[rId] = (counts[rId] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
      setUnreadMessageNotifications(unreadMessageNotifs);

      const userIdFromParam = searchParams.get("userId");
      const roomIdFromParam = searchParams.get("roomId");
      if (roomIdFromParam) {
        handleConversationSelect(roomIdFromParam);
      } else if (userIdFromParam) {
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

    socket.on("chat:receive", (data: { roomId: string; message: Message }) => {
      if (activeConvRef.current === data.roomId) {
        setMessages((prev) => [...prev, data.message]);
      }

      if (data.message.senderId !== user?.id) {
        const audio = new Audio(
          "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
        );
        audio.play().catch((e) => console.log("Audio play failed:", e));
      }

      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === data.roomId);
        if (index === -1) {
          fetchConversations();
          return prev;
        }
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          recentMessage: data.message.body,
          updatedAt: new Date().toISOString(),
        };
        return updated.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
      });
    });

    socket.on("notifications:new", (notification: any) => {
      if (notification.type === "message") {
        const roomId = notification.data?.roomId;
        if (roomId) {
          if (activeConvRef.current === roomId) {
            socket.emit("notifications:markRead", notification.id);
          } else {
            setUnreadMessageNotifications((prev) => [...prev, notification]);
            setUnreadCounts((prev) => ({
              ...prev,
              [roomId]: (prev[roomId] || 0) + 1,
            }));
          }
        }
      }
    });

    socket.on(
      "chat:message_deleted",
      (data: { messageId: string; roomId: string }) => {
        if (data.roomId === activeConvRef.current) {
          setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
        }
      },
    );

    return () => {
      socket.off("chat:receive");
      socket.off("notifications:new");
      socket.off("chat:message_deleted");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      replyToId: replyingTo?.id,
    });
    setNewMessage("");
    setAttachments([]);
    setAttachmentError(null);
    setReplyingTo(null);
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

  const fetchUsers = async () => {
    try {
      const res = await api.get(API_ROUTES.MESSAGES.PARTNERS);
      setUsers(res.data.partners);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleOpenUserModal = () => {
    fetchUsers();
    setIsUserModalOpen(true);
  };

  const handleOpenGroupModal = () => {
    fetchUsers();
    setIsGroupModalOpen(true);
  };

  const handleOpenAddMembersModal = () => {
    fetchUsers();
    setIsAddMembersModalOpen(true);
  };

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
      handleConversationSelect(newRoom.id);
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
      handleConversationSelect(newRoom.id);
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

  const addMembersToGroup = async (memberIds: string[]) => {
    if (!activeConv || memberIds.length === 0) return;
    try {
      const res = await api.patch(
        API_ROUTES.MESSAGES.UPDATE_MEMBERS(activeConv),
        {
          addMemberIds: memberIds,
        },
      );
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv
            ? { ...c, members: res.data.conversation.members }
            : c,
        ),
      );
      setIsAddMembersModalOpen(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Could not add members to group");
    }
  };

  const handleDeleteChat = async () => {
    if (!activeConv) return;
    if (
      !window.confirm("Are you sure you want to delete this chat for yourself?")
    )
      return;

    try {
      await api.delete(API_ROUTES.MESSAGES.HIDE_CONVERSATION(activeConv));
      setConversations((prev) => prev.filter((c) => c.id !== activeConv));
      handleCloseChat();
    } catch (err) {
      console.error("Failed to delete chat", err);
    }
  };

  const handleCloseChat = () => {
    setActiveConv(null);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("roomId");
        return next;
      },
      { replace: true },
    );
  };

  const handleDeleteMessageClick = (
    messageId: string,
    createdAt: string | Date,
  ) => {
    const ageInMs = Date.now() - new Date(createdAt).getTime();
    if (ageInMs > 5 * 60 * 1000) {
      alert("You can only delete messages within 5 minutes of sending them.");
      return;
    }
    setMessageToDelete(messageId);
  };

  const confirmDeleteMessage = () => {
    if (!messageToDelete) return;
    socket.emit("chat:delete_message", {
      messageId: messageToDelete,
      roomId: activeConv,
    });
    setMessageToDelete(null);
  };

  const isCustomer =
    user?.role?.isCustomer ||
    user?.role?.name?.toLowerCase() === RoleName.CUSTOMER;

  const canManageGroup =
    user?.role?.isAdmin ||
    user?.role?.name?.toLowerCase() === RoleName.ADMIN ||
    user?.role?.isAgent ||
    user?.role?.name?.toLowerCase() === RoleName.AGENT ||
    user?.isLead;

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
      <ConversationSidebar
        conversations={conversations}
        activeConv={activeConv}
        onSelectConv={handleConversationSelect}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        unreadCounts={unreadCounts}
        canManageGroup={canManageGroup || false}
        isCustomer={isCustomer || false}
        onNewGroupClick={handleOpenGroupModal}
        onNewChatClick={handleOpenUserModal}
      />

      <div className={styles.chatArea}>
        {activeConv && selectedConv ? (
          <>
            <ChatHeader
              selectedConv={selectedConv}
              onViewMembers={() => setIsViewMembersModalOpen(true)}
              onDeleteChat={handleDeleteChat}
              onCloseChat={handleCloseChat}
            />

            <MessageList
              messages={messages}
              userId={user?.id}
              selectedConv={selectedConv}
              onReply={setReplyingTo}
              onDeleteMessage={handleDeleteMessageClick}
              openLightbox={openLightbox}
              scrollToBottom={scrollToBottom}
              showScrollBottom={showScrollBottom}
              messagesEndRef={messagesEndRef}
              messagesContainerRef={messagesContainerRef}
              handleScroll={handleScroll}
            />

            <MessageInput
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              onSendMessage={handleSendMessage}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
              attachments={attachments}
              onAttachmentsChange={handleAttachmentSelect}
              attachmentError={attachmentError}
              removeAttachment={removeAttachment}
              fileInputRef={fileInputRef}
            />
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
              background: "var(--bg-secondary)",
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
              <CustomButton
                variant="gradient"
                style={{ padding: "10px 24px" }}
                onClick={handleOpenUserModal}
                icon={
                  isCustomer ? (
                    <CustomIcon name="Headset" size={16} />
                  ) : (
                    <CustomIcon name="Plus" size={16} />
                  )
                }
              >
                {isCustomer ? "Contact Support" : "New Chat"}
              </CustomButton>
              {canManageGroup && (
                <CustomButton
                  variant="ghost"
                  style={{ padding: "10px 20px", color: "var(--text-primary)" }}
                  onClick={handleOpenGroupModal}
                  icon={<CustomIcon name="Users" size={16} />}
                >
                  New Group
                </CustomButton>
              )}
            </div>
          </div>
        )}
      </div>

      <NewChatModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        isCustomer={isCustomer || false}
        userSearch={userSearch}
        onUserSearchChange={setUserSearch}
        filteredUsers={users.filter(
          (u) =>
            u.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()),
        )}
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
        filteredUsers={users.filter(
          (u) =>
            u.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase()),
        )}
        selectedGroupMembers={selectedGroupMembers}
        onToggleMember={toggleGroupMember}
        onCreateGroup={createGroupChat}
      />

      {isAddMembersModalOpen && (
        <AddGroupMembersModal
          isOpen={isAddMembersModalOpen}
          onClose={() => setIsAddMembersModalOpen(false)}
          users={users}
          onAddMembers={addMembersToGroup}
          existingMemberIds={selectedConv?.members?.map((m: any) => m.id) || []}
        />
      )}

      {isViewMembersModalOpen && selectedConv?.isGroup && (
        <ViewGroupMembersModal
          isOpen={isViewMembersModalOpen}
          onClose={() => setIsViewMembersModalOpen(false)}
          members={selectedConv?.members || []}
          canManageGroup={canManageGroup || false}
          onAddMemberClick={handleOpenAddMembersModal}
        />
      )}

      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={closeLightbox}
        />
      )}

      <ConfirmationModal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        onConfirm={confirmDeleteMessage}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
};

export default Messages;
