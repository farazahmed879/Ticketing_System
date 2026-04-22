import React, { useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Trash2,
  MessageSquare,
  UserPlus,
  Ticket,
  ChevronRight,
  Headset,
  FileQuestion,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Notifications.module.css";
import { useNavigate } from "react-router-dom";

import type { NotificationItem } from "../../types";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`${API_ROUTES.NOTIFICATIONS.BASE}?limit=50`);
      setNotifications(res.data.items);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    socket.on("notifications:new", (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    return () => {
      socket.off("notifications:new");
    };
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(API_ROUTES.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put(API_ROUTES.NOTIFICATIONS.READ_ALL);
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?"))
      return;
    try {
      await api.delete(API_ROUTES.NOTIFICATIONS.CLEAR);
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare size={18} color="#4caf50" />;
      case "assignment":
        return <UserPlus size={18} color="#2196f3" />;
      case "ticket":
        return <Ticket size={18} color="#ff9800" />;
      case "support":
        return <Headset size={18} color="#9c27b0" />;
      case "request":
        return <FileQuestion size={18} color="#00bcd4" />;
      default:
        return <Bell size={18} color="var(--text-muted)" />;
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    handleMarkAsRead(n.id);
    if (n.data?.ticketId) {
      navigate(`/tickets/${n.data.ticketId}`);
    } else if (n.data?.roomId) {
      navigate("/messages");
    } else if (n.data?.requestId) {
      navigate("/requests");
    }
  };

  if (loading)
    return <div className="animate-fade-in">Loading notifications...</div>;

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Notifications</h1>
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} glass-card glass-card-hover`}
            onClick={handleMarkAllRead}
            disabled={!notifications.some((n) => n.unread)}
          >
            <CheckCircle2 size={16} /> Mark all read
          </button>
          <button
            className={`${styles.actionBtn} glass-card glass-card-hover`}
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            style={{ color: "var(--accent-danger)" }}
          >
            <Trash2 size={16} /> Clear all
          </button>
        </div>
      </div>

      <div className={`${styles.listContainer} glass-card`}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <Bell size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
            <p>You have no notifications at the moment.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.notificationItem} ${n.unread ? styles.unread : ""}`}
              onClick={() => handleNotificationClick(n)}
            >
              <div
                className={styles.iconContainer}
                style={{
                  background: n.unread
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                  borderColor: n.unread
                    ? "var(--accent-primary)"
                    : "var(--border-glass)",
                }}
              >
                {getIcon(n.type)}
              </div>
              <div className={styles.content}>
                <div className={styles.itemHeader}>
                  <span className={styles.title}>{n.title}</span>
                  <span className={styles.time}>
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className={styles.message}>{n.message}</p>
              </div>
              <div className={styles.itemActions}>
                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
