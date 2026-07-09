import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { socket } from "../services/socket";
import CustomIcon from "../components/CustomIcon";
import styles from "./MainLayout.module.css";
import Sidebar from "../components/Sidebar";
import ConfirmationModal from "../components/ConfirmationModal";

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [isMarkAllReadOpen, setIsMarkAllReadOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const notificationRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    if (isNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationOpen]);

  React.useEffect(() => {
    if (!user) return;

    // Request initial count and list
    socket.emit("notifications:get");

    // Listen for updates
    socket.on(
      "notifications:update",
      (data: { count?: number; items?: any[] }) => {
        if (data.items) {
          const filteredItems = data.items.filter((n: any) => n.type !== "moment");
          setNotifications(filteredItems);
          
          // Re-calculate count if possible, or fall back to backend count
          if (data.count !== undefined) {
            // Since we're hiding "moment", the backend count might be off by the number of unread moments
            // If the user has a lot of notifications, we might not have all of them in data.items
            // But we'll do our best.
            const unreadMomentsCount = data.items.filter((n: any) => n.type === "moment" && n.unread).length;
            setUnreadCount(Math.max(0, data.count - unreadMomentsCount));
          }
        } else if (data.count !== undefined) {
          setUnreadCount(data.count);
        }
      },
    );

    socket.on("notifications:new", (notification: any) => {
      if (notification.type === "moment") return;

      // When the user is on the messages page, suppress the toast popup
      // and sound for chat message notifications — the Messages component
      // handles its own unread badge + sound.
      const isOnMessagesPage = location.pathname === "/messages";
      const isChatNotification = notification.type === "message";

      if (!(isOnMessagesPage && isChatNotification)) {
        showNotification(
          "info",
          notification.title + ": " + notification.message,
        );

        // Play notification sound if enabled
        const soundEnabled = localStorage.getItem("pref_sound_alerts") !== "false";
        if (soundEnabled) {
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3",
          );
          audio.play().catch((e) => console.log("Audio play failed:", e));
        }

        // Show desktop notification if enabled and permission granted
        const desktopEnabled = localStorage.getItem("pref_desktop_alerts") !== "false";
        if (desktopEnabled && "Notification" in window && Notification.permission === "granted") {
          try {
            const n = new Notification(notification.title || "New Notification", {
              body: notification.message || "",
              icon: "/favicon.ico",
            });
            n.onclick = () => {
              window.focus();
            };
          } catch (e) {
            console.error("Error creating desktop notification:", e);
          }
        }
      }

      setNotifications((prev) => [notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.off("notifications:update");
      socket.off("notifications:new");
    };
  }, [user, showNotification, location.pathname]);

  const handleMarkAsRead = async (id: string) => {
    socket.emit("notifications:markRead", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    socket.emit("notifications:markAllRead");
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    setIsMarkAllReadOpen(false);
  };

  const getNotificationIconInfo = (type: string) => {
    switch (type) {
      case "assignment":
        return {
          iconName: "UserPlus",
          color: "#2196f3",
          bg: "rgba(33, 150, 243, 0.1)",
        };
      case "ticket_created":
        return {
          iconName: "TicketPlus",
          color: "#4caf50",
          bg: "rgba(76, 175, 80, 0.1)",
        };
      case "ticket_updated":
        return {
          iconName: "RefreshCw",
          color: "#ff9800",
          bg: "rgba(255, 152, 0, 0.1)",
        };
      case "comment":
        return {
          iconName: "MessageCircle",
          color: "#009688",
          bg: "rgba(0, 150, 136, 0.1)",
        };
      case "request":
        return {
          iconName: "FileQuestion",
          color: "#00bcd4",
          bg: "rgba(0, 188, 212, 0.1)",
        };
      case "interview":
        return {
          iconName: "CalendarCheck",
          color: "#9c27b0",
          bg: "rgba(156, 39, 176, 0.1)",
        };
      case "message":
        return {
          iconName: "MessageSquare",
          color: "#4caf50",
          bg: "rgba(76, 175, 80, 0.1)",
        };
      case "support":
        return {
          iconName: "Headset",
          color: "#7c3aed",
          bg: "rgba(124, 58, 237, 0.1)",
        };
      case "ticket":
        return {
          iconName: "Ticket",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.1)",
        };
      default:
        return {
          iconName: "Bell",
          color: "var(--text-muted)",
          bg: "rgba(255, 255, 255, 0.05)",
        };
    }
  };

  return (
    <div
      className={`${styles.layout} ${isCollapsed ? styles.layoutCollapsed : ""}`}
    >
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        unreadMessageCount={notifications.filter((n) => n.unread && n.type === "message").length}
      />

      <main className={styles.mainContent}>
        <header
          className={`${styles.topbar} ${scrolled ? styles.topbarScrolled : ""}`}
        >
          <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>
            {/* {t("topbar.overview")} */}
          </div>
          <div
            style={{ display: "flex", gap: 20, alignItems: "center" }}
            ref={notificationRef}
          >
            <div style={{ position: "relative" }}>
              <button
                className={`glass-card notification-button${unreadCount > 0 ? " has-unread" : ""}`}
                style={{
                  padding: 8,
                  borderRadius: 10,
                  position: "relative",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                title={
                  unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
                    : "Notifications"
                }
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              >
                <CustomIcon
                  name="Bell"
                  size={20}
                  color={
                    unreadCount > 0
                      ? "var(--accent-danger)"
                      : "var(--text-secondary)"
                  }
                />
                {unreadCount > 0 && (
                  <span
                    className="notification-badge"
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      minWidth: 18,
                      height: 18,
                      padding: "0 5px",
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      borderRadius: 9,
                      border: "2px solid var(--bg-main)",
                      color: "white",
                      fontSize: "0.65rem",
                      lineHeight: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      letterSpacing: 0.2,
                      boxSizing: "content-box",
                      pointerEvents: "none",
                      transformOrigin: "center",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div
                  className="animate-fade-in"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 12px)",
                    right: 0,
                    width: 350,
                    maxHeight: 500,
                    zIndex: 999,
                    padding: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                    border: "1px solid var(--border-glass)",
                    background: "var(--bg-dropdown)",
                    backdropFilter: "var(--blur-lg)",
                    borderRadius: 16,
                  }}
                >
                  <div
                    style={{
                      padding: "16px 20px",
                      borderBottom: "1px solid var(--border-glass)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>
                      {t("topbar.notifications")}
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--accent-primary)",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMarkAllReadOpen(true);
                        }}
                      >
                        {t("topbar.markAllRead")}
                      </span>
                    )}
                  </div>

                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: 40,
                          textAlign: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <CustomIcon
                          name="Bell"
                          size={32}
                          style={{ marginBottom: 12, opacity: 0.2 }}
                        />
                        <p>{t("topbar.noNotifications")}</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => {
                        const iconInfo = getNotificationIconInfo(n.type);
                        return (
                          <div
                            key={n.id}
                            style={{
                              padding: "16px 20px",
                              borderBottom: "1px solid var(--border-glass)",
                              background: n.unread
                                ? "rgba(255,255,255,0.02)"
                                : "transparent",
                              cursor: "pointer",
                              transition: "background 0.2s ease",
                              position: "relative",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "rgba(255,255,255,0.05)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = n.unread
                                ? "rgba(255,255,255,0.02)"
                                : "transparent")
                            }
                            onClick={() => {
                              handleMarkAsRead(n.id);
                              if (n.data?.ticketId) {
                                navigate(`/tickets/${n.data.ticketId}`);
                              } else if (n.type === "message" && n.data?.roomId) {
                                navigate(`/messages?roomId=${n.data.roomId}`);
                              } else if (n.type === "message") {
                                navigate("/messages");
                              } else if (n.data?.requestId) {
                                navigate(`/requests?requestId=${n.data.requestId}`);
                              }
                              setIsNotificationOpen(false);
                            }}
                          >
                            <div style={{ display: "flex", gap: 12 }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 10,
                                  background: iconInfo.bg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                              >
                                <CustomIcon
                                  name={iconInfo.iconName}
                                  size={18}
                                  color={iconInfo.color}
                                />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: "0.85rem",
                                    color: "var(--text-primary)",
                                    marginBottom: 2,
                                  }}
                                >
                                  {n.title}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-secondary)",
                                    lineHeight: 1.4,
                                    marginBottom: 4,
                                  }}
                                >
                                  {n.message}
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.65rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {formatDistanceToNow(new Date(n.createdAt), {
                                    addSuffix: true,
                                  })}
                                </div>
                              </div>
                              {n.unread && (
                                <div
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: "50%",
                                    background: "var(--accent-primary)",
                                    marginTop: 6,
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <button
                    style={{
                      padding: 14,
                      textAlign: "center",
                      color: "var(--accent-primary)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      background: "rgba(255,255,255,0.02)",
                      borderTop: "1px solid var(--border-glass)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      navigate("/notifications");
                      setIsNotificationOpen(false);
                    }}
                  >
                    {t("topbar.seeAll")}
                  </button>
                </div>
              )}
            </div>
            <button
              className="glass-card"
              style={{ padding: 8, borderRadius: 10, cursor: "pointer" }}
              onClick={() => navigate("/settings")}
            >
              <CustomIcon
                name="Settings"
                size={20}
                color="var(--text-secondary)"
              />
            </button>
          </div>
        </header>

        <div className={styles.pageContainer}>
          <Outlet />
        </div>
      </main>

      <ConfirmationModal
        isOpen={isMarkAllReadOpen}
        onClose={() => setIsMarkAllReadOpen(false)}
        onConfirm={handleMarkAllRead}
        title="Mark All as Read"
        message="Are you sure you want to mark all notifications as read?"
        confirmText="Mark All Read"
        type="info"
      />
    </div>
  );
};

export default MainLayout;
