import React, { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  ChatSkeleton,
  MessageListSkeleton,
} from "../../components/CustomSkeleton/CustomSkeleton";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomButton from "../../components/CustomButton";

import ConversationSidebar from "./components/ConversationSidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import MessageInput from "./components/MessageInput";
import { ROLE_TYPE } from "../roles/roleConstants";

const Messages: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false);
  const [isViewMembersModalOpen, setIsViewMembersModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
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
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [, setUnreadMessageNotifications] = useState<any[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

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

    // 2. Fetch Messages (clear the previous conversation's messages so they
    // don't linger while the new ones load)
    setMessages([]);
    setMessagesLoading(true);
    try {
      const res = await api.get(API_ROUTES.MESSAGES.CONVERSATION_BY_ID(convId));
      setMessages(res.data.conversation.messages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setMessagesLoading(false);
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

  const queryClient = useQueryClient();
  // Conversations and notifications load in parallel; the page renders as
  // soon as conversations arrive and unread badges fill in when the
  // notifications query resolves.
  const { data: convData, isLoading: loading } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.MESSAGES.CONVERSATIONS);
      return res.data.conversations as Conversation[];
    },
  });

  const { data: notifData } = useQuery({
    queryKey: ["message-notifications"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.NOTIFICATIONS.BASE, {
        params: { limit: 100 },
      });
      return res.data.items as any[];
    },
  });

  useEffect(() => {
    if (convData) {
      setConversations(convData);

      const userIdFromParam = searchParams.get("userId");
      const roomIdFromParam = searchParams.get("roomId");
      if (roomIdFromParam) {
        handleConversationSelect(roomIdFromParam);
      } else if (userIdFromParam) {
        startChatWithUser(userIdFromParam);
      }
    }
  }, [convData]);

  useEffect(() => {
    if (notifData) {
      const unreadMessageNotifs = notifData.filter(
        (n: any) => n.unread && n.type === "message",
      );

      const counts: Record<string, number> = {};
      unreadMessageNotifs.forEach((n: any) => {
        const rId = n.data?.roomId;
        if (rId) {
          counts[rId] = (counts[rId] || 0) + 1;
        }
      });
      // Notifications can resolve after a conversation was already opened
      // (e.g. via ?roomId=) — never show a badge for the room being viewed.
      if (activeConvRef.current) {
        counts[activeConvRef.current] = 0;
      }
      setUnreadCounts(counts);
      setUnreadMessageNotifications(unreadMessageNotifs);
    }
  }, [notifData]);

  useEffect(() => {
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
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
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

    socket.on("chat:conversation_deleted", (data: { roomId: string }) => {
      setConversations((prev) => prev.filter((c) => c.id !== data.roomId));
      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[data.roomId];
        return next;
      });
      if (activeConvRef.current === data.roomId) {
        setActiveConv(null);
        setMessages([]);
      }
    });

    return () => {
      socket.off("chat:receive");
      socket.off("notifications:new");
      socket.off("chat:message_deleted");
      socket.off("chat:conversation_deleted");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const handleOnlineUsers = (
      onlineUsers: { userId: string; status: string }[],
    ) => {
      setOnlineUserIds(new Set(onlineUsers.map((u) => u.userId)));
    };

    socket.on("users:online", handleOnlineUsers);
    // Pull the current snapshot since the socket is already connected.
    socket.emit("users:getOnline");

    return () => {
      socket.off("users:online", handleOnlineUsers);
    };
  }, []);

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
    setUsersLoading(true);
    try {
      const res = await api.get(API_ROUTES.MESSAGES.PARTNERS);
      setUsers(res.data.partners);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setUsersLoading(false);
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

  const confirmDeleteConversation = async () => {
    if (!convToDelete) return;
    setIsDeletingConv(true);
    try {
      await api.delete(API_ROUTES.MESSAGES.DELETE_CONVERSATION(convToDelete));
      setConversations((prev) => prev.filter((c) => c.id !== convToDelete));
      if (activeConv === convToDelete) handleCloseChat();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Could not delete conversation");
    } finally {
      setIsDeletingConv(false);
      setConvToDelete(null);
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
    // The delete icon only renders within the 5-minute window; this guard
    // silently ignores any stale click rather than opening the modal.
    const ageInMs = Date.now() - new Date(createdAt).getTime();
    if (ageInMs > 5 * 60 * 1000) return;
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
    user?.role?.isCustomer || user?.role?.roleType === ROLE_TYPE.CUSTOMER;

  const canManageGroup =
    user?.role?.isAdmin ||
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.isAgent ||
    user?.role?.roleType === ROLE_TYPE.AGENT ||
    user?.isLead;

  const selectedConv = conversations.find((c) => c.id === activeConv);

  // Every image shared in the active conversation, in chronological order —
  // shown in the sidebar's "Shared Files" panel.
  const sharedFiles = messages.flatMap((m) => m.attachments || []);

  if (loading) {
    return (
      <div className={`${styles.container} animate-fade-in`}>
        {/* .container is a 320px/1fr grid — span both columns */}
        <div style={{ gridColumn: "1 / -1", minHeight: 0, height: "100%" }}>
          <ChatSkeleton />
        </div>
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
        onlineUserIds={onlineUserIds}
        canManageGroup={canManageGroup || false}
        isCustomer={isCustomer || false}
        onNewGroupClick={handleOpenGroupModal}
        onNewChatClick={handleOpenUserModal}
        sharedFiles={sharedFiles}
        onFileClick={(idx) => openLightbox(sharedFiles, idx)}
      />

      <div className={styles.chatArea}>
        {activeConv && selectedConv ? (
          <>
            <ChatHeader
              selectedConv={selectedConv}
              onlineUserIds={onlineUserIds}
              onViewMembers={() => setIsViewMembersModalOpen(true)}
              onDeleteChat={handleDeleteChat}
              onDeleteConversation={() => setConvToDelete(activeConv)}
              canDeleteConversation={
                (canManageGroup || !selectedConv.isGroup) ?? false
              }
              onCloseChat={handleCloseChat}
            />

            {messagesLoading ? (
              <MessageListSkeleton />
            ) : (
              <MessageList
                messages={messages}
                userId={user?.id}
                selectedConv={selectedConv}
                onlineUserIds={onlineUserIds}
                onReply={setReplyingTo}
                onDeleteMessage={handleDeleteMessageClick}
                openLightbox={openLightbox}
                scrollToBottom={scrollToBottom}
                showScrollBottom={showScrollBottom}
                messagesEndRef={messagesEndRef}
                messagesContainerRef={messagesContainerRef}
                handleScroll={handleScroll}
              />
            )}

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
        isLoading={usersLoading}
        isCustomer={isCustomer || false}
        onlineUserIds={onlineUserIds}
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
        isLoading={usersLoading}
        onClose={() => {
          setIsGroupModalOpen(false);
          setGroupName("");
          setSelectedGroupMembers([]);
        }}
        onlineUserIds={onlineUserIds}
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
          isLoading={usersLoading}
          onClose={() => setIsAddMembersModalOpen(false)}
          onlineUserIds={onlineUserIds}
          users={users}
          onAddMembers={addMembersToGroup}
          existingMemberIds={selectedConv?.members?.map((m: any) => m.id) || []}
        />
      )}

      {isViewMembersModalOpen && selectedConv?.isGroup && (
        <ViewGroupMembersModal
          isOpen={isViewMembersModalOpen}
          onClose={() => setIsViewMembersModalOpen(false)}
          onlineUserIds={onlineUserIds}
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

      <ConfirmationModal
        isOpen={!!convToDelete}
        onClose={() => setConvToDelete(null)}
        onConfirm={confirmDeleteConversation}
        title="Delete Conversation"
        message="This will permanently delete this conversation and all its messages for everyone. This action cannot be undone."
        confirmText="Delete Conversation"
        loading={isDeletingConv}
        type="danger"
      />
    </div>
  );
};

export default Messages;
