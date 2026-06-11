import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Notifications.module.css";
import { useNavigate } from "react-router-dom";
import { NotificationSkeleton } from "../../components/CustomSkeleton";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";

import type { NotificationItem } from "../../types";

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isMarkAllReadOpen, setIsMarkAllReadOpen] = useState(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await api.get(
        `${API_ROUTES.NOTIFICATIONS.BASE}?limit=${itemsPerPage}&page=${page}`,
      );
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
  }, [page, itemsPerPage]);

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
    setConfirmLoading(true);
    try {
      await api.put(API_ROUTES.NOTIFICATIONS.READ_ALL);
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setConfirmLoading(false);
      setIsMarkAllReadOpen(false);
    }
  };

  const handleClearAll = async () => {
    setConfirmLoading(true);
    try {
      await api.delete(API_ROUTES.NOTIFICATIONS.CLEAR);
      setNotifications([]);
      setTotalCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    } finally {
      setConfirmLoading(false);
      setIsClearAllOpen(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "assignment":
        return <CustomIcon name="UserPlus" size={18} color="#2196f3" />;
      case "ticket_created":
        return <CustomIcon name="TicketPlus" size={18} color="#4caf50" />;
      case "ticket_updated":
        return <CustomIcon name="RefreshCw" size={18} color="#ff9800" />;
      case "comment":
        return <CustomIcon name="MessageCircle" size={18} color="#009688" />;
      case "request":
        return <CustomIcon name="FileQuestion" size={18} color="#00bcd4" />;
      case "interview":
        return <CustomIcon name="CalendarCheck" size={18} color="#9c27b0" />;
      case "message":
        return <CustomIcon name="MessageSquare" size={18} color="#4caf50" />;
      case "support":
        return <CustomIcon name="Headset" size={18} color="#7c3aed" />;
      case "ticket":
        return <CustomIcon name="Ticket" size={18} color="#f59e0b" />;
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

  if (loading) {
    return <NotificationSkeleton />;
  }

  return (
    <div className="animate-fade-in">
      <div className={styles.header}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Notifications</h1>
        <div className={styles.actions}>
          <button
            className={`${styles.actionBtn} glass-card glass-card-hover`}
            onClick={() => setIsMarkAllReadOpen(true)}
            disabled={!notifications.some((n) => n.unread)}
          >
            <CustomIcon name="CheckCircle2" size={16} /> Mark all read
          </button>
          <button
            className={`${styles.actionBtn} glass-card glass-card-hover`}
            onClick={() => setIsClearAllOpen(true)}
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
            <CustomIcon
              name="Bell"
              size={48}
              style={{ opacity: 0.1, marginBottom: 16 }}
            />
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
                <CustomIcon
                  name="ChevronRight"
                  size={18}
                  color="var(--text-muted)"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <CustomPagination
            currentPage={page}
            totalPages={Math.ceil(totalCount / itemsPerPage)}
            onPageChange={setPage}
            totalItems={totalCount}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setPage(0);
            }}
          />
        </div>
      )}

      <ConfirmationModal
        isOpen={isMarkAllReadOpen}
        onClose={() => setIsMarkAllReadOpen(false)}
        onConfirm={handleMarkAllRead}
        title="Mark All as Read"
        message="Are you sure you want to mark all notifications as read?"
        confirmText="Mark All Read"
        type="info"
        loading={confirmLoading}
      />

      <ConfirmationModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={handleClearAll}
        title="Clear All Notifications"
        message="Are you sure you want to permanently clear all notifications? This action cannot be undone."
        confirmText="Clear All"
        type="danger"
        loading={confirmLoading}
      />
    </div>
  );
};

export default Notifications;
