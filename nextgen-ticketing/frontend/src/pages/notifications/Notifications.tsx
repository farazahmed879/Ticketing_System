import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Notifications.module.css";
import { useNavigate } from "react-router-dom";
import CustomButton from "../../components/CustomButton";

import type { NotificationItem } from "../../types";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const LIMIT = 15;

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`${API_ROUTES.NOTIFICATIONS.BASE}?limit=${LIMIT}&page=${page}`);
      setNotifications(res.data.items);
      setTotalCount(res.data.totalCount);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  useEffect(() => {
    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev]);
      setTotalCount((prev) => prev + 1);
    };

    socket.on("notifications:new", handleNewNotification);

    return () => {
      socket.off("notifications:new", handleNewNotification);
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
      setTotalCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <CustomIcon name="MessageSquare" size={18} color="#4caf50" />;
      case "assignment":
        return <CustomIcon name="UserPlus" size={18} color="#2196f3" />;
      case "ticket":
        return <CustomIcon name="Ticket" size={18} color="#ff9800" />;
      case "support":
        return <CustomIcon name="Headset" size={18} color="#9c27b0" />;
      case "request":
        return <CustomIcon name="FileQuestion" size={18} color="#00bcd4" />;
      default:
        return <CustomIcon name="Bell" size={18} color="var(--text-muted)" />;
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
            <CustomIcon name="CheckCircle2" size={16} /> Mark all read
          </button>
          <button
            className={`${styles.actionBtn} glass-card glass-card-hover`}
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            style={{ color: "var(--accent-danger)" }}
          >
            <CustomIcon name="Trash2" size={16} /> Clear all
          </button>
        </div>
      </div>

      <div className={`${styles.listContainer} glass-card`}>
        {notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <CustomIcon name="Bell" size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
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
                <CustomIcon name="ChevronRight" size={18} color="var(--text-muted)" />
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div
          className="glass-card"
          style={{
            marginTop: 16,
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.95rem",
              fontWeight: 500,
            }}
          >
            Showing {notifications.length} of {totalCount} notifications
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <CustomButton
              variant="secondary"
              size="sm"
              style={{ padding: 8, borderRadius: 10 }}
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              icon={<CustomIcon name="ChevronLeft" size={20} />}
            />
            <CustomButton
              variant="secondary"
              size="sm"
              style={{ padding: 8, borderRadius: 10 }}
              disabled={(page + 1) * LIMIT >= totalCount}
              onClick={() => setPage(page + 1)}
              icon={<CustomIcon name="ChevronRight" size={20} />}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
